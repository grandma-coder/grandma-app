// lib/grandmaNotes/pregnancy.ts — the weekly "note from grandma" for Pregnancy.
//
// Pure + rule-based. Reads the logs the Pregnancy Notes page already loads and
// reuses `buildPregnancyWeekFacts` for this week and last week. Every sentence
// is a count, an average or a gentle comparison with the user's own past —
// never a grade. See docs/compliance/2026-11-02-regras-saude.md.
import { buildPregnancyWeekFacts, type PregnancyWeekInput } from '../pregnancyWeekFacts'
import { addDays, fmt1, inRange, isSafeTip, pickTop, weekWindows } from './shared'
import type { GrandmaLetter, GrandmaNoteSuggestion, NoteCandidate, NoteKey, Translate } from './types'

export interface PregnancyNoteInput {
  week: number
  sleep: PregnancyWeekInput['sleep']
  moods: PregnancyWeekInput['moods']
  water: PregnancyWeekInput['water']
  exercise: PregnancyWeekInput['exercise']
  nutrition: PregnancyWeekInput['nutrition']
  kicks: { date: string; kicks: number }[]
  /**
   * The week's `momTip` from lib/pregnancyData.ts. It's English-only, so the
   * caller passes it only when the UI language is English. Used when it passes
   * the banned/clinical word check; otherwise a curated line is used.
   */
  momTip?: string | null
  /** Weekday label for a date (YYYY-MM-DD). Default: the date itself. */
  formatDay?: (iso: string) => string
  today?: Date
}

/** Curated, non-clinical lines by week band (used when momTip isn't). */
function curatedSuggestion(week: number, t: Translate): GrandmaNoteSuggestion {
  if (week >= 34) {
    return { text: t('gn_sug_preg_bag'), actionLabel: t('gn_sug_action_checklist'), actionSticker: 'backpack', actionArea: 'birth' }
  }
  const key: NoteKey =
    week <= 8 ? 'gn_sug_preg_w1' :
    week <= 13 ? 'gn_sug_preg_w2' :
    week <= 20 ? 'gn_sug_preg_w3' :
    week <= 27 ? 'gn_sug_preg_w4' :
    'gn_sug_preg_w5'
  return { text: t(key) }
}

function avgKicks(rows: { date: string; kicks: number }[], from: string, to: string): number | null {
  const r = rows.filter((k) => inRange(k.date, from, to) && k.kicks > 0)
  return r.length ? r.reduce((a, k) => a + k.kicks, 0) / r.length : null
}

