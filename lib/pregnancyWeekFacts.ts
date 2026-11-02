// lib/pregnancyWeekFacts.ts — pure "this week" counts for the Pregnancy light UI
//
// Replaces the composite Wellbeing % (and its Thriving … Needs care bands) in
// the light (non-Diffuse) Pregnancy analytics with plain counts and averages
// from the user's own logs. A composite health score with grade bands reads
// as a risk score to regulators (MHRA) and app stores — see
// docs/compliance/2026-11-02-regras-saude.md. Mirrors the Kids neutral mode
// (lib/kidsInsightHighlights.ts).
//
// Must stay pure — no React Native / supabase / store imports — so it can be
// unit-tested directly.

export interface PregnancyWeekInput {
  sleep: { date: string; hours: number }[]
  moods: { log_date: string; value: string | null }[]
  water: { date: string; glasses: number }[]
  exercise: { date: string; minutes: number }[]
  nutrition: {
    dates: string[]; iron: boolean[]; folic: boolean[]; protein: boolean[]; calcium: boolean[]
  } | null | undefined
  /** Window length in days, ending today. Default 7. */
  days?: number
  /** Injected for tests. Default `new Date()`. */
  today?: Date
}

export interface PregnancyWeekFacts {
  /** Window length in days (the "of N days" denominator). */
  days: number
  /** Total entries across the five areas (nutrition counts tagged days). */
  logCount: number
  /** Distinct days with at least one log in any area. */
  daysLogged: number
  /** How many of the five areas have at least one log. */
  areasLogged: number
  sleep: { nights: number; avgHours: number } | null
  mood: { count: number; days: number; topMood: string } | null
  water: { days: number; avgGlasses: number } | null
  movement: { days: number; minutes: number } | null
  nutrition: { days: number } | null
}

export type PregnancyWeekArea = 'sleep' | 'mood' | 'nutrition' | 'movement' | 'water'

export const PREGNANCY_WEEK_AREAS: PregnancyWeekArea[] = ['sleep', 'mood', 'nutrition', 'movement', 'water']

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Largest value per date — logs for one day can be re-saved (latest total wins). */
function maxPerDate<T>(rows: T[], date: (r: T) => string, value: (r: T) => number): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rows) {
    const v = value(r)
    if (!Number.isFinite(v) || v <= 0) continue
    const d = date(r)
    m.set(d, Math.max(m.get(d) ?? 0, v))
  }
  return m
}

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

export function buildPregnancyWeekFacts(input: PregnancyWeekInput): PregnancyWeekFacts {
  const days = Math.max(1, Math.round(input.days ?? 7))
  const today = input.today ?? new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1))
  const from = dateStr(start)
  const to = dateStr(today)
  const inWindow = (d: string | null | undefined) => !!d && d >= from && d <= to

  const allDates = new Set<string>()

  // Sleep — nights with hours logged, average hours per logged night.
  const sleepRows = input.sleep.filter((s) => inWindow(s.date) && s.hours > 0)
  const sleepByDate = maxPerDate(sleepRows, (s) => s.date, (s) => s.hours)
  sleepByDate.forEach((_, d) => allDates.add(d))
  const sleep = sleepByDate.size > 0
    ? { nights: sleepByDate.size, avgHours: avg([...sleepByDate.values()]) }
    : null

  // Mood — every entry counts; the most-logged mood (ties → first logged).
  const moodRows = input.moods.filter((m) => inWindow(m.log_date) && !!m.value)
  const moodCounts = new Map<string, number>()
  const moodDays = new Set<string>()
  for (const m of moodRows) {
    moodDays.add(m.log_date)
    moodCounts.set(m.value as string, (moodCounts.get(m.value as string) ?? 0) + 1)
    allDates.add(m.log_date)
  }
  let topMood = ''
  let topCount = 0
  moodCounts.forEach((n, mood) => { if (n > topCount) { topMood = mood; topCount = n } })
  const mood = moodRows.length > 0 ? { count: moodRows.length, days: moodDays.size, topMood } : null

  // Water — days with glasses logged, average glasses per logged day.
  const waterRows = input.water.filter((w) => inWindow(w.date) && w.glasses > 0)
  const waterByDate = maxPerDate(waterRows, (w) => w.date, (w) => w.glasses)
  waterByDate.forEach((_, d) => allDates.add(d))
  const water = waterByDate.size > 0
    ? { days: waterByDate.size, avgGlasses: avg([...waterByDate.values()]) }
    : null

  // Movement — sessions add up within a day.
  const moveRows = input.exercise.filter((e) => inWindow(e.date) && e.minutes > 0)
  const moveDays = new Set(moveRows.map((e) => e.date))
  moveDays.forEach((d) => allDates.add(d))
  const movement = moveRows.length > 0
    ? { days: moveDays.size, minutes: moveRows.reduce((a, e) => a + e.minutes, 0) }
    : null

  // Nutrition — days with at least one nutrient tagged.
  const n = input.nutrition
  let nutritionDays = 0
  if (n) {
    n.dates.forEach((d, i) => {
      if (inWindow(d) && (n.iron[i] || n.folic[i] || n.protein[i] || n.calcium[i])) {
        nutritionDays++
        allDates.add(d)
      }
    })
  }
  const nutrition = nutritionDays > 0 ? { days: nutritionDays } : null

  const logCount = sleepRows.length + moodRows.length + waterRows.length + moveRows.length + nutritionDays
  const areasLogged = [sleep, mood, water, movement, nutrition].filter(Boolean).length

  return {
    days,
    logCount,
    daysLogged: allDates.size,
    areasLogged,
    sleep,
    mood,
    water,
    movement,
    nutrition,
  }
}

/** Share of the window with at least one log, 0..100 — "how much was logged", never "how well". */
export function weekCoveragePct(facts: PregnancyWeekFacts): number {
  return Math.round((Math.min(facts.daysLogged, facts.days) / facts.days) * 100)
}

/** Days in the window with at least one log for one area. */
export function areaDays(facts: PregnancyWeekFacts, area: PregnancyWeekArea): number {
  switch (area) {
    case 'sleep': return facts.sleep?.nights ?? 0
    case 'mood': return facts.mood?.days ?? 0
    case 'water': return facts.water?.days ?? 0
    case 'movement': return facts.movement?.days ?? 0
    case 'nutrition': return facts.nutrition?.days ?? 0
  }
}
