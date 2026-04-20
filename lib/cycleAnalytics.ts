/**
 * Cycle Analytics — reads cycle_logs and computes derived stats for the
 * pre-pregnancy analytics screen (CycleAnalytics + detail sheets).
 *
 * All hooks return React Query results. Empty states resolve to `null`
 * values so the UI can show a "Log your first cycle" nudge.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

// ─── Raw row shape ────────────────────────────────────────────────────────

export interface CycleLogRow {
  id: string
  user_id: string
  date: string                 // YYYY-MM-DD
  type:
    | 'period_start'
    | 'period_end'
    | 'ovulation'
    | 'symptom'
    | 'basal_temp'
    | 'intercourse'
    | 'cervical_mucus'
    | 'mood'
    | 'energy'
    | 'weight'
    | 'note'
  value: string | null
  notes: string | null
  created_at: string
}

// ─── Fetch ────────────────────────────────────────────────────────────────

async function fetchCycleLogs(): Promise<CycleLogRow[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data, error } = await supabase
    .from('cycle_logs')
    .select('id, user_id, date, type, value, notes, created_at')
    .eq('user_id', session.user.id)
    .order('date', { ascending: true })

  if (error) throw error
  return (data ?? []) as CycleLogRow[]
}

/** Base hook — all 5 stat hooks read the same cached list. */
export function useCycleLogs() {
  return useQuery({
    queryKey: ['cycleLogs'],
    queryFn: fetchCycleLogs,
    staleTime: 2 * 60 * 1000,
  })
}

// ─── Cycle History ────────────────────────────────────────────────────────

export interface Cycle {
  startDate: string        // YYYY-MM-DD (period_start date)
  endDate: string | null   // next period_start - 1 day, null if current open cycle
  lengthDays: number | null
}

export interface CycleHistory {
  cycles: Cycle[]
  avg: number | null
  min: number | null
  max: number | null
}

function computeCycleHistory(logs: CycleLogRow[]): CycleHistory {
  const starts = logs
    .filter((l) => l.type === 'period_start')
    .map((l) => l.date)
    .sort()

  if (starts.length === 0) return { cycles: [], avg: null, min: null, max: null }

  const cycles: Cycle[] = starts.map((startDate, i) => {
    const next = starts[i + 1]
    if (!next) return { startDate, endDate: null, lengthDays: null }
    const a = new Date(startDate + 'T00:00:00')
    const b = new Date(next + 'T00:00:00')
    const length = Math.round((b.getTime() - a.getTime()) / 86400000)
    const endDate = new Date(b.getTime() - 86400000)
    const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
    return { startDate, endDate: endStr, lengthDays: length }
  })

  const closed = cycles.filter((c) => c.lengthDays !== null).map((c) => c.lengthDays as number)
  if (closed.length === 0) return { cycles, avg: null, min: null, max: null }

  const avg = Math.round(closed.reduce((a, b) => a + b, 0) / closed.length)
  return { cycles, avg, min: Math.min(...closed), max: Math.max(...closed) }
}

export function useCycleHistory() {
  const { data: logs, ...rest } = useCycleLogs()
  return {
    ...rest,
    data: logs ? computeCycleHistory(logs) : undefined,
  }
}

// ─── Regularity ───────────────────────────────────────────────────────────

export interface Regularity {
  percent: number | null
  deviations: Array<{ cycleIdx: number; delta: number; lengthDays: number }>
}

export function useRegularity() {
  const { data: history, ...rest } = useCycleHistory()
  if (!history) return { ...rest, data: undefined }

  const closed = history.cycles
    .map((c, idx) => ({ c, idx }))
    .filter(({ c }) => c.lengthDays !== null)

  if (closed.length < 3 || history.avg === null) {
    return { ...rest, data: { percent: null, deviations: [] } satisfies Regularity }
  }

  const deviations = closed.map(({ c, idx }) => ({
    cycleIdx: idx + 1,
    delta: Math.abs((c.lengthDays as number) - (history.avg as number)),
    lengthDays: c.lengthDays as number,
  }))

  const regularCount = deviations.filter((d) => d.delta <= 2).length
  const percent = Math.round((regularCount / closed.length) * 100)

  return { ...rest, data: { percent, deviations } satisfies Regularity }
}

// ─── PMS Stats ────────────────────────────────────────────────────────────

export interface PMSStats {
  avgDays: number | null
  topSymptoms: Array<{ name: string; count: number }>
}

function computePMSStats(logs: CycleLogRow[], history: CycleHistory): PMSStats {
  const symptomLogs = logs.filter((l) => l.type === 'symptom')

  // Top symptoms — split comma-separated values (SymptomsForm saves them joined)
  const counts = new Map<string, number>()
  for (const log of symptomLogs) {
    if (!log.value) continue
    for (const raw of log.value.split(',')) {
      const name = raw.trim()
      if (!name) continue
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
  }
  const topSymptoms = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Avg PMS days: for each closed cycle, count distinct dates with a symptom log
  // in the last 7 days of the cycle.
  const closedCycles = history.cycles.filter((c) => c.lengthDays !== null && c.endDate !== null)
  if (closedCycles.length === 0) return { avgDays: null, topSymptoms }

  let totalPmsDays = 0
  for (const cycle of closedCycles) {
    const end = new Date(cycle.endDate as string + 'T00:00:00')
    const pmsStart = new Date(end.getTime() - 6 * 86400000) // last 7 days inclusive
    const pmsSet = new Set<string>()
    for (const log of symptomLogs) {
      const d = new Date(log.date + 'T00:00:00')
      if (d >= pmsStart && d <= end) pmsSet.add(log.date)
    }
    totalPmsDays += pmsSet.size
  }

  const avgDays = Math.round((totalPmsDays / closedCycles.length) * 10) / 10

  return { avgDays, topSymptoms }
}

export function usePMSStats() {
  const { data: logs, ...rest } = useCycleLogs()
  const { data: history } = useCycleHistory()
  if (!logs || !history) return { ...rest, data: undefined }
  return { ...rest, data: computePMSStats(logs, history) }
}
