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

export interface GrowthData {
  weights: { value: number; date: string }[]
  heights: { value: number; date: string }[]
  hasData: boolean
}

export interface AnalyticsData {
  nutrition: NutritionData
  sleep: SleepData
  mood: MoodData
  health: HealthData
  growth: GrowthData
  totalLogs: number
  dateRange: { from: string; to: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLast7Days(): { dates: string[]; labels: string[] } {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dates: string[] = []
  const labels: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
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

    const moodKey = mood.toLowerCase()
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
      const sinceDate = thirtyDaysAgo.toISOString().split('T')[0]

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

      return {
        nutrition: buildNutritionData(allLogs, dates, labels),
        sleep: buildSleepData(allLogs, dates, labels),
        mood: buildMoodData(allLogs, dates, labels),
        health: buildHealthData(allLogs, dates, labels),
        growth: buildGrowthData(allLogs),
        totalLogs: allLogs.length,
        dateRange: { from: sinceDate, to: new Date().toISOString().split('T')[0] },
      }
    },
    staleTime: 60 * 1000,        // 1 min — charts feel live
    refetchOnWindowFocus: true,
    retry: 1,
  })
}
