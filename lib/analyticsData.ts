/**
 * Analytics Data — fetches real child_logs from Supabase
 * and transforms them into chart-ready structures for KidsAnalytics.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useChildStore } from '../store/useChildStore'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChildLog {
  id: string
  child_id: string
  date: string
  type: string
  value: string | null
  notes: string | null
  photos: string[]
  created_at: string
}

/**
 * Nutrition analytics adapt to the child's age:
 *  - "milk"   (<6 months)      → breast + bottle feed frequency, amount, no solids
 *  - "mixed"  (6–12 months)    → milk feeds + introducing solids (variety matters)
 *  - "solids" (12+ months)     → meal quality, variety, and frequency
 */
export type NutritionMode = 'milk' | 'mixed' | 'solids'

export interface NutritionData {
  mode: NutritionMode
  /** Meal frequency per day — for milk phase this is breast+bottle sessions. */
  mealFrequency: number[]
  /** Quality counts per day (eaten well / a little / refused). Solids only. */
  eatQuality: { good: number[]; little: number[]; none: number[] }
  topFoods: { label: string; count: number }[]
  /** Milk-phase extras — breast sessions + bottle volume per day. */
  breastSessions: number[]
  bottleSessions: number[]
  bottleMlPerDay: number[]
  /** Target feeds/day for the child's age (used to score frequency). */
  feedTarget: number
  weekLabels: string[]
  hasData: boolean
}

export interface SleepData {
  dailyHours: number[]
  qualityCounts: { great: number; good: number; restless: number; poor: number }
  weekLabels: string[]
  avgHours: number
  hasData: boolean
}

export interface MoodData {
  dailyCounts: Record<string, number[]>
  dominantMoods: { mood: string; count: number }[]
  weekLabels: string[]
  hasData: boolean
}

export interface HealthData {
  recentEvents: { date: string; type: string; label: string }[]
  weeklyFrequency: number[]
  vaccines: { name: string; done: boolean }[]
  weekLabels: string[]
  hasData: boolean
}

export interface DiaperData {
  dailyCounts: number[]
  typeCounts: { pee: number; poop: number; mixed: number }
  colorCounts: Record<string, number>
  weekLabels: string[]
  totalCount: number
  hasData: boolean
}

export interface GrowthData {
  weights: { value: number; date: string }[]
  heights: { value: number; date: string }[]
  hasData: boolean
}

export interface RoutineComplianceData {
  weeklySkips: number[]    // skip count per day, last 7 days
  totalSkips: number
  skipRate: number         // percentage 0-100 of skips vs total scheduled
  mostSkipped: { name: string; count: number }[]
  weekLabels: string[]
  hasData: boolean
}

export interface PillarScore {
  value: number       // 0-10 scale
  label: string       // e.g. 'excellent', 'good', 'needs attention'
  trend: number       // percentage change from prior week (-100 to +100)
  hasData: boolean
}

export interface ActivityData {
  activeDays: number              // days in last 7 with at least 1 session
  totalSessions: number           // total activity logs this week
  totalMinutes: number            // total logged minutes (from duration field)
  uniqueTypes: string[]           // unique activityType values
  dailySessions: number[]         // sessions per day (7 values)
  weekLabels: string[]
  hasData: boolean
}

export interface WellnessScores {
  overall: number     // weighted average 0-10
  nutrition: PillarScore
  sleep: PillarScore
  mood: PillarScore
  health: PillarScore
  growth: PillarScore
  activity: PillarScore
}

export interface AnalyticsData {
  nutrition: NutritionData
  sleep: SleepData
  mood: MoodData
  health: HealthData
  diaper: DiaperData
  routineCompliance: RoutineComplianceData
  growth: GrowthData
  activity: ActivityData
  scores: WellnessScores
  totalLogs: number
  dateRange: { from: string; to: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a Date to local YYYY-MM-DD (matches how calendar stores log dates). */
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getLast7Days(): { dates: string[]; labels: string[] } {
  return getLastNDays(7)
}

/**
 * Build a list of the last N days with appropriate labels.
 * - N <= 14: day-of-week labels (Sun..Sat)
 * - N <= 35: short date labels (Apr 5)
 * - N > 35: date labels every ~N/7 days, others blank
 */
function getLastNDays(n: number, until?: Date): { dates: string[]; labels: string[] } {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dates: string[] = []
  const labels: string[] = []
  const stride = n > 35 ? Math.ceil(n / 7) : 1
  const end = until ?? new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    dates.push(localDateStr(d))
    if (n <= 14) {
      labels.push(dayNames[d.getDay()])
    } else if (n <= 35) {
      const mo = d.toLocaleDateString('en-US', { month: 'short' })
      labels.push(`${mo} ${d.getDate()}`)
    } else {
      labels.push(i % stride === 0 ? `${d.getMonth() + 1}/${d.getDate()}` : '')
    }
  }
  return { dates, labels }
}

/** Build a date range between two inclusive dates (YYYY-MM-DD output). */
function getRangeDays(fromISO: string, toISO: string): { dates: string[]; labels: string[] } {
  const from = new Date(fromISO)
  const to = new Date(toISO)
  const diffDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1)
  return getLastNDays(diffDays, to)
}

