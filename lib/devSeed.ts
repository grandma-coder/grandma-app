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

function formatSupabaseError(err: unknown): string {
  if (!err) return 'Unknown error'
  if (typeof err === 'string') return err
  if (typeof err === 'object' && err !== null) {
    const anyErr = err as { message?: string; code?: string; details?: string; hint?: string }
    const parts = [anyErr.message, anyErr.details, anyErr.hint, anyErr.code].filter(Boolean)
    if (parts.length > 0) return parts.join(' · ')
    try {
      return JSON.stringify(err)
    } catch {
      return String(err)
    }
  }
  return String(err)
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

function randFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function isPastOrToday(d: Date, today: Date): boolean {
  return dateStr(d) <= dateStr(today)
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
  if (sessionError) throw new Error(`Session error: ${formatSupabaseError(sessionError)}`)
  const session = sessionData.session
  if (!session) throw new Error('Not authenticated')
  const userId = session.user.id

  // Wipe existing
  const { error: delError } = await supabase.from('cycle_logs').delete().eq('user_id', userId)
  if (delError) throw new Error(`Delete failed: ${formatSupabaseError(delError)}`)

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

  const pushIfPast = (row: { user_id: string; date: string; type: string; value: string | null; notes: string | null }, d: Date) => {
    if (isPastOrToday(d, today)) rows.push(row)
  }

  for (let c = 0; c < cycleStarts.length; c++) {
    const start = cycleStarts[c]
    const length = orderedLengths[c]
    const isLast = c === cycleStarts.length - 1

    // period_start
    pushIfPast({ user_id: userId, date: dateStr(start), type: 'period_start', value: null, notes: null }, start)

    // period_end (5 days later) — skip for the last cycle (treat as open)
    if (!isLast) {
      const endDate = addDays(start, 4)
      pushIfPast({ user_id: userId, date: dateStr(endDate), type: 'period_end', value: null, notes: null }, endDate)
    }

    // BBT entries — 1 every ~2 days across the cycle
    for (let day = 1; day <= length; day += 2) {
      const d = addDays(start, day - 1)
      pushIfPast({
        user_id: userId,
        date: dateStr(d),
        type: 'basal_temp',
        value: bbtFor(day, length),
        notes: null,
      }, d)
    }

    // Symptoms — 3-4 entries in the last 7 days of cycle (luteal/PMS)
    const pmsDays = 3 + Math.floor(Math.random() * 2)
    for (let i = 0; i < pmsDays; i++) {
      const offset = length - 6 + i
      const d = addDays(start, offset)
      const count = 1 + Math.floor(Math.random() * 2)
      const picked: string[] = []
      for (let k = 0; k < count; k++) picked.push(randFrom(SYMPTOMS))
      pushIfPast({
        user_id: userId,
        date: dateStr(d),
        type: 'symptom',
        value: [...new Set(picked)].join(', '),
        notes: null,
      }, d)
    }

    // Mood — ~5 per cycle spread out
    for (let i = 0; i < 5; i++) {
      const offset = Math.floor((length / 5) * i + Math.random() * 2)
      if (offset >= length) continue
      const d = addDays(start, offset)
      pushIfPast({
        user_id: userId,
        date: dateStr(d),
        type: 'mood',
        value: randFrom(MOODS),
        notes: null,
      }, d)
    }

    // Intercourse — 1-2 entries in the fertile window
    const ovDay = length - 14
    const fertileOffsets = [ovDay - 3, ovDay - 1, ovDay]
    const picks = 1 + Math.floor(Math.random() * 2)
    for (let i = 0; i < picks; i++) {
      const d = addDays(start, fertileOffsets[i] - 1)
      pushIfPast({
        user_id: userId,
        date: dateStr(d),
        type: 'intercourse',
        value: 'yes',
        notes: null,
      }, d)
    }

    // Ovulation — single marker at cycleLength - 14
    const ovDate = addDays(start, ovDay - 1)
    pushIfPast({
      user_id: userId,
      date: dateStr(ovDate),
      type: 'ovulation',
      value: null,
      notes: null,
    }, ovDate)
  }

  // Guarantee fresh entries dated today so the UI always reflects "current" data
  const todayStr = dateStr(today)
  const lastCycleLen = orderedLengths[orderedLengths.length - 1]
  const lastStart = cycleStarts[cycleStarts.length - 1]
  const dayInCycle = Math.max(1, Math.min(lastCycleLen, Math.round((today.getTime() - lastStart.getTime()) / 86400000) + 1))
  rows.push({ user_id: userId, date: todayStr, type: 'basal_temp', value: bbtFor(dayInCycle, lastCycleLen), notes: null })
  rows.push({ user_id: userId, date: todayStr, type: 'mood', value: randFrom(MOODS), notes: null })

  // Insert in batches of 100
  console.log('[seedCycleData] inserting', rows.length, 'rows for user', userId)
  const BATCH = 100
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const { error: insError } = await supabase.from('cycle_logs').insert(chunk)
    if (insError) {
      console.error('[seedCycleData] insert failed', insError)
      throw new Error(`Insert failed: ${formatSupabaseError(insError)}`)
    }
  }
  console.log('[seedCycleData] done, inserted', rows.length, 'rows')

  return { inserted: rows.length }
}

