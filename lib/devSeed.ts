/**
 * Dev-only seed data for the pre-pregnancy cycle tracking screens.
 * Wipes the current user's cycle_logs and inserts ~6 cycles of realistic data.
 *
 * Gated by __DEV__ at the UI call site; this module has no runtime gate itself
 * so tests/scripts can call it directly.
 */

import { supabase } from './supabase'

const SYMPTOMS = [
  'Cramps', 'Headache', 'Bloating', 'Fatigue', 'Nausea',
  'Back pain', 'Breast tenderness', 'Acne', 'Insomnia', 'Cravings',
]
const MOODS = ['great', 'good', 'okay', 'low', 'energetic'] as const

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

function randFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function bbtFor(cycleDay: number, cycleLength: number): string {
  const ovulation = cycleLength - 14
  const base = 36.4
  const postOvBump = cycleDay > ovulation ? 0.35 : 0
  const noise = (Math.random() - 0.5) * 0.15
  return (base + postOvBump + noise).toFixed(2)
}

export async function seedCycleData(): Promise<{ inserted: number }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  const session = sessionData.session
  if (!session) throw new Error('Not authenticated')
  const userId = session.user.id

  // Wipe existing
  const { error: delError } = await supabase.from('cycle_logs').delete().eq('user_id', userId)
  if (delError) throw delError

  const rows: Array<{ user_id: string; date: string; type: string; value: string | null; notes: string | null }> = []
  const today = new Date()

  // 6 cycles — start the most recent one ~10 days ago, walk backwards
  // cycle lengths jitter 27-29 days
  const cycleLengths = [28, 29, 28, 30, 27, 28] // index 0 = most recent
  const mostRecentStart = addDays(today, -10)

  // Build cycle start dates
  const cycleStarts: Date[] = []
  let cursor = new Date(mostRecentStart)
  for (let i = 0; i < cycleLengths.length; i++) {
    cycleStarts.push(new Date(cursor))
    cursor = addDays(cursor, -cycleLengths[i])
  }
  // cycleStarts[0] = most recent, [5] = oldest. Reverse for chronological.
  cycleStarts.reverse()
  const orderedLengths = [...cycleLengths].reverse()

  for (let c = 0; c < cycleStarts.length; c++) {
    const start = cycleStarts[c]
    const length = orderedLengths[c]
    const isLast = c === cycleStarts.length - 1

    // period_start
    rows.push({ user_id: userId, date: dateStr(start), type: 'period_start', value: null, notes: null })

    // period_end (5 days later) — skip for the last cycle (treat as open)
    if (!isLast) {
      rows.push({ user_id: userId, date: dateStr(addDays(start, 4)), type: 'period_end', value: null, notes: null })
    }

    // BBT entries — 1 every ~2 days across the cycle
    for (let day = 1; day <= length; day += 2) {
      rows.push({
        user_id: userId,
        date: dateStr(addDays(start, day - 1)),
        type: 'basal_temp',
        value: bbtFor(day, length),
        notes: null,
      })
    }

    // Symptoms — 3-4 entries in the last 7 days of cycle (luteal/PMS)
    const pmsDays = 3 + Math.floor(Math.random() * 2)
    for (let i = 0; i < pmsDays; i++) {
      const offset = length - 6 + i
      const count = 1 + Math.floor(Math.random() * 2)
      const picked: string[] = []
      for (let k = 0; k < count; k++) picked.push(randFrom(SYMPTOMS))
      rows.push({
        user_id: userId,
        date: dateStr(addDays(start, offset)),
        type: 'symptom',
        value: [...new Set(picked)].join(', '),
        notes: null,
      })
    }

    // Mood — ~5 per cycle spread out
    for (let i = 0; i < 5; i++) {
      const offset = Math.floor((length / 5) * i + Math.random() * 2)
      if (offset >= length) continue
      rows.push({
        user_id: userId,
        date: dateStr(addDays(start, offset)),
        type: 'mood',
        value: randFrom(MOODS),
        notes: null,
      })
    }

    // Intercourse — 1-2 entries in the fertile window
    const ovDay = length - 14
    const fertileOffsets = [ovDay - 3, ovDay - 1, ovDay]
    const picks = 1 + Math.floor(Math.random() * 2)
    for (let i = 0; i < picks; i++) {
      rows.push({
        user_id: userId,
        date: dateStr(addDays(start, fertileOffsets[i] - 1)),
        type: 'intercourse',
        value: 'yes',
        notes: null,
      })
    }
  }

  // Insert in batches of 100
  const BATCH = 100
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const { error: insError } = await supabase.from('cycle_logs').insert(chunk)
    if (insError) throw insError
  }

  return { inserted: rows.length }
}
