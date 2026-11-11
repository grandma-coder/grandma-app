// lib/grandmaNotes/cycle.ts — the weekly "note from grandma" for the Cycle journey.
//
// Pure + rule-based. Reads what the Cycle Notes page already loads (cycle
// history, cycle info for today, symptom/mood/BBT stats). Cycle estimates are
// framed as estimates — never as "safe days" or contraception.
import type { CyclePhase } from '../cycleLogic'
import type { CycleHistory, MoodStats, PMSStats, BBTStats } from '../cycleAnalytics'
import { inRange, pickTop, weekWindows } from './shared'
import type { GrandmaLetter, NoteCandidate, NoteKey, Translate } from './types'

export interface CycleNoteInput {
  history: CycleHistory | null | undefined
  /** From getCycleInfo(config, today) — only meaningful when history has a period. */
  info: { cycleDay: number; phase: CyclePhase; daysUntilPeriod: number } | null
  pms?: PMSStats | null
  mood?: MoodStats | null
  bbt?: BBTStats | null
  today?: Date
}

const PHASE_SUGGESTION: Record<CyclePhase, NoteKey> = {
  menstruation: 'gn_sug_cycle_menstruation',
  follicular: 'gn_sug_cycle_follicular',
  ovulation: 'gn_sug_cycle_ovulation',
  luteal: 'gn_sug_cycle_luteal',
}

export function buildCycleNote(input: CycleNoteInput, t: Translate): GrandmaLetter {
  const today = input.today ?? new Date()
  const cycles = input.history?.cycles ?? []
  const closed = cycles.filter((cy) => cy.lengthDays != null).map((cy) => cy.lengthDays as number)
  const avg = input.history?.avg ?? null

  if (cycles.length === 0 || !input.info) {
    return {
      intro: t('gn_intro_start'),
      notes: [{ id: 'start', sticker: 'cal', title: t('gn_empty_title'), body: t('gn_cycle_empty_body') }],
      suggestion: { text: t('gn_sug_cycle_log') },
    }
  }

  const info = input.info
  // Whole phrases per language ("Fase lútea", "na fase lútea", "durante a menstruação") — dropping
  // the bare phase word into a sentence read "na fase Lútea" / "na fase Menstruação".
  const phase = t(`gn_phaseCap_${info.phase}` as NoteKey)
  const c: NoteCandidate[] = []

  // Where you are today — always useful, rarely the most informative.
  c.push({
    id: 'today', area: 'fertile', sticker: 'flower', weight: 4.5,
    title: t('gn_cycle_day_title', { day: info.cycleDay }),
    body: info.daysUntilPeriod <= 1
      ? t('gn_cycle_day_soon_body', { phase })
      : t('gn_cycle_day_body', { phase, days: info.daysUntilPeriod }),
  })

  // Length range over recent closed cycles.
  const recent = closed.slice(-6)
  if (recent.length >= 2) {
    const min = Math.min(...recent)
    const max = Math.max(...recent)
    c.push({
      id: 'range', area: 'cycleLength', sticker: 'cal', weight: 4 + (max - min <= 3 ? 1 : 0),
      title: t('gn_cycle_range_title'),
      body: min === max
        ? t('gn_cycle_same_body', { min, n: recent.length })
        : t('gn_cycle_range_body', { min, max, n: recent.length }),
    })
  }

  // Last closed cycle against the average — the biggest change.
  const last = closed[closed.length - 1]
  if (last != null && avg != null && closed.length >= 3) {
    const diff = last - avg
    if (Math.abs(diff) >= 3) {
      c.push({
        id: 'last', area: 'regularity', sticker: 'bars', weight: 5 + Math.abs(diff) / 3,
        title: t(diff > 0 ? 'gn_cycle_last_longer_title' : 'gn_cycle_last_shorter_title'),
        body: t('gn_cycle_last_body', { len: last, avg }),
      })
    }
  }

  // Symptoms — how many, and which phase they cluster in.
  const symCount = input.pms?.topSymptoms?.reduce((a, s) => a + s.count, 0) ?? 0
  const symPhase = input.pms?.overallDominantPhase
  if (symCount >= 3 && symPhase) {
    c.push({
      id: 'symptoms', area: 'pms', sticker: 'headache', weight: 3.5,
      title: t('gn_cycle_sym_title'),
      body: t('gn_cycle_sym_body', { count: symCount, phase: t(`gn_phaseIn_${symPhase}` as NoteKey) }),
    })
  }

  // Mood check-ins this week.
  const w = weekWindows(today)
  const moodsThisWeek = (input.mood?.recent ?? []).filter((m) => inRange(m.date, w.thisFrom, w.thisTo)).length
  if (moodsThisWeek >= 2) {
    c.push({ id: 'mood', area: 'mood', sticker: 'face3', weight: 2.5, title: t('gn_cycle_mood_title'), body: t('gn_cycle_mood_body', { count: moodsThisWeek }) })
  }

  // Basal temperature readings this week.
  const bbtThisWeek = (input.bbt?.series ?? []).filter((b) => inRange(b.date, w.thisFrom, w.thisTo)).length
  if (bbtThisWeek >= 3) {
    c.push({ id: 'bbt', area: 'bbt', sticker: 'thermo', weight: 2.5, title: t('gn_cycle_bbt_title'), body: t('gn_cycle_bbt_body', { count: bbtThisWeek }) })
  }

  const notes = pickTop(c)
  return {
    intro: closed.length === 0 ? t('gn_intro_quiet') : t('gn_intro_noticed'),
    notes,
    suggestion: { text: t(PHASE_SUGGESTION[info.phase]) },
  }
}