// ─── Kids seed ────────────────────────────────────────────────────────────

export async function seedKidsData(): Promise<{ childIds: string[]; inserted: number }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(`Session error: ${formatSupabaseError(sessionError)}`)
  const session = sessionData.session
  if (!session) throw new Error('Not authenticated')
  const userId = session.user.id

  // Fetch ALL children for this user; if none, create one demo kid.
  const { data: existingChildren, error: childQueryError } = await supabase
    .from('children')
    .select('id')
    .eq('parent_id', userId)
  if (childQueryError) throw new Error(`Child query failed: ${formatSupabaseError(childQueryError)}`)

  let childIds: string[]
  if (existingChildren && existingChildren.length > 0) {
    childIds = existingChildren.map((c: { id: string }) => c.id)
  } else {
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    const { data: newChild, error: childInsertError } = await supabase
      .from('children')
      .insert({
        parent_id: userId,
        name: 'Demo Kid',
        birth_date: dateStr(twoYearsAgo),
        sex: 'other',
      })
      .select('id')
      .single()
    if (childInsertError) throw new Error(`Child insert failed: ${formatSupabaseError(childInsertError)}`)
    childIds = [newChild.id]
  }

  // Wipe existing logs for all of these children
  const { error: delError } = await supabase.from('child_logs').delete().in('child_id', childIds)
  if (delError) throw new Error(`Delete failed: ${formatSupabaseError(delError)}`)

  // Insert 90 days of activity for EACH child (most recent day = today)
  const rows: Array<{
    user_id: string; child_id: string; date: string; type: string; value: string | null; notes: string | null
  }> = []
  const today = new Date()

  // Real solids — payload shape must match KidsLogForms food save so
  // calorie/category estimation works on the home dashboard. Each entry
  // carries estimatedCals + matchedFoods (matches what the real form writes
  // when the user picks tagged foods).
  const SOLID_FOODS = [
    { name: 'banana', cals: 89, meal: 'breakfast' },
    { name: 'oatmeal', cals: 150, meal: 'breakfast' },
    { name: 'avocado', cals: 80, meal: 'lunch' },
    { name: 'sweet potato', cals: 90, meal: 'lunch' },
    { name: 'yogurt', cals: 120, meal: 'snack' },
    { name: 'pasta', cals: 180, meal: 'dinner' },
    { name: 'rice', cals: 160, meal: 'dinner' },
    { name: 'eggs', cals: 140, meal: 'breakfast' },
    { name: 'chicken', cals: 165, meal: 'dinner' },
    { name: 'peas', cals: 70, meal: 'lunch' },
  ]
  const ACTIVITY_IDS = ['class', 'reading', 'sport', 'swim', 'dance', 'music', 'art', 'playground', 'walk', 'playdate']
  const MILESTONES = ['rolled over', 'sat up', 'first word', 'took first step', 'clapped hands', 'waved']

  // Helpers to produce shapes that match KidsLogForms exactly so the home
  // dashboard's parsers populate every card.
  const padHM = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  const randomTimeStr = () => padHM(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60))
  const sleepDurationStr = (totalHours: number) => {
    const h = Math.floor(totalHours)
    const m = Math.round((totalHours - h) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  for (const childId of childIds) {
    for (let i = 0; i < 90; i++) {
      const date = dateStr(addDays(today, -i))

      // Feeding — alternate breast/bottle, 4/day total. Shape matches the
      // bottle/breast branches of KidsLogForms.FoodForm.
      for (let f = 0; f < 4; f++) {
        const isBreast = f % 2 === 0
        const time = padHM(6 + f * 4, Math.floor(Math.random() * 60))
        if (isBreast) {
          rows.push({
            user_id: userId, child_id: childId, date, type: 'feeding',
            value: JSON.stringify({
              feedType: 'breast',
              time,
              duration: 10 + Math.floor(Math.random() * 15),
              side: randFrom(['left', 'right', 'both']),
            }),
            notes: null,
          })
        } else {
          rows.push({
            user_id: userId, child_id: childId, date, type: 'feeding',
            value: JSON.stringify({
              feedType: 'bottle',
              time,
              amount: 120 + Math.floor(Math.random() * 80),
            }),
            notes: null,
          })
        }
      }

      // Solids — 2-3/day with estimatedCals + matchedFoods so calorie ring fills
      const solidsCount = 2 + Math.floor(Math.random() * 2)
      for (let s = 0; s < solidsCount; s++) {
        const food = randFrom(SOLID_FOODS)
        rows.push({
          user_id: userId, child_id: childId, date, type: 'food',
          value: JSON.stringify({
            feedType: 'solids',
            meal: food.meal,
            quality: randFrom(['great', 'good', 'okay']),
            time: randomTimeStr(),
            estimatedCals: food.cals,
            matchedFoods: [food.name],
          }),
          notes: food.name,
        })
      }

      // Sleep — nap + bedtime. Shape must include `duration` (string with
      // leading number, e.g. "1h 30m") + `quality` so the dashboard parses it.
      const napHours = 1 + Math.random() * 1.5
      const bedHours = 9 + Math.random() * 2
      rows.push({
        user_id: userId, child_id: childId, date, type: 'sleep',
        value: JSON.stringify({
          duration: sleepDurationStr(napHours),
          quality: randFrom(['poor', 'okay', 'good']),
          startTime: '13:00',
          endTime: padHM(13 + Math.floor(napHours), Math.round((napHours % 1) * 60)),
        }),
        notes: null,
      })
      rows.push({
        user_id: userId, child_id: childId, date, type: 'sleep',
        value: JSON.stringify({
          duration: sleepDurationStr(bedHours),
          quality: randFrom(['okay', 'good', 'great']),
          startTime: '20:00',
          endTime: padHM((20 + Math.floor(bedHours)) % 24, Math.round((bedHours % 1) * 60)),
        }),
        notes: null,
      })

      // Diaper — 5/day, shape matches DiaperForm
      for (let d = 0; d < 5; d++) {
        const diaperType = randFrom(['pee', 'poop', 'mixed'])
        rows.push({
          user_id: userId, child_id: childId, date, type: 'diaper',
          value: JSON.stringify({
            diaperType,
            color: diaperType !== 'pee' ? randFrom(['yellow', 'brown', 'green']) : undefined,
            time: randomTimeStr(),
          }),
          notes: null,
        })
      }

      // Mood — every other day
      if (i % 2 === 0) {
        rows.push({
          user_id: userId, child_id: childId, date, type: 'mood',
          value: randFrom(['happy', 'calm', 'fussy']),
          notes: null,
        })
      }

      // Activity — ~every 2 days. Shape matches ActivityForm.
      if (i % 2 === 1) {
        const activityType = randFrom(ACTIVITY_IDS)
        const start = padHM(9 + Math.floor(Math.random() * 8), 0)
        rows.push({
          user_id: userId, child_id: childId, date, type: 'activity',
          value: JSON.stringify({
            activityType,
            startTime: start,
            endTime: padHM(parseInt(start.slice(0, 2)) + 1, 0),
          }),
          notes: null,
        })
      }

      // Temperature — ~1/week
      if (i % 7 === 3) {
        rows.push({
          user_id: userId, child_id: childId, date, type: 'temperature',
          value: (36.5 + Math.random() * 1.2).toFixed(1),
          notes: null,
        })
      }

      // Growth — every 14 days
      if (i % 14 === 0) {
        rows.push({
          user_id: userId, child_id: childId, date, type: 'growth',
          value: JSON.stringify({
            weight_kg: (11 + (90 - i) * 0.01 + (Math.random() - 0.5) * 0.2).toFixed(2),
            height_cm: (85 + (90 - i) * 0.02 + (Math.random() - 0.5) * 0.3).toFixed(1),
          }),
          notes: null,
        })
      }
    }

    // Vaccines — 3 historical entries
    for (const off of [80, 45, 14]) {
      rows.push({
        user_id: userId, child_id: childId, date: dateStr(addDays(today, -off)), type: 'vaccine',
        value: randFrom(['DTaP', 'MMR', 'Hib', 'Hep B', 'Polio (IPV)']),
        notes: 'Pediatrician visit',
      })
    }
    // Medicine — 2 medicines + 1 vitamin entry so the "Vitamins" health task ticks
    for (const off of [22, 5]) {
      rows.push({
        user_id: userId, child_id: childId, date: dateStr(addDays(today, -off)), type: 'medicine',
        value: randFrom(['Acetaminophen 80mg', 'Ibuprofen 50mg', 'Saline drops']),
        notes: null,
      })
    }
    rows.push({
      user_id: userId, child_id: childId, date: dateStr(addDays(today, -1)), type: 'medicine',
      value: 'Vitamin D 400IU',
      notes: null,
    })
    // Milestones — health-history modal filters type === 'milestone' (not 'note')
    for (const off of [70, 35, 10]) {
      rows.push({
        user_id: userId, child_id: childId, date: dateStr(addDays(today, -off)), type: 'milestone',
        value: randFrom(MILESTONES),
        notes: null,
      })
    }
    // Notes — doctor visits / other events
    for (const off of [60, 25]) {
      rows.push({
        user_id: userId, child_id: childId, date: dateStr(addDays(today, -off)), type: 'note',
        value: JSON.stringify({ eventType: randFrom(['Doctor visit', 'Injury', 'Other']), text: 'Routine visit, all good' }),
        notes: null,
      })
    }

    // Guarantee today has at least one of every type for this child, with
    // the SAME shapes the dashboard reads.
    const todayStr = dateStr(today)
    rows.push({
      user_id: userId, child_id: childId, date: todayStr, type: 'feeding',
      value: JSON.stringify({ feedType: 'bottle', time: '08:00', amount: 150 }),
      notes: null,
    })
    rows.push({
      user_id: userId, child_id: childId, date: todayStr, type: 'feeding',
      value: JSON.stringify({ feedType: 'breast', time: '12:00', duration: 15, side: 'left' }),
      notes: null,
    })
    {
      const food = randFrom(SOLID_FOODS)
      rows.push({
        user_id: userId, child_id: childId, date: todayStr, type: 'food',
        value: JSON.stringify({
          feedType: 'solids', meal: food.meal, quality: 'great',
          time: '12:30', estimatedCals: food.cals, matchedFoods: [food.name],
        }),
        notes: food.name,
      })
    }
    rows.push({
      user_id: userId, child_id: childId, date: todayStr, type: 'sleep',
      value: JSON.stringify({ duration: '1h 30m', quality: 'good', startTime: '13:00', endTime: '14:30' }),
      notes: null,
    })
    rows.push({
      user_id: userId, child_id: childId, date: todayStr, type: 'diaper',
      value: JSON.stringify({ diaperType: 'pee', time: '09:00' }),
      notes: null,
    })
    rows.push({
      user_id: userId, child_id: childId, date: todayStr, type: 'mood', value: 'happy', notes: null,
    })
    rows.push({
      user_id: userId, child_id: childId, date: todayStr, type: 'activity',
      value: JSON.stringify({ activityType: 'playground', startTime: '15:00', endTime: '16:00' }),
      notes: null,
    })
    rows.push({
      user_id: userId, child_id: childId, date: todayStr, type: 'temperature', value: '36.8', notes: null,
    })
  }

  const BATCH = 100
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error: insError } = await supabase.from('child_logs').insert(rows.slice(i, i + BATCH))
    if (insError) throw new Error(`Insert failed: ${formatSupabaseError(insError)}`)
  }

  return { childIds, inserted: rows.length }
}

