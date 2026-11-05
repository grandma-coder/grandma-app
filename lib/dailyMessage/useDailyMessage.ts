import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { toDateStr } from '../cycleLogic'
import { useModeStore } from '../../store/useModeStore'
import { useLanguageStore } from '../../store/useLanguageStore'
import { pickDailyQuestion } from './pickDailyQuestion'
import { matchCard } from './matcher'
import { getCardById, getQuestionsForMode } from './index'
import { localizeCard, localizeQuestion } from './localize'
import { subscribeRemoteQuestions, getRemoteQuestionsVersion } from './questions.remote'
import type { DailyCard, DailyQuestion } from './types'

export interface DailyMessageRow {
  id: string; user_id: string; date: string; mode: string
  question_id: string; option_index: number; card_id: string; created_at: string
}

// Pure: given a question + chosen option, produce the matched card. `exclude`
// holds cards she already owns so the collection doesn't fill with repeats
// (the matcher falls back to the whole bank once every card is collected).
export function resolveAnswer(question: DailyQuestion, optionIndex: number, exclude: string[] = []): DailyCard {
  const opt = question.options[optionIndex]
  return matchCard(opt?.tags ?? [], question.mode, { exclude })
}

const KEY = ['daily-message']

// The signed-in user's id from the LOCAL session (no network round-trip, so it
// resolves offline too) and kept current across sign-in / sign-out.
function useSessionUserId(): string | null {
  const [uid, setUid] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    supabase.auth.getSession()
      .then(({ data }) => { if (alive) setUid(data.session?.user.id ?? null) })
      .catch(() => {})
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUid(session?.user.id ?? null))
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])
  return uid
}

export function useDailyMessage() {
  const mode = useModeStore((s) => s.mode)
  const language = useLanguageStore((s) => s.language)
  const uid = useSessionUserId()
  // Re-pick once the command-center bank hydrates (see questions.remote.ts).
  const bankVersion = useSyncExternalStore(subscribeRemoteQuestions, getRemoteQuestionsVersion, getRemoteQuestionsVersion)
  const qc = useQueryClient()
  // The user's LOCAL calendar day — her "today" wherever she is.
  const today = toDateStr(new Date())

  // Scope today's entry to the ACTIVE MODE. A user in more than one behavior
  // (pregnancy + cycle) has an independent row per mode per day, so the cycle
  // home never surfaces a pregnancy card and vice-versa. uid + mode are in the
  // key so switching user or behavior never shows someone else's row.
  const todayKey = [...KEY, 'today', uid, today, mode]
  const collectionKey = [...KEY, 'collection', uid, mode]

  const entryQ = useQuery({
    queryKey: todayKey,
    enabled: !!uid,
    queryFn: async (): Promise<DailyMessageRow | null> => {
      const { data, error } = await supabase
        .from('daily_messages').select('*')
        .eq('user_id', uid!).eq('date', today).eq('mode', mode).limit(1)
      if (error) throw error
      return data?.[0] ?? null
    },
  })

  // The collection ("View all cards") is also per-mode — a woman's cycle deck
  // is a different keepsake set from her pregnancy deck. One row per day
  // (unique user_id,date,mode), newest first.
  const collectionQ = useQuery({
    queryKey: collectionKey,
    enabled: !!uid,
    queryFn: async (): Promise<DailyMessageRow[]> => {
      const { data, error } = await supabase
        .from('daily_messages').select('*')
        .eq('user_id', uid!).eq('mode', mode).order('date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  // Today's question, picked from the SAME (date, user) the answer is saved
  // under — so the question she reads is the question her answer is matched
  // against. Empty banks (kids / menopause) → null; this hook never throws.
  const canonicalQuestion: DailyQuestion | null = useMemo(() => {
    if (!uid || getQuestionsForMode(mode, language).length === 0) return null
    return pickDailyQuestion(today, uid, mode, language)
    // bankVersion: not read here, but the bank behind getQuestionsForMode changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, mode, language, today, bankVersion])

  const todayQuestion = useMemo(
    () => (canonicalQuestion ? localizeQuestion(canonicalQuestion, language) : null),
    [canonicalQuestion, language],
  )

  const todayCard: DailyCard | null = useMemo(() => {
    const card = entryQ.data ? getCardById(entryQ.data.card_id) : undefined
    return card ? localizeCard(card, language) : null
  }, [entryQ.data, language])

  const answerM = useMutation({
    mutationFn: async (optionIndex: number): Promise<{ card: DailyCard; row: DailyMessageRow }> => {
      if (!uid) throw new Error('Not signed in')
      if (!canonicalQuestion) throw new Error(`No daily questions available for mode "${mode}"`)
      const owned = (collectionQ.data ?? []).map((r) => r.card_id)
      const card = resolveAnswer(canonicalQuestion, optionIndex, owned)
      const { data, error } = await supabase.from('daily_messages').upsert(
        { user_id: uid, date: today, mode, question_id: canonicalQuestion.id, option_index: optionIndex, card_id: card.id },
        { onConflict: 'user_id,date,mode' },
      ).select('*').single()
      if (error) throw error
      return { card, row: data as DailyMessageRow }
    },
    onSuccess: ({ row }) => {
      // Show the answered state at once (no flash back to the question while
      // the refetch is in flight), then reconcile with the server.
      qc.setQueryData(todayKey, row)
      qc.setQueryData<DailyMessageRow[]>(collectionKey, (prev) =>
        [row, ...(prev ?? []).filter((r) => r.id !== row.id && r.date !== row.date)])
      qc.invalidateQueries({ queryKey: [...KEY, 'today', uid] })
      qc.invalidateQueries({ queryKey: [...KEY, 'collection', uid] })
    },
  })

  return {
    todayQuestion,
    todayEntry: entryQ.data ?? null,
    todayCard,
    isAnswered: !!entryQ.data,
    /** False until today's entry has been looked up (or the lookup failed). */
    isReady: !!uid && !entryQ.isPending,
    collection: collectionQ.data ?? [],
    answer: async (optionIndex: number) => localizeCard((await answerM.mutateAsync(optionIndex)).card, language),
    isSaving: answerM.isPending,
  }
}