function parseValue(value: string | null): any {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

// ─── Transform Functions ──────────────────────────────────────────────────────

/**
 * Pick the right nutrition mode + feed-target for an age (in months).
 * - Milk phase: 0-1mo ~10 feeds, 1-3mo ~8, 3-6mo ~6.
 * - Mixed phase (6-12mo): ~5 feeds + solid intro.
 * - Solids (12+mo): treat as meals (target 4 incl. snacks).
 */
function getNutritionModeForAge(ageMonths: number): { mode: NutritionMode; feedTarget: number } {
  if (ageMonths < 6) {
    if (ageMonths < 1) return { mode: 'milk', feedTarget: 10 }
    if (ageMonths < 3) return { mode: 'milk', feedTarget: 8 }
    return { mode: 'milk', feedTarget: 6 }
  }
  if (ageMonths < 12) return { mode: 'mixed', feedTarget: 5 }
  return { mode: 'solids', feedTarget: 4 }
}

function buildNutritionData(
  logs: ChildLog[],
  dates: string[],
  labels: string[],
  ageMonths: number,
): NutritionData {
  const foodLogs = logs.filter((l) => l.type === 'food' || l.type === 'feeding')
  const { mode, feedTarget } = getNutritionModeForAge(ageMonths)

  const emptyBase = {
    mode,
    feedTarget,
    mealFrequency: Array.from({ length: dates.length }, () => 0),
    eatQuality: {
      good: Array.from({ length: dates.length }, () => 0),
      little: Array.from({ length: dates.length }, () => 0),
      none: Array.from({ length: dates.length }, () => 0),
    },
    topFoods: [] as { label: string; count: number }[],
    breastSessions: Array.from({ length: dates.length }, () => 0),
    bottleSessions: Array.from({ length: dates.length }, () => 0),
    bottleMlPerDay: Array.from({ length: dates.length }, () => 0),
    weekLabels: labels,
  }

  if (foodLogs.length === 0) {
    return { ...emptyBase, hasData: false }
  }

  const good = new Array(dates.length).fill(0)
  const little = new Array(dates.length).fill(0)
  const none = new Array(dates.length).fill(0)
  const mealFreq = new Array(dates.length).fill(0)
  const breastSessions = new Array(dates.length).fill(0)
  const bottleSessions = new Array(dates.length).fill(0)
  const bottleMl = new Array(dates.length).fill(0)
  const foodCounts: Record<string, number> = {}

  for (const log of foodLogs) {
    const dayIdx = dates.indexOf(log.date)
    if (dayIdx === -1) continue

    mealFreq[dayIdx]++
    const val = parseValue(log.value)

    const feedType: 'breast' | 'bottle' | 'solids' | undefined =
      val && typeof val === 'object' ? val.feedType : undefined

    if (feedType === 'breast') {
      breastSessions[dayIdx]++
    } else if (feedType === 'bottle') {
      bottleSessions[dayIdx]++
      const amount = parseFloat(val?.amount ?? '')
      if (!isNaN(amount)) bottleMl[dayIdx] += amount
    }

    // Solids quality — only meaningful for mixed/solids phases.
    if (val && typeof val === 'object' && val.quality) {
      if (val.quality === 'ate_well') good[dayIdx]++
      else if (val.quality === 'ate_little') little[dayIdx]++
      else if (val.quality === 'did_not_eat') none[dayIdx]++

      if (val.newFoodName) {
        foodCounts[val.newFoodName] = (foodCounts[val.newFoodName] || 0) + 1
      }
    }

    // Track foods from notes field (legacy 'food' logs)
    if (log.notes && log.type === 'food') {
      const name = log.notes.split(',')[0].trim()
      if (name.length > 0 && name.length < 30) {
        foodCounts[name] = (foodCounts[name] || 0) + 1
      }
    }
  }

  const topFoods = Object.entries(foodCounts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  return {
    mode,
    feedTarget,
    mealFrequency: mealFreq,
    eatQuality: { good, little, none },
    topFoods,
    breastSessions,
    bottleSessions,
    bottleMlPerDay: bottleMl,
    weekLabels: labels,
    hasData: true,
  }
}

function buildSleepData(logs: ChildLog[], dates: string[], labels: string[]): SleepData {
  const sleepLogs = logs.filter((l) => l.type === 'sleep')
  if (sleepLogs.length === 0) {
    return { dailyHours: Array.from({ length: dates.length }, () => 0), qualityCounts: { great: 0, good: 0, restless: 0, poor: 0 }, weekLabels: labels, avgHours: 0, hasData: false }
  }

  const dailyHours = new Array(dates.length).fill(0)
  const qualityCounts = { great: 0, good: 0, restless: 0, poor: 0 }
  let totalHours = 0
  let sleepDays = 0

  for (const log of sleepLogs) {
    const val = parseValue(log.value)
    const dayIdx = dates.indexOf(log.date)

    if (val && typeof val === 'object') {
      const hours = parseFloat(val.duration) || 0
      if (dayIdx !== -1) {
        dailyHours[dayIdx] += hours
      }
      totalHours += hours
      sleepDays++

      const q = (val.quality || '').toLowerCase()
      if (q === 'great') qualityCounts.great++
      else if (q === 'good') qualityCounts.good++
      else if (q === 'restless') qualityCounts.restless++
      else if (q === 'poor') qualityCounts.poor++
    }
  }

  return {
    dailyHours,
    qualityCounts,
    weekLabels: labels,
    avgHours: sleepDays > 0 ? totalHours / sleepDays : 0,
    hasData: true,
  }
}

function buildMoodData(logs: ChildLog[], dates: string[], labels: string[]): MoodData {
  const moodLogs = logs.filter((l) => l.type === 'mood')
  if (moodLogs.length === 0) {
    return { dailyCounts: {}, dominantMoods: [], weekLabels: labels, hasData: false }
  }

  const allMoods = ['happy', 'calm', 'energetic', 'fussy', 'cranky']
  const dailyCounts: Record<string, number[]> = {}
  for (const m of allMoods) dailyCounts[m] = new Array(dates.length).fill(0)
  const moodTotals: Record<string, number> = {}

  for (const log of moodLogs) {
    const mood = (typeof log.value === 'string' ? log.value : parseValue(log.value)) as string
    if (!mood || typeof mood !== 'string') continue

    const moodKey = mood.toLowerCase().trim().replace(/['"]/g, '')
    moodTotals[moodKey] = (moodTotals[moodKey] || 0) + 1

    const dayIdx = dates.indexOf(log.date)
    if (dayIdx !== -1 && dailyCounts[moodKey]) {
      dailyCounts[moodKey][dayIdx]++
    }
  }

  const dominantMoods = Object.entries(moodTotals)
    .map(([mood, count]) => ({ mood, count }))
    .sort((a, b) => b.count - a.count)

  return { dailyCounts, dominantMoods, weekLabels: labels, hasData: true }
}

function buildHealthData(logs: ChildLog[], dates: string[], labels: string[]): HealthData {
  const healthTypes = ['temperature', 'vaccine', 'medicine', 'note']
  const healthLogs = logs.filter((l) => healthTypes.includes(l.type))

  const weeklyFreq = new Array(dates.length).fill(0)
  const recentEvents: HealthData['recentEvents'] = []
  const vaccineNames = new Set<string>()

  for (const log of healthLogs) {
    const dayIdx = dates.indexOf(log.date)
    if (dayIdx !== -1) weeklyFreq[dayIdx]++

    const displayDate = new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const typeLabel = log.type.charAt(0).toUpperCase() + log.type.slice(1)
    const label = log.notes || log.value || typeLabel
    recentEvents.push({ date: displayDate, type: typeLabel, label: typeof label === 'string' ? label : typeLabel })

    if (log.type === 'vaccine' && log.value) {
      vaccineNames.add(typeof log.value === 'string' ? log.value : '')
    }
  }

  // Standard vaccine list with logged ones marked as done
  const standardVaccines = ['HepB', 'DTaP', 'IPV', 'Hib', 'PCV13', 'RV', 'MMR', 'Varicella']
  const vaccines = standardVaccines.map((name) => ({
    name,
    done: vaccineNames.has(name) || [...vaccineNames].some((v) => v.toLowerCase().includes(name.toLowerCase())),
  }))

  return {
    recentEvents: recentEvents.slice(0, 5),
    weeklyFrequency: weeklyFreq,
    vaccines,
    weekLabels: labels,
    hasData: healthLogs.length > 0,
  }
}

function buildGrowthData(logs: ChildLog[]): GrowthData {
  const growthLogs = logs.filter((l) => l.type === 'growth')
  if (growthLogs.length === 0) {
    return { weights: [], heights: [], hasData: false }
  }

  const weights: GrowthData['weights'] = []
  const heights: GrowthData['heights'] = []

  for (const log of growthLogs) {
    const val = parseValue(log.value)
    if (val && typeof val === 'object') {
      if (val.weight) weights.push({ value: parseFloat(val.weight), date: log.date })
      if (val.height) heights.push({ value: parseFloat(val.height), date: log.date })
    }
  }

  weights.sort((a, b) => a.date.localeCompare(b.date))
  heights.sort((a, b) => a.date.localeCompare(b.date))

  return { weights, heights, hasData: weights.length > 0 || heights.length > 0 }
}

function buildDiaperData(logs: ChildLog[], dates: string[], labels: string[]): DiaperData {
  const diaperLogs = logs.filter((l) => l.type === 'diaper')
  if (diaperLogs.length === 0) {
    return { dailyCounts: Array.from({ length: dates.length }, () => 0), typeCounts: { pee: 0, poop: 0, mixed: 0 }, colorCounts: {}, weekLabels: labels, totalCount: 0, hasData: false }
  }

  const dailyCounts = new Array(dates.length).fill(0)
  const typeCounts = { pee: 0, poop: 0, mixed: 0 }
  const colorCounts: Record<string, number> = {}

  for (const log of diaperLogs) {
    const dayIdx = dates.indexOf(log.date)
    if (dayIdx !== -1) dailyCounts[dayIdx]++

    const val = parseValue(log.value)
    if (val && typeof val === 'object') {
      const dt = (val.diaperType || '') as keyof typeof typeCounts
      if (dt in typeCounts) typeCounts[dt]++

      if (val.color) {
        const c = String(val.color)
        colorCounts[c] = (colorCounts[c] || 0) + 1
      }
    }
  }

  return { dailyCounts, typeCounts, colorCounts, weekLabels: labels, totalCount: diaperLogs.length, hasData: true }
}

// ─── Scoring Functions ───────────────────────────────────────────────────────

function scoreLabel(score: number): string {
  if (score >= 8.5) return 'excellent'
  if (score >= 7) return 'good'
  if (score >= 5) return 'fair'
  if (score >= 3) return 'needs attention'
  return 'low'
}

function scoreNutrition(data: NutritionData): PillarScore {
  if (!data.hasData) return { value: 0, label: 'no data', trend: 0, hasData: false }

  const totalMeals = data.mealFrequency.reduce((a, b) => a + b, 0)
  if (totalMeals === 0) return { value: 0, label: 'no data', trend: 0, hasData: false }

  const windowDays = Math.max(1, data.mealFrequency.length)
  const daysWithData = data.mealFrequency.filter((m) => m > 0).length

  // ── MILK phase: score purely on feeding frequency vs age-appropriate target.
  // Quality/variety don't apply to breast/bottle feeds.
  if (data.mode === 'milk') {
    const avgFeedsPerLoggedDay = daysWithData > 0 ? totalMeals / daysWithData : 0
    // Frequency score: reach target → 8pts, exceed target (up to 1.2×) → 9pts.
    const freqRatio = Math.min(avgFeedsPerLoggedDay / Math.max(1, data.feedTarget), 1.2)
    const freqScore = Math.min(freqRatio / 1.2, 1) * 8
    // Consistency bonus: logging rate across the window (max 2 pts).
    const consistencyBonus = Math.min(daysWithData / windowDays, 1) * 2
    const raw = Math.min(freqScore + consistencyBonus, 10)
    const value = Math.round(raw * 10) / 10
    // Trend: compare first vs second half of the window.
    const half = Math.floor(windowDays / 2)
    const first = data.mealFrequency.slice(0, half).reduce((a, b) => a + b, 0)
    const second = data.mealFrequency.slice(half).reduce((a, b) => a + b, 0)
    const trend = first > 0 ? Math.round(((second - first) / first) * 100) : 0
    return { value, label: scoreLabel(value), trend, hasData: true }
  }

  // ── MIXED phase (6–12mo): milk frequency (60%) + solid introduction variety (40%).
  if (data.mode === 'mixed') {
    const avgFeedsPerLoggedDay = daysWithData > 0 ? totalMeals / daysWithData : 0
    const freqRatio = Math.min(avgFeedsPerLoggedDay / Math.max(1, data.feedTarget), 1)
    const freqScore = freqRatio * 10  // 10 pts max, weighted below

    // Variety: target is 3+ distinct foods introduced this window (lower than toddler).
    const varietyScore = Math.min(data.topFoods.length / 3, 1) * 10

    const raw = Math.min(freqScore * 0.6 + varietyScore * 0.4, 10)
    const value = Math.round(raw * 10) / 10

    const half = Math.floor(windowDays / 2)
    const first = data.mealFrequency.slice(0, half).reduce((a, b) => a + b, 0)
    const second = data.mealFrequency.slice(half).reduce((a, b) => a + b, 0)
    const trend = first > 0 ? Math.round(((second - first) / first) * 100) : 0
    return { value, label: scoreLabel(value), trend, hasData: true }
  }

  // ── SOLIDS phase (12+mo): current quality + frequency + variety logic.
  const totalGood = data.eatQuality.good.reduce((a, b) => a + b, 0)
  const totalLittle = data.eatQuality.little.reduce((a, b) => a + b, 0)

  const qualityScore = ((totalGood * 10 + totalLittle * 5) / totalMeals)
  const freqBonus = Math.min(daysWithData / windowDays, 1) * 1.5
  const varietyBonus = Math.min(data.topFoods.length / 5, 1) * 1.0

  const raw = Math.min(qualityScore + freqBonus + varietyBonus, 10)
  const value = Math.round(raw * 10) / 10

  const half = Math.floor(windowDays / 2)
  const firstHalf = data.eatQuality.good.slice(0, half).reduce((a, b) => a + b, 0)
  const secondHalf = data.eatQuality.good.slice(half).reduce((a, b) => a + b, 0)
  const trend = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0

  return { value, label: scoreLabel(value), trend, hasData: true }
}

function scoreSleep(data: SleepData): PillarScore {
  if (!data.hasData) return { value: 0, label: 'no data', trend: 0, hasData: false }

  const total = data.qualityCounts.great + data.qualityCounts.good + data.qualityCounts.restless + data.qualityCounts.poor
  if (total === 0) return { value: 0, label: 'no data', trend: 0, hasData: false }

  // Quality score: great=10, good=7.5, restless=4, poor=1
  const qualityScore = (
    data.qualityCounts.great * 10 +
    data.qualityCounts.good * 7.5 +
    data.qualityCounts.restless * 4 +
    data.qualityCounts.poor * 1
  ) / total

  // Consistency bonus: days-with-sleep rate scaled to the window size
  const windowDays = Math.max(1, data.dailyHours.length)
  const daysWithSleep = data.dailyHours.filter((h) => h > 0).length
  const consistencyBonus = Math.min(daysWithSleep / windowDays, 1) * 1.5

  const raw = Math.min(qualityScore * 0.85 + consistencyBonus, 10)
  const value = Math.round(raw * 10) / 10

  // Trend: average of last 3 days vs first 3
  const first3 = data.dailyHours.slice(0, 3).reduce((a, b) => a + b, 0) / 3
  const last3 = data.dailyHours.slice(4).reduce((a, b) => a + b, 0) / 3
  const trend = first3 > 0 ? Math.round(((last3 - first3) / first3) * 100) : 0

  return { value, label: scoreLabel(value), trend, hasData: true }
}

function scoreMood(data: MoodData): PillarScore {
  if (!data.hasData) return { value: 0, label: 'no data', trend: 0, hasData: false }

  const totalMoods = data.dominantMoods.reduce((a, m) => a + m.count, 0)
  if (totalMoods === 0) return { value: 0, label: 'no data', trend: 0, hasData: false }

  // Mood weights: happy=10, calm=9, energetic=8, fussy=3, cranky=1
  const moodWeights: Record<string, number> = { happy: 10, calm: 9, energetic: 8, fussy: 3, cranky: 1 }
  let weightedSum = 0
  for (const m of data.dominantMoods) {
    weightedSum += (moodWeights[m.mood] || 5) * m.count
  }
  const raw = Math.min(weightedSum / totalMoods, 10)
  const value = Math.round(raw * 10) / 10

  // Trend: compare first half vs second half of week using daily counts
  const moodKeys = Object.keys(data.dailyCounts)
  let firstHalfScore = 0, firstHalfCount = 0
  let secondHalfScore = 0, secondHalfCount = 0
  for (const mood of moodKeys) {
    const weight = moodWeights[mood] || 5
    const days = data.dailyCounts[mood]
    for (let i = 0; i < days.length; i++) {
      const count = days[i]
      if (count === 0) continue
      if (i < 3) { firstHalfScore += weight * count; firstHalfCount += count }
      else if (i > 3) { secondHalfScore += weight * count; secondHalfCount += count }
    }
  }
  const firstAvg = firstHalfCount > 0 ? firstHalfScore / firstHalfCount : 0
  const secondAvg = secondHalfCount > 0 ? secondHalfScore / secondHalfCount : 0
  const trend = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0

  return { value, label: scoreLabel(value), trend, hasData: true }
}

function buildRoutineComplianceData(logs: ChildLog[], dates: string[], labels: string[]): RoutineComplianceData {
  const skippedLogs = logs.filter((l) => l.type === 'skipped')
  if (skippedLogs.length === 0) {
    return { weeklySkips: Array.from({ length: dates.length }, () => 0), totalSkips: 0, skipRate: 0, mostSkipped: [], weekLabels: labels, hasData: false }
  }

  const weeklySkips = new Array(dates.length).fill(0)
  const routineSkipCounts: Record<string, number> = {}

  for (const log of skippedLogs) {
    const dayIdx = dates.indexOf(log.date)
    if (dayIdx !== -1) weeklySkips[dayIdx]++
    try {
      const val = parseValue(log.value)
      if (val?.routineName) {
        routineSkipCounts[val.routineName] = (routineSkipCounts[val.routineName] || 0) + 1
      }
    } catch {}
  }

  const totalSkips = skippedLogs.length
  // Skip rate: skips vs (skips + actual logs) in the 7-day window
  const windowLogs = logs.filter((l) => l.type !== 'skipped' && dates.includes(l.date)).length
  const skipRate = windowLogs + totalSkips > 0 ? Math.round((totalSkips / (windowLogs + totalSkips)) * 100) : 0

  const mostSkipped = Object.entries(routineSkipCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return { weeklySkips, totalSkips, skipRate, mostSkipped, weekLabels: labels, hasData: true }
}

function scoreHealth(data: HealthData): PillarScore {
  if (!data.hasData && data.vaccines.every((v) => !v.done)) {
    return { value: 0, label: 'no data', trend: 0, hasData: false }
  }

  // Vaccine completion score (0-10)
  const doneVaccines = data.vaccines.filter((v) => v.done).length
  const vaccineScore = data.vaccines.length > 0 ? (doneVaccines / data.vaccines.length) * 10 : 5

  // Less health incidents is better (temperature, medicine = concerning)
  const totalEvents = data.weeklyFrequency.reduce((a, b) => a + b, 0)
  const eventPenalty = Math.min(totalEvents * 0.8, 5) // max 5 points penalty
  const eventScore = Math.max(10 - eventPenalty, 2)

  const raw = (vaccineScore * 0.6 + eventScore * 0.4)
  const value = Math.round(Math.min(raw, 10) * 10) / 10

  return { value, label: scoreLabel(value), trend: 0, hasData: data.hasData || doneVaccines > 0 }
}

function scoreGrowth(data: GrowthData): PillarScore {
  if (!data.hasData) return { value: 0, label: 'no data', trend: 0, hasData: false }

  // Growth is tracked by having measurements — more regular = higher score
  const totalMeasurements = data.weights.length + data.heights.length
  const measureScore = Math.min(totalMeasurements / 4, 1) * 7 // up to 7 for having data

  // Bonus for recent measurements (within last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentDate = localDateStr(sevenDaysAgo)
  const hasRecent = data.weights.some((w) => w.date >= recentDate) || data.heights.some((h) => h.date >= recentDate)
  const recencyBonus = hasRecent ? 3 : 1

  const value = Math.round(Math.min(measureScore + recencyBonus, 10) * 10) / 10
  return { value, label: scoreLabel(value), trend: 0, hasData: true }
}

function buildActivityData(logs: ChildLog[], dates: string[], labels: string[]): ActivityData {
  const activityLogs = logs.filter((l) => l.type === 'activity' && dates.includes(l.date))
  const empty: ActivityData = { activeDays: 0, totalSessions: 0, totalMinutes: 0, uniqueTypes: [], dailySessions: new Array(dates.length).fill(0), weekLabels: labels, hasData: false }
  if (activityLogs.length === 0) return empty

  const dailySessions = new Array(dates.length).fill(0)
  let totalMinutes = 0
  const typeSet = new Set<string>()

  for (const log of activityLogs) {
    const dayIdx = dates.indexOf(log.date)
    if (dayIdx !== -1) dailySessions[dayIdx]++
    try {
      const parsed = parseValue(log.value)
      if (parsed?.activityType) typeSet.add(parsed.activityType as string)
      if (parsed?.duration) {
        const mins = parseFloat(String(parsed.duration))
        if (!isNaN(mins)) totalMinutes += mins
      }
    } catch {}
  }

  return {
    activeDays: dailySessions.filter((s) => s > 0).length,
    totalSessions: dailySessions.reduce((a, b) => a + b, 0),
    totalMinutes,
    uniqueTypes: [...typeSet],
    dailySessions,
    weekLabels: labels,
    hasData: true,
  }
}

function scoreActivity(data: ActivityData): PillarScore {
  if (!data.hasData) return { value: 0, label: 'no data', trend: 0, hasData: false }

  // Base: active-day rate → 0–9 pts. dailySessions.length is the window size.
  const windowDays = Math.max(1, data.dailySessions.length)
  const base = (data.activeDays / windowDays) * 9
  // Variety bonus: up to +1 for logging 3+ different activity types
  const varietyBonus = Math.min(data.uniqueTypes.length / 3, 1)
  const value = Math.round(Math.min(base + varietyBonus, 10) * 10) / 10
  return { value, label: scoreLabel(value), trend: 0, hasData: true }
}

function buildScores(nutrition: NutritionData, sleep: SleepData, mood: MoodData, health: HealthData, growth: GrowthData, activity: ActivityData): WellnessScores {
  const ns = scoreNutrition(nutrition)
  const ss = scoreSleep(sleep)
  const ms = scoreMood(mood)
  const hs = scoreHealth(health)
  const gs = scoreGrowth(growth)

  const as = scoreActivity(activity)

  // Weighted overall: nutrition 27%, sleep 22%, mood 18%, health 13%, growth 9%, activity 11%
  const pillars = [
    { score: ns, weight: 0.27 },
    { score: ss, weight: 0.22 },
    { score: ms, weight: 0.18 },
    { score: hs, weight: 0.13 },
    { score: gs, weight: 0.09 },
    { score: as, weight: 0.11 },
  ]

  const withData = pillars.filter((p) => p.score.hasData)
  let overall = 0
  if (withData.length > 0) {
    const totalWeight = withData.reduce((a, p) => a + p.weight, 0)
    overall = withData.reduce((a, p) => a + p.score.value * (p.weight / totalWeight), 0)
  }
  overall = Math.round(overall * 10) / 10

  return { overall, nutrition: ns, sleep: ss, mood: ms, health: hs, growth: gs, activity: as }
}

// ─── Main Query Hook ──────────────────────────────────────────────────────────

export type AnalyticsRange =
  | { kind: 'last'; days: number }
  | { kind: 'custom'; from: string; to: string }

/** Compute the date window (dates[], labels[], sinceDate) for a given range. */
function computeWindow(range: AnalyticsRange): { dates: string[]; labels: string[]; sinceDate: string; toDate: string } {
  if (range.kind === 'custom') {
    const { dates, labels } = getRangeDays(range.from, range.to)
    return { dates, labels, sinceDate: range.from, toDate: range.to }
  }
  const days = Math.max(1, range.days)
  const { dates, labels } = getLastNDays(days)
  const since = new Date()
  since.setDate(since.getDate() - (days - 1))
  return { dates, labels, sinceDate: localDateStr(since), toDate: localDateStr(new Date()) }
}

export function useKidsAnalytics(
  childId: string | 'all',
  range: AnalyticsRange = { kind: 'last', days: 7 },
) {
  const children = useChildStore((s) => s.children)

  // Window for the selected range. Fetch at least 30 days for longer-term context
  // (growth trend), but scoring & charts use the explicit window.
  const window = computeWindow(range)
  const minFetchSince = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    const fallback = localDateStr(d)
    return window.sinceDate < fallback ? window.sinceDate : fallback
  })()

  return useQuery<AnalyticsData>({
    queryKey: [
      'kids-analytics',
      childId,
      range.kind,
      range.kind === 'custom' ? `${range.from}_${range.to}` : String(range.days),
    ],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const childIds = childId === 'all'
        ? children.map((c) => c.id)
        : [childId]

      if (childIds.length === 0) {
        throw new Error('No children found')
      }

      const { data: logs, error } = await supabase
        .from('child_logs')
        .select('id, child_id, date, type, value, notes, photos, created_at')
        .in('child_id', childIds)
        .gte('date', minFetchSince)
        .lte('date', window.toDate)
        .order('created_at', { ascending: true })
        .limit(2000)

      if (error) throw error

      const allLogs: ChildLog[] = (logs ?? []) as ChildLog[]
      const { dates, labels } = window

      // Derive the age of the child we're analyzing (single-child only).
      // Used to pick the right nutrition scoring mode (milk / mixed / solids).
      const selectedChild = childId === 'all' ? null : children.find((c) => c.id === childId)
      const ageMonths = selectedChild?.birthDate
        ? (() => {
            const d = new Date(selectedChild.birthDate)
            if (isNaN(d.getTime())) return 24
            const now = new Date()
            return Math.max(0, (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()))
          })()
        : 24

      const nutrition = buildNutritionData(allLogs, dates, labels, ageMonths)
      const sleep = buildSleepData(allLogs, dates, labels)
      const mood = buildMoodData(allLogs, dates, labels)
      const health = buildHealthData(allLogs, dates, labels)
      const diaper = buildDiaperData(allLogs, dates, labels)
      const growth = buildGrowthData(allLogs)
      const activity = buildActivityData(allLogs, dates, labels)
      const routineCompliance = buildRoutineComplianceData(allLogs, dates, labels)
      const scores = buildScores(nutrition, sleep, mood, health, growth, activity)

      return {
        nutrition,
        sleep,
        mood,
        health,
        diaper,
        growth,
        activity,
        routineCompliance,
        scores,
        totalLogs: allLogs.filter((l) => l.type !== 'skipped').length,
        dateRange: { from: window.sinceDate, to: window.toDate },
      }
    },
    staleTime: 60 * 1000,        // 1 min — charts feel live
    refetchOnWindowFocus: true,
    retry: 1,
  })
}

// ─── Pregnancy Analytics Types ────────────────────────────────────────────────

export interface PregnancyWeightEntry {
  date: string
  weight: number
}

export interface PregnancyMoodEntry {
  week: number
  mood: string
  count: number
}

export interface PregnancyKickSession {
  date: string
  kicks: number
}

export interface PregnancySymptomFreq {
  symptom: string
  count: number
}

export interface PregnancyWellbeingScore {
  sleep: number      // avg hours / 9 * 10
  mood: number       // positive moods / total * 10
  nutrition: number  // days with nutrition log / 7 * 10
  exercise: number   // days with exercise / 7 * 10
  hydration: number  // avg glasses / 8 * 10 (capped at 10)
  overall: number    // average of above
  delta: number      // change from previous week (percentage points)
}

export interface PregnancyNutritionMatrix {
  dates: string[]
  iron: boolean[]
  folic: boolean[]
  protein: boolean[]
  calcium: boolean[]
}

// ─── Pregnancy Query Hooks ────────────────────────────────────────────────────

export function usePregnancyWeightHistory(userId: string, limit = 10) {
  return useQuery({
    queryKey: ['pregnancy_weight', userId, limit],
    queryFn: async (): Promise<PregnancyWeightEntry[]> => {
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('log_date, value')
        .eq('user_id', userId)
        .eq('log_type', 'weight')
        .order('log_date', { ascending: true })
        .limit(limit)
      if (error) throw error
      return (data ?? []).map(r => ({
        date: r.log_date,
        weight: parseFloat(r.value ?? '0'),
      })).filter(r => !isNaN(r.weight))
    },
    enabled: !!userId,
  })
}

export function usePregnancyMoodTrend(userId: string, weeks = 12) {
  return useQuery({
    queryKey: ['pregnancy_mood_trend', userId, weeks],
    queryFn: async () => {
      const since = new Date()
      since.setDate(since.getDate() - weeks * 7)
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('log_date, value')
        .eq('user_id', userId)
        .eq('log_type', 'mood')
        .gte('log_date', since.toISOString().split('T')[0])
        .order('log_date', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!userId,
  })
}

export function usePregnancyKickSessions(userId: string, limit = 14) {
  return useQuery({
    queryKey: ['pregnancy_kicks', userId, limit],
    queryFn: async (): Promise<PregnancyKickSession[]> => {
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('log_date, value')
        .eq('user_id', userId)
        .eq('log_type', 'kick_count')
        .order('log_date', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []).map(r => ({
        date: r.log_date,
        kicks: parseInt(r.value ?? '0', 10),
      })).reverse()
    },
    enabled: !!userId,
  })
}

export function usePregnancySymptomFrequency(userId: string) {
  return useQuery({
    queryKey: ['pregnancy_symptoms', userId],
    queryFn: async (): Promise<PregnancySymptomFreq[]> => {
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('value')
        .eq('user_id', userId)
        .eq('log_type', 'symptom')
      if (error) throw error
      const counts: Record<string, number> = {}
      for (const row of data ?? []) {
        if (row.value) counts[row.value] = (counts[row.value] ?? 0) + 1
      }
      return Object.entries(counts)
        .map(([symptom, count]) => ({ symptom, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    },
    enabled: !!userId,
  })
}

export function usePregnancyWellbeingScore(userId: string) {
  return useQuery({
    queryKey: ['pregnancy_wellbeing', userId],
    queryFn: async (): Promise<PregnancyWellbeingScore> => {
      const since = new Date()
      since.setDate(since.getDate() - 7)
      const sinceStr = since.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('log_date, log_type, value')
        .eq('user_id', userId)
        .gte('log_date', sinceStr)
      if (error) throw error

      const logs = data ?? []
      const sleepLogs = logs.filter(l => l.log_type === 'sleep')
      const moodLogs = logs.filter(l => l.log_type === 'mood')
      const nutritionLogs = logs.filter(l => l.log_type === 'nutrition')
      const exerciseLogs = logs.filter(l => l.log_type === 'exercise')
      const waterLogs = logs.filter(l => l.log_type === 'water')

      const positiveMoods = ['happy', 'radiant', 'energetic', 'okay']
      const avgSleepHours = sleepLogs.length > 0
        ? sleepLogs.reduce((s, l) => s + parseFloat(l.value ?? '0'), 0) / sleepLogs.length
        : 0
      const moodScore = moodLogs.length > 0
        ? (moodLogs.filter(l => positiveMoods.includes(l.value ?? '')).length / moodLogs.length) * 10
        : 0
      const nutritionScore = Math.min(10, (nutritionLogs.length / 7) * 10)
      const exerciseScore = Math.min(10, (exerciseLogs.length / 7) * 10 * 2)
      const avgWater = waterLogs.length > 0
        ? waterLogs.reduce((s, l) => s + parseInt(l.value ?? '0', 10), 0) / waterLogs.length
        : 0
      const hydrationScore = Math.min(10, (avgWater / 8) * 10)
      const sleepScore = Math.min(10, (avgSleepHours / 9) * 10)
      const overall = (sleepScore + moodScore + nutritionScore + exerciseScore + hydrationScore) / 5

      return {
        sleep: Math.round(sleepScore * 10) / 10,
        mood: Math.round(moodScore * 10) / 10,
        nutrition: Math.round(nutritionScore * 10) / 10,
        exercise: Math.round(exerciseScore * 10) / 10,
        hydration: Math.round(hydrationScore * 10) / 10,
        overall: Math.round(overall * 10),
        delta: 0,
      }
    },
    enabled: !!userId,
  })
}

export function usePregnancySleepHistory(userId: string, weeks = 4) {
  return useQuery({
    queryKey: ['pregnancy_sleep', userId, weeks],
    queryFn: async () => {
      const since = new Date()
      since.setDate(since.getDate() - weeks * 7)
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('log_date, value')
        .eq('user_id', userId)
        .eq('log_type', 'sleep')
        .gte('log_date', since.toISOString().split('T')[0])
        .order('log_date', { ascending: true })
      if (error) throw error
      return (data ?? []).map(r => ({
        date: r.log_date,
        hours: parseFloat(r.value ?? '0'),
      }))
    },
    enabled: !!userId,
  })
}

export function usePregnancyHydrationHistory(userId: string, days = 7) {
  return useQuery({
    queryKey: ['pregnancy_hydration', userId, days],
    queryFn: async () => {
      const since = new Date()
      since.setDate(since.getDate() - days)
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('log_date, value')
        .eq('user_id', userId)
        .eq('log_type', 'water')
        .gte('log_date', since.toISOString().split('T')[0])
        .order('log_date', { ascending: true })
      if (error) throw error
      return (data ?? []).map(r => ({
        date: r.log_date,
        glasses: parseInt(r.value ?? '0', 10),
      }))
    },
    enabled: !!userId,
  })
}

export function usePregnancyNutritionMatrix(userId: string, days = 7) {
  return useQuery({
    queryKey: ['pregnancy_nutrition', userId, days],
    queryFn: async (): Promise<PregnancyNutritionMatrix> => {
      const dates: string[] = []
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        dates.push(d.toISOString().split('T')[0])
      }

      const since = dates[0]
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('log_date, notes')
        .eq('user_id', userId)
        .eq('log_type', 'nutrition')
        .gte('log_date', since)
      if (error) throw error

      const logsByDate = new Map<string, string[]>()
      for (const row of data ?? []) {
        const tags: string[] = JSON.parse(row.notes ?? '[]')
        logsByDate.set(row.log_date, tags)
      }

      return {
        dates,
        iron: dates.map(d => logsByDate.get(d)?.includes('iron') ?? false),
        folic: dates.map(d => logsByDate.get(d)?.includes('folic') ?? false),
        protein: dates.map(d => logsByDate.get(d)?.includes('protein') ?? false),
        calcium: dates.map(d => logsByDate.get(d)?.includes('calcium') ?? false),
      }
    },
    enabled: !!userId,
  })
}

// ─── Pregnancy — today's log snapshot ─────────────────────────────────────

export interface TodayLogEntry {
  value: string | null
  notes: string | null
  created_at: string
}

/** Returns today's pregnancy_logs grouped by log_type. Last entry per type wins. */
export function usePregnancyTodayLogs(userId: string | undefined) {
  return useQuery({
    queryKey: ['pregnancy-today-logs', userId],
    queryFn: async (): Promise<Record<string, TodayLogEntry>> => {
      if (!userId) return {}
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('log_type, value, notes, created_at')
        .eq('user_id', userId)
        .eq('log_date', today)
        .order('created_at', { ascending: true })
      if (error) throw error
      const grouped: Record<string, TodayLogEntry> = {}
      for (const row of data ?? []) {
        grouped[row.log_type] = {
          value: row.value,
          notes: row.notes,
          created_at: row.created_at,
        }
      }
      return grouped
    },
    enabled: !!userId,
    staleTime: 30_000,
  })
}

// ─── Pregnancy — calendar month logs ─────────────────────────────────────────

export interface PregnancyCalendarLog {
  id: string
  log_date: string
  log_type: string
  value: string | null
  notes: string | null
  created_at: string
}

/**
 * Returns all pregnancy_logs for a given year+month, grouped by date string.
 * Example: { '2026-04-15': [{log_type:'mood',...}, {log_type:'water',...}] }
 */
export function usePregnancyCalendarLogs(
  userId: string | undefined,
  year: number,
  month: number // 0-indexed
) {
  return useQuery({
    queryKey: ['pregnancy-calendar-logs', userId, year, month],
    queryFn: async (): Promise<Record<string, PregnancyCalendarLog[]>> => {
      if (!userId) return {}
      const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('id, log_date, log_type, value, notes, created_at')
        .eq('user_id', userId)
        .gte('log_date', from)
        .lte('log_date', to)
        .order('created_at', { ascending: true })
      if (error) throw error
      const grouped: Record<string, PregnancyCalendarLog[]> = {}
      for (const row of data ?? []) {
        const key = row.log_date
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(row as PregnancyCalendarLog)
      }
      return grouped
    },
    enabled: !!userId,
    staleTime: 60_000,
  })
}