// ─── Seed everything ──────────────────────────────────────────────────────

/**
 * Runs every seed function in sequence so all behaviors are populated through
 * today in one tap. Kids seed covers all of the user's children.
 */
export async function seedAllData(): Promise<{
  cycle: number
  pregnancy: number
  kids: number
  kidsCount: number
  exams: number
}> {
  const cycle = await seedCycleData()
  const pregnancy = await seedPregnancyData()
  const kids = await seedKidsData()
  const exams = await seedExamData()
  return {
    cycle: cycle.inserted,
    pregnancy: pregnancy.inserted,
    kids: kids.inserted,
    kidsCount: kids.childIds.length,
    exams: exams.inserted,
  }
}

// ─── Pregnancy seed ───────────────────────────────────────────────────────

export async function seedPregnancyData(): Promise<{ inserted: number }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(`Session error: ${formatSupabaseError(sessionError)}`)
  const session = sessionData.session
  if (!session) throw new Error('Not authenticated')
  const userId = session.user.id

  // Wipe existing
  const { error: delError } = await supabase.from('pregnancy_logs').delete().eq('user_id', userId)
  if (delError) throw new Error(`Delete failed: ${formatSupabaseError(delError)}`)

  const rows: Array<{ user_id: string; log_date: string; log_type: string; value: string | null; notes: string | null }> = []
  const today = new Date()
  const startWeight = 62

  // 90 days of logs across every pregnancy log type
  for (let i = 0; i < 90; i++) {
    const d = addDays(today, -i)
    const log_date = dateStr(d)

    // Weight — every 7 days, gradual gain
    if (i % 7 === 0) {
      const weeksAgo = Math.floor(i / 7)
      rows.push({
        user_id: userId, log_date, log_type: 'weight',
        value: (startWeight - weeksAgo * 0.3 + (Math.random() - 0.5) * 0.4).toFixed(1),
        notes: null,
      })
    }

    // Symptoms — every other day
    if (i % 2 === 0) {
      rows.push({
        user_id: userId, log_date, log_type: 'symptom',
        value: randFrom(['Nausea', 'Fatigue', 'Back pain', 'Heartburn', 'Swelling']),
        notes: null,
      })
    }

    // Mood — every 3rd day
    if (i % 3 === 0) {
      rows.push({
        user_id: userId, log_date, log_type: 'mood',
        value: randFrom(['great', 'good', 'okay', 'low']),
        notes: null,
      })
    }

    // Kicks — last 14 days
    if (i < 14) {
      rows.push({
        user_id: userId, log_date, log_type: 'kick_count',
        value: String(8 + Math.floor(Math.random() * 6)),
        notes: null,
      })
    }

    // Sleep — most days (skip ~20%)
    if (Math.random() > 0.2) {
      const hours = (6 + Math.random() * 3).toFixed(1)
      rows.push({
        user_id: userId, log_date, log_type: 'sleep',
        value: hours,
        notes: JSON.stringify({ quality: randFrom(['poor', 'okay', 'good', 'great']) }),
      })
    }

    // Water — daily, 4–9 glasses
    rows.push({
      user_id: userId, log_date, log_type: 'water',
      value: String(4 + Math.floor(Math.random() * 6)),
      notes: null,
    })

    // Exercise — ~3x/week
    if (i % 2 === 1) {
      rows.push({
        user_id: userId, log_date, log_type: 'exercise',
        value: String(15 + Math.floor(Math.random() * 30)),
        notes: JSON.stringify({ type: randFrom(['walking', 'yoga', 'swimming', 'stretching']) }),
      })
    }

    // Vitamins — daily
    rows.push({
      user_id: userId, log_date, log_type: 'vitamins',
      value: '1',
      notes: null,
    })

    // Kegel — every other day
    if (i % 2 === 0) {
      rows.push({
        user_id: userId, log_date, log_type: 'kegel',
        value: String(2 + Math.floor(Math.random() * 3)),
        notes: null,
      })
    }

    // Nutrition — ~4x/week
    if (i % 2 === 0) {
      const tags = ['protein', 'leafy_greens', 'whole_grains', 'fruit', 'dairy', 'iron_rich']
      const picked = [randFrom(tags), randFrom(tags)]
      rows.push({
        user_id: userId, log_date, log_type: 'nutrition',
        value: [...new Set(picked)].join(','),
        notes: null,
      })
    }

    // Contractions — sporadic in last 21 days (3rd trimester)
    if (i < 21 && i % 7 === 0) {
      rows.push({
        user_id: userId, log_date, log_type: 'contraction',
        value: String(30 + Math.floor(Math.random() * 60)),
        notes: JSON.stringify({ intervalMin: 8 + Math.floor(Math.random() * 12) }),
      })
    }
  }

  // Appointments — 4 spaced out (some past, "today" for nearest one)
  const apptOffsets = [85, 56, 28, 7]
  for (const off of apptOffsets) {
    const d = addDays(today, -off)
    rows.push({
      user_id: userId, log_date: dateStr(d), log_type: 'appointment',
      value: randFrom(['Routine prenatal', 'Anatomy scan', 'OB checkup', 'Ultrasound']),
      notes: 'Provider: Dr. Reyes',
    })
  }

  // Notes — a handful sprinkled across the timeline
  const noteOffsets = [70, 42, 21, 3]
  for (const off of noteOffsets) {
    const d = addDays(today, -off)
    rows.push({
      user_id: userId, log_date: dateStr(d), log_type: 'note',
      value: randFrom([
        'Felt baby move for the first time today',
        'Long day — needed extra rest',
        'Talked to partner about birth preferences',
        'Started reading hypnobirthing book',
      ]),
      notes: null,
    })
  }

  // Guarantee fresh entries dated today across all log types
  const todayStr = dateStr(today)
  rows.push({ user_id: userId, log_date: todayStr, log_type: 'weight', value: (startWeight + 0.2).toFixed(1), notes: null })
  rows.push({ user_id: userId, log_date: todayStr, log_type: 'symptom', value: randFrom(['Nausea', 'Fatigue', 'Back pain', 'Heartburn', 'Swelling']), notes: null })
  rows.push({ user_id: userId, log_date: todayStr, log_type: 'mood', value: randFrom(['great', 'good', 'okay', 'low']), notes: null })
  rows.push({ user_id: userId, log_date: todayStr, log_type: 'kick_count', value: String(10 + Math.floor(Math.random() * 5)), notes: null })
  rows.push({ user_id: userId, log_date: todayStr, log_type: 'sleep', value: '7.5', notes: JSON.stringify({ quality: 'good' }) })
  rows.push({ user_id: userId, log_date: todayStr, log_type: 'water', value: '7', notes: null })
  rows.push({ user_id: userId, log_date: todayStr, log_type: 'exercise', value: '25', notes: JSON.stringify({ type: 'walking' }) })
  rows.push({ user_id: userId, log_date: todayStr, log_type: 'vitamins', value: '1', notes: null })
  rows.push({ user_id: userId, log_date: todayStr, log_type: 'kegel', value: '3', notes: null })
  rows.push({ user_id: userId, log_date: todayStr, log_type: 'nutrition', value: 'protein,leafy_greens', notes: null })

  const BATCH = 100
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error: insError } = await supabase.from('pregnancy_logs').insert(rows.slice(i, i + BATCH))
    if (insError) throw new Error(`Insert failed: ${formatSupabaseError(insError)}`)
  }

  return { inserted: rows.length }
}