export function buildPregnancyNote(input: PregnancyNoteInput, t: Translate): GrandmaLetter {
  const today = input.today ?? new Date()
  const base = { sleep: input.sleep, moods: input.moods, water: input.water, exercise: input.exercise, nutrition: input.nutrition }
  const now = buildPregnancyWeekFacts({ ...base, days: 7, today })
  const prev = buildPregnancyWeekFacts({ ...base, days: 7, today: addDays(today, -7) })
  const w = weekWindows(today)
  const formatDay = input.formatDay ?? ((iso: string) => iso)

  const c: NoteCandidate[] = []

  // Sleep — average hours a night, compared with last week.
  if (now.sleep) {
    const hours = fmt1(now.sleep.avgHours)
    if (prev.sleep) {
      const diffMin = Math.round((now.sleep.avgHours - prev.sleep.avgHours) * 60)
      if (diffMin >= 20) {
        c.push({ id: 'sleep', area: 'sleep', sticker: 'moon', weight: 5 + diffMin / 30, title: t('gn_preg_sleep_more_title'), body: t('gn_preg_sleep_more_body', { hours, min: diffMin }) })
      } else if (diffMin <= -20) {
        c.push({ id: 'sleep', area: 'sleep', sticker: 'moon', weight: 5 + -diffMin / 30, title: t('gn_preg_sleep_less_title'), body: t('gn_preg_sleep_less_body', { hours, min: -diffMin }) })
      } else {
        c.push({ id: 'sleep', area: 'sleep', sticker: 'moon', weight: 3, title: t('gn_preg_sleep_same_title'), body: t('gn_preg_sleep_same_body', { hours }) })
      }
    } else {
      c.push({ id: 'sleep', area: 'sleep', sticker: 'moon', weight: 2.5, title: t('gn_preg_sleep_title'), body: t('gn_preg_sleep_body', { hours }) })
    }
  } else if (prev.sleep) {
    c.push({ id: 'sleep', area: 'sleep', sticker: 'moon', weight: 3.5, title: t('gn_missed_sleep_title'), body: t('gn_missed_body') })
  }

  // Kicks — average per session, against the week before.
  const kNow = avgKicks(input.kicks, w.thisFrom, w.thisTo)
  const kPrev = avgKicks(input.kicks, w.prevFrom, w.prevTo)
  if (kNow != null) {
    const n = Math.round(kNow)
    if (kPrev != null && Math.abs(kNow - kPrev) / Math.max(1, kPrev) <= 0.2) {
      c.push({ id: 'kicks', area: 'kicks', sticker: 'foot', weight: 4, title: t('gn_preg_kicks_title'), body: t('gn_preg_kicks_usual_body', { n }) })
    } else if (kPrev != null) {
      c.push({ id: 'kicks', area: 'kicks', sticker: 'foot', weight: 4.5, title: t('gn_preg_kicks_title'), body: t('gn_preg_kicks_change_body', { n, prev: Math.round(kPrev) }) })
    } else {
      c.push({ id: 'kicks', area: 'kicks', sticker: 'foot', weight: 3, title: t('gn_preg_kicks_title'), body: t('gn_preg_kicks_body', { n }) })
    }
  }

  // Water — a day that dipped well below the others, else the average.
  if (now.water) {
    const days = input.water
      .filter((r) => inRange(r.date, w.thisFrom, w.thisTo) && r.glasses > 0)
      .reduce((m, r) => m.set(r.date, Math.max(m.get(r.date) ?? 0, r.glasses)), new Map<string, number>())
    let dip: { date: string; n: number; others: number } | null = null
    if (days.size >= 3) {
      days.forEach((n, date) => {
        const rest = [...days.entries()].filter(([d]) => d !== date).map(([, v]) => v)
        const others = rest.reduce((a, b) => a + b, 0) / rest.length
        if (others >= 4 && n <= others * 0.65 && (!dip || n < dip.n)) dip = { date, n, others }
      })
    }
    const d = dip as { date: string; n: number; others: number } | null
    if (d) {
      c.push({ id: 'water', area: 'hydration', sticker: 'glass', weight: 5, title: t('gn_preg_water_dip_title', { day: formatDay(d.date) }), body: t('gn_preg_water_dip_body', { n: d.n, avg: Math.round(d.others) }) })
    } else {
      c.push({ id: 'water', area: 'hydration', sticker: 'glass', weight: 2, title: t('gn_preg_water_title'), body: t('gn_preg_water_body', { avg: fmt1(now.water.avgGlasses) }) })
    }
  } else if (prev.water) {
    c.push({ id: 'water', area: 'hydration', sticker: 'glass', weight: 3, title: t('gn_missed_water_title'), body: t('gn_missed_body') })
  }

  // Movement — minutes this week vs last.
  if (now.movement) {
    const min = now.movement.minutes
    const diff = prev.movement ? min - prev.movement.minutes : 0
    if (prev.movement && Math.abs(diff) >= 20) {
      c.push({ id: 'move', area: 'exercise', sticker: 'dumbbell', weight: 4 + Math.abs(diff) / 60, title: t('gn_preg_move_title'), body: t(diff > 0 ? 'gn_preg_move_more_body' : 'gn_preg_move_less_body', { min, diff: Math.abs(diff) }) })
    } else {
      c.push({ id: 'move', area: 'exercise', sticker: 'dumbbell', weight: 2, title: t('gn_preg_move_title'), body: t('gn_preg_move_body', { min }) })
    }
  } else if (prev.movement) {
    c.push({ id: 'move', area: 'exercise', sticker: 'dumbbell', weight: 2.5, title: t('gn_missed_move_title'), body: t('gn_missed_body') })
  }

  // Mood + nutrition — plain day counts.
  if (now.mood) {
    c.push({ id: 'mood', area: 'mood', sticker: 'face3', weight: 1.5 + now.mood.days / 7, title: t('gn_preg_mood_title'), body: t('gn_preg_mood_body', { days: now.mood.days }) })
  }
  if (now.nutrition) {
    c.push({ id: 'food', area: 'nutrition', sticker: 'avocado', weight: 1.5, title: t('gn_preg_food_title'), body: t('gn_preg_food_body', { days: now.nutrition.days }) })
  }

  // Streak — something logged every day of the week.
  if (now.daysLogged >= 7) {
    c.push({ id: 'streak', area: 'wellbeing', sticker: 'star', weight: 6, title: t('gn_streak_title'), body: t('gn_streak_body') })
  }

  const notes = pickTop(c)
  const tooLittle = now.logCount === 0 && kNow == null

  if (tooLittle) {
    // Missed-area notes alone don't make a week — keep it to one warm line.
    return {
      intro: t('gn_intro_start'),
      notes: [{ id: 'start', sticker: 'pencil', title: t('gn_empty_title'), body: t('gn_empty_body') }],
      suggestion: { text: t('gn_sug_preg_log') },
    }
  }

  const suggestion: GrandmaNoteSuggestion =
    input.week < 34 && isSafeTip(input.momTip) ? { text: input.momTip } : curatedSuggestion(input.week, t)

  return {
    intro: notes.length >= 2 ? t('gn_intro_noticed') : t('gn_intro_quiet'),
    notes,
    suggestion,
  }
}
