import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { toDateStr } from '../cycleLogic'
import { useModeStore } from '../../store/useModeStore'
import { pickDailyQuestion } from './pickDailyQuestion'
import { matchCard } from './matcher'
import { getCardById, getQuestionsForMode } from './index'
import type { DailyCard, DailyQuestion } from './types'

export interface DailyMessageRow {
  id: string; user_id: string; date: string; mode: string
  question_id: string; option_index: number; card_id: string; created_at: string
}

// Pure: given a question + chosen option, produce the matched card.
export function resolveAnswer(question: DailyQuestion, optionIndex: number, exclude: string[] = []): DailyCard {
  const opt = question.options[optionIndex]
  return matchCard(opt.tags, question.mode, { exclude })
}

const KEY = ['daily-message']

export function useDailyMessage() {
  const mode = useModeStore((s) => s.mode)
  const qc = useQueryClient()
  const today = toDateStr(new Date())

  // Scope today's entry to the ACTIVE MODE. A user in more than one behavior
  // (pregnancy + cycle) has an independent row per mode per day, so the cycle
  // home never surfaces a pregnancy card and vice-versa. `mode` is in the
  // queryKey so switching behaviors refetches the right row.
  const entryQ = useQuery({
    queryKey: [...KEY, 'today', today, mode],
    queryFn: async (): Promise<DailyMessageRow | null> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data, error } = await supabase
        .from('daily_messages').select('*')
        .eq('user_id', user.id).eq('date', today).eq('mode', mode).limit(1)
      if (error) throw error
      return data?.[0] ?? null
    },
  })

  // The collection ("View all cards") is also per-mode — a woman's cycle deck
  // is a different keepsake set from her pregnancy deck.
  const collectionQ = useQuery({
    queryKey: [...KEY, 'collection', mode],
    queryFn: async (): Promise<DailyMessageRow[]> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data, error } = await supabase
        .from('daily_messages').select('*')
        .eq('user_id', user.id).eq('mode', mode).order('date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  // Guard against unpopulated question banks (e.g. 'kids', 'pre-pregnancy' today) —
  // pickDailyQuestion throws when the mode's bank is empty, and this hook must never
  // throw at render regardless of which mode is active when a caller mounts it.
  // userId only needed for stable rotation; fall back to 'anon' before auth resolves.
  const todayQuestion: DailyQuestion | null =
    getQuestionsForMode(mode).length > 0
      ? pickDailyQuestion(today, entryQ.data?.user_id ?? 'anon', mode)
      : null

  const todayCard: DailyCard | null =
    entryQ.data ? getCardById(entryQ.data.card_id) ?? null : null

  const answerM = useMutation({
    mutationFn: async (optionIndex: number): Promise<DailyCard> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      if (getQuestionsForMode(mode).length === 0) {
        throw new Error(`No daily questions available for mode "${mode}"`)
      }
      const question = pickDailyQuestion(today, user.id, mode)
      const card = resolveAnswer(question, optionIndex)
      const { error } = await supabase.from('daily_messages').upsert(
        { user_id: user.id, date: today, mode, question_id: question.id, option_index: optionIndex, card_id: card.id },
        { onConflict: 'user_id,date,mode' },
      )
      if (error) throw error
      return card
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, 'today', today, mode] })
      qc.invalidateQueries({ queryKey: [...KEY, 'collection', mode] })
    },
  })

  return {
    todayQuestion,
    todayEntry: entryQ.data ?? null,
    todayCard,
    isAnswered: !!entryQ.data,
    collection: collectionQ.data ?? [],
    answer: (optionIndex: number) => answerM.mutateAsync(optionIndex),
    isSaving: answerM.isPending,
  }
}
