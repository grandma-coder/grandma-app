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

export interface NutritionData {
  eatQuality: { good: number[]; little: number[]; none: number[] }
  mealFrequency: number[]
  topFoods: { label: string; count: number }[]
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
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dates: string[] = []
  const labels: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(localDateStr(d))
    labels.push(dayNames[d.getDay()])
  }
  return { dates, labels }
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

function buildNutritionData(logs: ChildLog[], dates: string[], labels: string[]): NutritionData {
  const foodLogs = logs.filter((l) => l.type === 'food' || l.type === 'feeding')
  if (foodLogs.length === 0) {
    return { eatQuality: { good: [0,0,0,0,0,0,0], little: [0,0,0,0,0,0,0], none: [0,0,0,0,0,0,0] }, mealFrequency: [0,0,0,0,0,0,0], topFoods: [], weekLabels: labels, hasData: false }
  }

  const good = new Array(7).fill(0)
  const little = new Array(7).fill(0)
  const none = new Array(7).fill(0)
  const mealFreq = new Array(7).fill(0)
  const foodCounts: Record<string, number> = {}

  for (const log of foodLogs) {
    const dayIdx = dates.indexOf(log.date)
    if (dayIdx === -1) continue

    mealFreq[dayIdx]++
    const val = parseValue(log.value)

    if (val && typeof val === 'object' && val.quality) {
      if (val.quality === 'ate_well') good[dayIdx]++
      else if (val.quality === 'ate_little') little[dayIdx]++
      else if (val.quality === 'did_not_eat') none[dayIdx]++

      // Track food names from notes or newFoodName
      if (val.newFoodName) {
        foodCounts[val.newFoodName] = (foodCounts[val.newFoodName] || 0) + 1
      }
    }

    // Track foods from notes field
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

  return { eatQuality: { good, little, none }, mealFrequency: mealFreq, topFoods, weekLabels: labels, hasData: true }
}

function buildSleepData(logs: ChildLog[], dates: string[], labels: string[]): SleepData {
  const sleepLogs = logs.filter((l) => l.type === 'sleep')
  if (sleepLogs.length === 0) {
    return { dailyHours: [0,0,0,0,0,0,0], qualityCounts: { great: 0, good: 0, restless: 0, poor: 0 }, weekLabels: labels, avgHours: 0, hasData: false }
  }

  const dailyHours = new Array(7).fill(0)
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
  for (const m of allMoods) dailyCounts[m] = new Array(7).fill(0)
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

  const weeklyFreq = new Array(7).fill(0)
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
    return { dailyCounts: [0,0,0,0,0,0,0], typeCounts: { pee: 0, poop: 0, mixed: 0 }, colorCounts: {}, weekLabels: labels, totalCount: 0, hasData: false }
  }

  const dailyCounts = new Array(7).fill(0)
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
  const totalGood = data.eatQuality.good.reduce((a, b) => a + b, 0)
  const totalLittle = data.eatQuality.little.reduce((a, b) => a + b, 0)
  const totalNone = data.eatQuality.none.reduce((a, b) => a + b, 0)

  if (totalMeals === 0) return { value: 0, label: 'no data', trend: 0, hasData: false }

  // Quality score (0-10): good=10pts, little=5pts, none=0pts
  const qualityScore = ((totalGood * 10 + totalLittle * 5) / totalMeals)

  // Frequency bonus: log at least 2 meals/day for 7 days = 14 total
  const daysWithData = data.mealFrequency.filter((m) => m > 0).length
  const freqBonus = Math.min(daysWithData / 7, 1) * 1.5 // up to 1.5 bonus

  // Variety bonus: more unique foods = better
  const varietyBonus = Math.min(data.topFoods.length / 5, 1) * 1.0

  const raw = Math.min(qualityScore + freqBonus + varietyBonus, 10)
  const value = Math.round(raw * 10) / 10

  // Simple trend: compare first half vs second half of week
  const firstHalf = data.eatQuality.good.slice(0, 3).reduce((a, b) => a + b, 0)
  const secondHalf = data.eatQuality.good.slice(4).reduce((a, b) => a + b, 0)
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

  // Consistency bonus: more days logged = better
  const daysWithSleep = data.dailyHours.filter((h) => h > 0).length
  const consistencyBonus = Math.min(daysWithSleep / 7, 1) * 1.5

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
    return { weeklySkips: [0,0,0,0,0,0,0], totalSkips: 0, skipRate: 0, mostSkipped: [], weekLabels: labels, hasData: false }
  }

  const weeklySkips = new Array(7).fill(0)
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
  const empty: ActivityData = { activeDays: 0, totalSessions: 0, totalMinutes: 0, uniqueTypes: [], dailySessions: new Array(7).fill(0), weekLabels: labels, hasData: false }
  if (activityLogs.length === 0) return empty

  const dailySessions = new Array(7).fill(0)
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

  // Base: active days this week (0–7) → 0–9 pts
  const base = (data.activeDays / 7) * 9
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

export function useKidsAnalytics(childId: string | 'all') {
  const children = useChildStore((s) => s.children)

  return useQuery<AnalyticsData>({
    queryKey: ['kids-analytics', childId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Get 30 days of data for broader context, 7-day window for charts
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const sinceDate = localDateStr(thirtyDaysAgo)

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
        .gte('date', sinceDate)
        .order('created_at', { ascending: true })
        .limit(1000)

      if (error) throw error

      const allLogs: ChildLog[] = (logs ?? []) as ChildLog[]
      const { dates, labels } = getLast7Days()

      const nutrition = buildNutritionData(allLogs, dates, labels)
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
        dateRange: { from: sinceDate, to: localDateStr(new Date()) },
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