// ─── Repair behaviors from data ───────────────────────────────────────────

import { useBehaviorStore } from '../store/useBehaviorStore'

/**
 * Infers which behaviors the user should be enrolled in based on actual data:
 *  - children exist → kids
 *  - pregnancy_logs exist → pregnancy
 *  - cycle_logs exist → pre-pregnancy
 *
 * Adds any missing enrollments (doesn't remove existing ones). Writes to both
 * the behaviors table and the useBehaviorStore.
 *
 * Note: the behaviors table has no unique constraint on (user_id, type), so we
 * check for an existing row before inserting to avoid duplicates.
 */
export async function repairBehaviorsFromData(): Promise<{ enrolled: string[] }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(`Session error: ${formatSupabaseError(sessionError)}`)
  const session = sessionData.session
  if (!session) throw new Error('Not authenticated')
  const userId = session.user.id

  const inferred: Array<'pre-pregnancy' | 'pregnancy' | 'kids'> = []

  // Kids — does the user own any children row?
  const { count: kidsCount, error: kidsErr } = await supabase
    .from('children')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', userId)
  if (kidsErr) throw new Error(`children query failed: ${formatSupabaseError(kidsErr)}`)
  if ((kidsCount ?? 0) > 0) inferred.push('kids')

  // Pregnancy
  const { count: pregCount, error: pregErr } = await supabase
    .from('pregnancy_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (pregErr) throw new Error(`pregnancy_logs query failed: ${formatSupabaseError(pregErr)}`)
  if ((pregCount ?? 0) > 0) inferred.push('pregnancy')

  // Pre-pregnancy
  const { count: cycleCount, error: cycleErr } = await supabase
    .from('cycle_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (cycleErr) throw new Error(`cycle_logs query failed: ${formatSupabaseError(cycleErr)}`)
  if ((cycleCount ?? 0) > 0) inferred.push('pre-pregnancy')

  if (inferred.length === 0) return { enrolled: [] }

  // Map store names → DB type values
  const DB_MAP: Record<'pre-pregnancy' | 'pregnancy' | 'kids', string> = {
    'pre-pregnancy': 'cycle',
    'pregnancy': 'pregnancy',
    'kids': 'kids',
  }

  // Fetch existing behavior rows to avoid duplicate inserts (no unique constraint on user_id,type)
  const { data: existingRows } = await supabase
    .from('behaviors')
    .select('type')
    .eq('user_id', userId)
  const existingTypes = new Set((existingRows ?? []).map((r: { type: string }) => r.type))

  for (const b of inferred) {
    const dbType = DB_MAP[b]
    if (existingTypes.has(dbType)) continue
    const { error: insErr } = await supabase
      .from('behaviors')
      .insert({ user_id: userId, type: dbType, active: true })
    // Don't fail the whole repair if one row fails.
    if (insErr) console.warn('[repairBehaviors] insert failed', dbType, insErr)
  }

  // Update local store — enroll every inferred behavior that isn't already enrolled.
  const store = useBehaviorStore.getState()
  for (const b of inferred) {
    if (!store.enrolledBehaviors.includes(b)) {
      store.enroll(b)
    }
  }

  return { enrolled: inferred }
}

// ─── Exams seed ───────────────────────────────────────────────────────────

interface ExamSeed {
  behavior: 'pre-pregnancy' | 'pregnancy' | 'kids'
  title: string
  result: string
  notes: string | null
  provider: string
  daysAgo: number
  flagged: string[]
  referenceRange: string | null
}

const PRE_PREG_EXAMS: ExamSeed[] = [
  {
    behavior: 'pre-pregnancy',
    title: 'AMH (anti-Müllerian hormone)',
    result: '2.4 ng/mL — within normal range for age 32.',
    notes: 'Ovarian reserve looks healthy. Repeat in 12 months.',
    provider: 'Stork Fertility Clinic',
    daysAgo: 412,
    flagged: [],
    referenceRange: '1.0–4.0 ng/mL',
  },
  {
    behavior: 'pre-pregnancy',
    title: 'Thyroid panel (TSH, T3, T4)',
    result: 'TSH 3.8 mIU/L — slightly elevated, retest in 6 weeks.',
    notes: null,
    provider: 'Dr. Patel — Endocrinology',
    daysAgo: 380,
    flagged: ['TSH 3.8 mIU/L (target <2.5 for conception)'],
    referenceRange: 'TSH 0.4–2.5 mIU/L (preconception)',
  },
  {
    behavior: 'pre-pregnancy',
    title: 'Comprehensive metabolic panel',
    result: 'All values within normal limits.',
    notes: 'Glucose 88, kidney + liver markers normal.',
    provider: 'LabCorp',
    daysAgo: 360,
    flagged: [],
    referenceRange: null,
  },
]

const PREG_EXAMS: ExamSeed[] = [
  {
    behavior: 'pregnancy',
    title: 'NIPT (non-invasive prenatal test)',
    result: 'Low risk for trisomy 13, 18, 21. Predicted sex: female.',
    notes: 'Drawn at 11w3d.',
    provider: 'Natera',
    daysAgo: 95,
    flagged: [],
    referenceRange: null,
  },
  {
    behavior: 'pregnancy',
    title: '12-week dating ultrasound',
    result: 'CRL 56mm — consistent with 12w1d. NT 1.6mm.',
    notes: 'All anatomy markers visible. Strong heartbeat 162bpm.',
    provider: 'St. Mary Maternal Imaging',
    daysAgo: 92,
    flagged: [],
    referenceRange: 'NT < 3.0mm',
  },
  {
    behavior: 'pregnancy',
    title: '20-week anatomy scan',
    result: 'No structural anomalies detected. Placenta posterior, fundal.',
    notes: 'Cervix 38mm. AFI normal.',
    provider: 'St. Mary Maternal Imaging',
    daysAgo: 38,
    flagged: [],
    referenceRange: null,
  },
  {
    behavior: 'pregnancy',
    title: 'Glucose tolerance test (1-hour)',
    result: '142 mg/dL — above 1-hour threshold, 3-hour follow-up scheduled.',
    notes: 'Fasting since 8pm. Drank 50g glucose.',
    provider: 'Dr. Reyes — OB',
    daysAgo: 14,
    flagged: ['1-hr glucose 142 mg/dL (cutoff 140)'],
    referenceRange: '< 140 mg/dL at 1 hour',
  },
  {
    behavior: 'pregnancy',
    title: 'CBC + iron panel',
    result: 'Hemoglobin 10.8 g/dL — mild iron-deficiency anemia.',
    notes: 'Started iron supplement 65mg/day.',
    provider: 'LabCorp',
    daysAgo: 9,
    flagged: ['Hemoglobin 10.8 g/dL (target ≥11.0 in T2)'],
    referenceRange: 'Hgb ≥ 11.0 g/dL (pregnancy T2)',
  },
]

const KIDS_EXAMS: ExamSeed[] = [
  {
    behavior: 'kids',
    title: '12-month well-child visit',
    result: 'Growth 60th %ile weight, 70th %ile height. Development on track.',
    notes: 'Walking, 4 words, social smile.',
    provider: 'Dr. Lima — Pediatrics',
    daysAgo: 240,
    flagged: [],
    referenceRange: null,
  },
  {
    behavior: 'kids',
    title: 'Lead screening',
    result: '< 1 µg/dL — undetectable.',
    notes: null,
    provider: 'Quest Diagnostics',
    daysAgo: 230,
    flagged: [],
    referenceRange: '< 3.5 µg/dL',
  },
  {
    behavior: 'kids',
    title: 'Hearing screen (OAE)',
    result: 'Pass — both ears.',
    notes: null,
    provider: 'Audi-Care Pediatric',
    daysAgo: 200,
    flagged: [],
    referenceRange: null,
  },
  {
    behavior: 'kids',
    title: 'Vitamin D (25-OH)',
    result: '22 ng/mL — insufficient.',
    notes: 'Recommended 600 IU/day supplement.',
    provider: 'LabCorp',
    daysAgo: 120,
    flagged: ['25-OH Vit D 22 ng/mL (target ≥30)'],
    referenceRange: '30–100 ng/mL',
  },
  {
    behavior: 'kids',
    title: 'Allergy panel — common foods',
    result: 'IgE elevated for peanut (Class 3).',
    notes: 'Avoid peanut. Allergist follow-up scheduled.',
    provider: 'Dr. Cohen — Allergy & Immunology',
    daysAgo: 60,
    flagged: ['Peanut sIgE 17.4 kU/L (Class 3)'],
    referenceRange: '< 0.35 kU/L = negative',
  },
  {
    behavior: 'kids',
    title: 'CBC — routine',
    result: 'All values normal.',
    notes: null,
    provider: 'Dr. Lima — Pediatrics',
    daysAgo: 30,
    flagged: [],
    referenceRange: null,
  },
]

/**
 * Seeds a realistic mix of exams across all three behaviors. Wipes existing
 * exams for the user first. Distributes kids exams round-robin across the
 * user's children (skipping kids exams if no children exist).
 */
export async function seedExamData(): Promise<{ inserted: number }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(`Session error: ${formatSupabaseError(sessionError)}`)
  const session = sessionData.session
  if (!session) throw new Error('Not authenticated')
  const userId = session.user.id

  // Wipe existing exams for this user
  const { error: delError } = await supabase.from('exams').delete().eq('user_id', userId)
  if (delError) throw new Error(`Delete failed: ${formatSupabaseError(delError)}`)

  // Resolve children for kids-behavior exams
  const { data: kids, error: kidErr } = await supabase
    .from('children')
    .select('id')
    .eq('parent_id', userId)
  if (kidErr) throw new Error(`children query failed: ${formatSupabaseError(kidErr)}`)
  const childIds = (kids ?? []).map((k: { id: string }) => k.id)

  const today = new Date()
  const toRow = (e: ExamSeed, childId: string | null) => ({
    user_id: userId,
    child_id: childId,
    behavior: e.behavior,
    title: e.title,
    result: e.result,
    notes: e.notes,
    exam_date: dateStr(addDays(today, -e.daysAgo)),
    photos: [] as string[],
    provider: e.provider,
    extracted: {
      title: e.title,
      result: e.result,
      examDate: dateStr(addDays(today, -e.daysAgo)),
      provider: e.provider,
      referenceRange: e.referenceRange,
      flagged: e.flagged,
      notes: e.notes,
    },
  })

  const rows: Array<ReturnType<typeof toRow>> = []

  for (const e of PRE_PREG_EXAMS) rows.push(toRow(e, null))
  for (const e of PREG_EXAMS) rows.push(toRow(e, null))

  // Distribute kids exams round-robin across children (if any exist)
  if (childIds.length > 0) {
    KIDS_EXAMS.forEach((e, i) => rows.push(toRow(e, childIds[i % childIds.length])))
  }

  if (rows.length === 0) return { inserted: 0 }

  const BATCH = 50
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error: insError } = await supabase.from('exams').insert(rows.slice(i, i + BATCH))
    if (insError) throw new Error(`Insert failed: ${formatSupabaseError(insError)}`)
  }

  return { inserted: rows.length }
}

// ─── Backfill caregiver links ─────────────────────────────────────────────

/**
 * For each child where `parent_id = current user` but no `child_caregivers`
 * row links the parent to the child, insert the missing 'parent' caregiver
 * row. Fixes legacy accounts whose kids were created before onboarding
 * started writing to `child_caregivers`. The boot path's children-fallback
 * query masks this issue but care-circle / permission checks stay broken
 * until the rows exist.
 */
export async function backfillCaregiverLinks(): Promise<{
  scanned: number
  inserted: number
  alreadyOk: number
}> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(`Session error: ${formatSupabaseError(sessionError)}`)
  const session = sessionData.session
  if (!session) throw new Error('Not authenticated')
  const userId = session.user.id
  const userEmail = session.user.email ?? ''

  // 1. Find every child where I'm the parent.
  const { data: myChildren, error: childrenErr } = await supabase
    .from('children')
    .select('id, name')
    .eq('parent_id', userId)
  if (childrenErr) throw new Error(`children query failed: ${formatSupabaseError(childrenErr)}`)
  const scanned = myChildren?.length ?? 0
  if (scanned === 0) return { scanned: 0, inserted: 0, alreadyOk: 0 }

  // 2. Find every existing row for these children that could conflict.
  // The unique constraint is (child_id, email) — NOT (child_id, user_id) —
  // so a legacy invite row for the parent's own email already occupies
  // the slot we need. Find all rows matching either my user_id OR my
  // email so we can decide between UPDATE and INSERT.
  const childIds = myChildren!.map((c) => c.id)
  const { data: existing, error: existingErr } = await supabase
    .from('child_caregivers')
    .select('id, child_id, user_id, email, role, status')
    .in('child_id', childIds)
    .or(`user_id.eq.${userId},email.eq.${userEmail}`)
  if (existingErr) throw new Error(`child_caregivers query failed: ${formatSupabaseError(existingErr)}`)

  const rowsToUpdate: string[] = []
  const properlyLinkedIds = new Set<string>()
  const occupiedByEmail = new Map<string, string>() // child_id -> row.id

  for (const row of existing ?? []) {
    const isProperParent = row.user_id === userId && row.role === 'parent' && row.status === 'accepted'
    if (isProperParent) {
      properlyLinkedIds.add(row.child_id)
    } else if (row.email === userEmail) {
      // Either a pending invite for my own email, or a wrong-role row.
      // Promote it instead of inserting a duplicate.
      occupiedByEmail.set(row.child_id, row.id)
      rowsToUpdate.push(row.id)
    }
  }

  // 3a. UPDATE orphan rows to proper parent links.
  let promoted = 0
  if (rowsToUpdate.length > 0) {
    const { error: updErr } = await supabase
      .from('child_caregivers')
      .update({
        user_id: userId,
        role: 'parent',
        status: 'accepted',
        permissions: { view: true, log_activity: true, chat: true, edit_child: true, emergency: true },
        invited_by: userId,
        accepted_at: new Date().toISOString(),
      })
      .in('id', rowsToUpdate)
    if (updErr) throw new Error(`Update failed: ${formatSupabaseError(updErr)}`)
    promoted = rowsToUpdate.length
    for (const childId of occupiedByEmail.keys()) properlyLinkedIds.add(childId)
  }

  // 3b. INSERT links for children with no row at all.
  const missing = myChildren!.filter((c) => !properlyLinkedIds.has(c.id))
  let inserted = 0
  if (missing.length > 0) {
    const rows = missing.map((c) => ({
      child_id: c.id,
      user_id: userId,
      email: userEmail,
      role: 'parent' as const,
      status: 'accepted' as const,
      permissions: { view: true, log_activity: true, chat: true, edit_child: true, emergency: true },
      invited_by: userId,
      accepted_at: new Date().toISOString(),
    }))
    const { error: insErr } = await supabase.from('child_caregivers').insert(rows)
    if (insErr) throw new Error(`Insert failed: ${formatSupabaseError(insErr)}`)
    inserted = missing.length
  }

  return {
    scanned,
    inserted: inserted + promoted,
    alreadyOk: scanned - inserted - promoted,
  }
}

// ─── Wipe all dev data ────────────────────────────────────────────────────

export async function wipeAllDemoData(): Promise<void> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(`Session error: ${formatSupabaseError(sessionError)}`)
  const session = sessionData.session
  if (!session) throw new Error('Not authenticated')
  const userId = session.user.id

  // cycle_logs
  const { error: cErr } = await supabase.from('cycle_logs').delete().eq('user_id', userId)
  if (cErr) throw new Error(`cycle_logs delete failed: ${formatSupabaseError(cErr)}`)

  // pregnancy_logs
  const { error: pErr } = await supabase.from('pregnancy_logs').delete().eq('user_id', userId)
  if (pErr) throw new Error(`pregnancy_logs delete failed: ${formatSupabaseError(pErr)}`)

  // exams
  const { error: exErr } = await supabase.from('exams').delete().eq('user_id', userId)
  if (exErr) throw new Error(`exams delete failed: ${formatSupabaseError(exErr)}`)

  // child_logs (per-child cascade via children delete)
  const { data: kids, error: kidErr } = await supabase.from('children').select('id').eq('parent_id', userId)
  if (kidErr) throw new Error(`children query failed: ${formatSupabaseError(kidErr)}`)
  for (const kid of kids ?? []) {
    const { error: clErr } = await supabase.from('child_logs').delete().eq('child_id', kid.id)
    if (clErr) throw new Error(`child_logs delete failed: ${formatSupabaseError(clErr)}`)
  }
}
