/**
 * Cycle Analytics — reads cycle_logs and computes derived stats for the
 * pre-pregnancy analytics screen (CycleAnalytics + detail sheets).
 *
 * All hooks return React Query results. Empty states resolve to `null`
 * values so the UI can show a "Log your first cycle" nudge.
 */

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, fetchAllRows } from './supabase'
import { useModeStore } from '../store/useModeStore'
import { getCycleInfo, getDaysLate, phaseOnCycleDay, toDateStr, type CyclePhase, type CycleCalendarInput } from './cycleLogic'
import {
  getChecklistItems,
  getChecklistTitle,
  type ChecklistIntent,
} from './cycleChecklist'
import { useCycleSettingsStore } from '../store/useCycleSettingsStore'

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
    | 'lh'
    | 'opk_scan'
    | 'pregnancy_test'
    | 'sex_drive'
    | 'clots'
    | 'water'
    | 'activity'
  value: string | null
  notes: string | null
  created_at: string
}

// ─── Fetch ────────────────────────────────────────────────────────────────

async function fetchCycleLogs(): Promise<CycleLogRow[]> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  const session = sessionData.session
  if (!session) return []

  // Paged: a single select stops at 1000 rows, and oldest-first that dropped the newest logs.
  return fetchAllRows<CycleLogRow>(() =>
    supabase
      .from('cycle_logs')
      .select('id, user_id, date, type, value, notes, created_at')
      .eq('user_id', session.user.id)
      .order('date', { ascending: true })
      .order('id', { ascending: true }),
  )
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
  /** Last logged period_end within 14 days of this start (and before the next start), if any. */
  periodEnd?: string | null
}

export interface CycleHistory {
  cycles: Cycle[]
  avg: number | null
  min: number | null
  max: number | null
}

/** Starts closer than this to the previous one are the same period logged twice. */
const MIN_GAP_DAYS = 10
/** Cycle lengths kept for the average; outside this they're missed logs or a skipped month. */
const AVG_RANGE = { min: 15, max: 45 }  // matches the settings' cycle-length range
/** A period_end further than this from its start is a stray log, not the end of that period. */
const MAX_PERIOD_DAYS = 14

/** Whole local days between two 'YYYY-MM-DD' strings (rounded, so DST's 23/25h days count as 1). */
function dayDiff(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000)
}

export function computeCycleHistory(logs: CycleLogRow[]): CycleHistory {
  const sorted = [...new Set(logs
    .filter((l) => l.type === 'period_start')
    .map((l) => l.date))]
    .sort()
  // Period starts logged on consecutive days (or re-logged a few days in) made 1-day "cycles" that
  // dragged the average to the 21-day floor and moved ovulation to day 7. Merge them.
  const starts: string[] = []
  for (const d of sorted) {
    const prev = starts[starts.length - 1]
    if (prev && dayDiff(prev, d) < MIN_GAP_DAYS) continue
    starts.push(d)
  }

  if (starts.length === 0) return { cycles: [], avg: null, min: null, max: null }

  const ends = [...new Set(logs.filter((l) => l.type === 'period_end').map((l) => l.date))].sort()

  const cycles: Cycle[] = starts.map((startDate, i) => {
    const next = starts[i + 1]
    // The latest period_end inside this period (re-logging the end corrects it).
    const periodEnd = ends
      .filter((e) => e >= startDate && (!next || e < next) && dayDiff(startDate, e) < MAX_PERIOD_DAYS)
      .pop() ?? null
    if (!next) return { startDate, endDate: null, lengthDays: null, periodEnd }
    const length = dayDiff(startDate, next)
    const b = new Date(next + 'T12:00:00')
    const endDate = new Date(b.getFullYear(), b.getMonth(), b.getDate() - 1)
    return { startDate, endDate: toDateStr(endDate), lengthDays: length, periodEnd }
  })

  // A missed month logs as one ~56-day cycle; leave such outliers out of the average/min/max.
  const closed = cycles
    .filter((c) => c.lengthDays !== null)
    .map((c) => c.lengthDays as number)
    .filter((n) => n >= AVG_RANGE.min && n <= AVG_RANGE.max)
  if (closed.length === 0) return { cycles, avg: null, min: null, max: null }

  const avg = Math.round(closed.reduce((a, b) => a + b, 0) / closed.length)
  return { cycles, avg, min: Math.min(...closed), max: Math.max(...closed) }
}

export function useCycleHistory() {
  const { data: logs, ...rest } = useCycleLogs()
  // Memoised on the cached rows so consumers get a stable object between refetches.
  const data = useMemo(() => (logs ? computeCycleHistory(logs) : undefined), [logs])
  return { ...rest, data }
}

/**
 * Input for the calendar's per-day view (getCycleCalendarDay): the logged cycles plus the user's
 * settings — declared cycle length wins over the measured average, like the home ring.
 * `input` is undefined until the first load finishes.
 */
export function useCycleCalendarInput() {
  const { data: history, ...rest } = useCycleHistory()
  const cycleLength = useCycleSettingsStore((s) => s.cycleLength)
  const periodLength = useCycleSettingsStore((s) => s.periodLength)
  const lutealPhase = useCycleSettingsStore((s) => s.lutealPhase)
  const input = useMemo<CycleCalendarInput | undefined>(() => history
    ? { cycles: history.cycles, cycleLength: cycleLength ?? history.avg ?? 28, periodLength, lutealPhase }
    : undefined, [history, cycleLength, periodLength, lutealPhase])
  return { ...rest, input }
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

  // The ±2-day window is THIS APP'S display metric for "regular", not a
  // medical definition — ACOG tolerates ~7–9 days of cycle-to-cycle variation.
  const regularCount = deviations.filter((d) => d.delta <= 2).length
  const percent = Math.round((regularCount / closed.length) * 100)

  return { ...rest, data: { percent, deviations } satisfies Regularity }
}

// ─── PMS Stats ────────────────────────────────────────────────────────────
//
// Beyond a flat symptom-frequency count, we tag each symptom occurrence with
// the cycle phase it fell in (menstruation / follicular / ovulation / luteal)
// so the PMS detail sheet can answer "WHEN do my symptoms tend to show up?"
// rather than just "which symptoms are most common." Luteal-phase occurrences
// (the classic PMS window) additionally feed a days-before-next-period read.

const EMPTY_PHASE_COUNTS: Record<CyclePhase, number> = {
  menstruation: 0,
  follicular: 0,
  ovulation: 0,
  luteal: 0,
}

export interface SymptomPhaseStat {
  name: string
  count: number
  /** How many occurrences of this symptom fell in each cycle phase. */
  phaseCounts: Record<CyclePhase, number>
  /** Phase with the most occurrences, or null if none were taggable. */
  dominantPhase: CyclePhase | null
}

export interface PMSStats {
  avgDays: number | null
  topSymptoms: SymptomPhaseStat[]
  /** Dominant phase across ALL symptom occurrences (not just top 5). */
  overallDominantPhase: CyclePhase | null
  /** Typical days-before-next-period the symptoms land, from luteal occurrences. */
  avgDaysBeforePeriod: { min: number; max: number } | null
}

/** Period / luteal settings the PMS phase tagging uses (defaults = the app defaults). */
export interface PhaseSettings {
  periodLength: number
  lutealPhase: number
}
const DEFAULT_PHASE_SETTINGS: PhaseSettings = { periodLength: 5, lutealPhase: 14 }

/** Local YYYY-MM-DD `days` after `date` (calendar days, so DST's 23/25h days don't shift it). */
function addLocalDays(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

/** Local Date-math day difference on 'YYYY-MM-DD' strings (daysBetween isn't exported from cycleLogic.ts). */
function daysBetweenDates(dateA: string, dateB: string): number {
  return dayDiff(dateA, dateB)
}

/** Finds the cycle (closed or the trailing open one) that contains `logDate`. */
function findCycleForDate(history: CycleHistory, logDate: string): Cycle | null {
  for (const cycle of history.cycles) {
    if (logDate < cycle.startDate) continue
    if (cycle.endDate === null) {
      // Open cycle — any date on/after its start belongs here (checked last
      // below since cycles are in chronological order, an open cycle is
      // always the most recent one and dates within a later closed cycle
      // are excluded by their own startDate check above).
      return cycle
    }
    if (logDate <= cycle.endDate) return cycle
  }
  return null
}

export function computePMSStats(
  logs: CycleLogRow[],
  history: CycleHistory,
  settings: PhaseSettings = DEFAULT_PHASE_SETTINGS,
): PMSStats {
  const symptomLogs = logs.filter((l) => l.type === 'symptom')

  // Top symptoms — split comma-separated values (SymptomsForm saves them joined),
  // tagging each occurrence with the phase of the cycle it fell in.
  const phaseCountsByName = new Map<string, Record<CyclePhase, number>>()
  const countsByName = new Map<string, number>()
  const overallPhaseCounts: Record<CyclePhase, number> = { ...EMPTY_PHASE_COUNTS }
  const lutealDaysBeforePeriod: number[] = []

  for (const log of symptomLogs) {
    if (!log.value) continue
    const names = log.value.split(',').map((raw) => raw.trim()).filter(Boolean)
    if (names.length === 0) continue

    const cycle = findCycleForDate(history, log.date)
    let phase: CyclePhase | null = null
    if (cycle) {
      const cycleLength = cycle.lengthDays ?? history.avg ?? 28
      const cycleDay = daysBetweenDates(cycle.startDate, log.date) + 1
      // Past the expected length of the open cycle the period is late: no phase to tag (the home
      // and calendar pause there too), and "days before period" would come out negative.
      const late = cycle.lengthDays === null && cycleDay > cycleLength
      // Same phase math (and clamping) as the ring, with the user's period / luteal settings.
      if (!late) phase = phaseOnCycleDay(cycleDay, cycleLength, settings.periodLength, settings.lutealPhase)
      if (phase === 'luteal') {
        lutealDaysBeforePeriod.push(cycleLength - cycleDay + 1)
      }
    }

    for (const name of names) {
      countsByName.set(name, (countsByName.get(name) ?? 0) + 1)
      if (!phaseCountsByName.has(name)) phaseCountsByName.set(name, { ...EMPTY_PHASE_COUNTS })
      if (phase) {
        phaseCountsByName.get(name)![phase] += 1
        overallPhaseCounts[phase] += 1
      }
    }
  }

  const dominantPhaseOf = (counts: Record<CyclePhase, number>): CyclePhase | null => {
    let best: CyclePhase | null = null
    let bestCount = 0
    for (const phase of ['menstruation', 'follicular', 'ovulation', 'luteal'] as CyclePhase[]) {
      if (counts[phase] > bestCount) {
        best = phase
        bestCount = counts[phase]
      }
    }
    return best
  }

  const topSymptoms: SymptomPhaseStat[] = [...countsByName.entries()]
    .map(([name, count]) => {
      const phaseCounts = phaseCountsByName.get(name) ?? { ...EMPTY_PHASE_COUNTS }
      return { name, count, phaseCounts, dominantPhase: dominantPhaseOf(phaseCounts) }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const overallDominantPhase = dominantPhaseOf(overallPhaseCounts)

  // Typical days-before-period the luteal (PMS) occurrences land — reported as
  // a simple min..max range over the luteal occurrences (kept simple per spec;
  // not a statistical percentile). null when no luteal occurrences exist.
  const avgDaysBeforePeriod =
    lutealDaysBeforePeriod.length > 0
      ? {
          min: Math.max(1, Math.min(...lutealDaysBeforePeriod)),
          max: Math.max(...lutealDaysBeforePeriod),
        }
      : null

  // Avg PMS days: for each closed cycle, count distinct dates with a symptom log
  // in the last 7 days of the cycle.
  const closedCycles = history.cycles.filter((c) => c.lengthDays !== null && c.endDate !== null)
  if (closedCycles.length === 0) {
    return { avgDays: null, topSymptoms, overallDominantPhase, avgDaysBeforePeriod }
  }

  let totalPmsDays = 0
  for (const cycle of closedCycles) {
    const end = cycle.endDate as string
    // Last 7 days inclusive, by calendar date: subtracting 6×24h dropped the first day across DST.
    const pmsStart = addLocalDays(end, -6)
    const pmsSet = new Set<string>()
    for (const log of symptomLogs) {
      if (log.date >= pmsStart && log.date <= end) pmsSet.add(log.date)
    }
    totalPmsDays += pmsSet.size
  }

  const avgDays = Math.round((totalPmsDays / closedCycles.length) * 10) / 10

  return { avgDays, topSymptoms, overallDominantPhase, avgDaysBeforePeriod }
}

export function usePMSStats() {
  const logsQuery = useCycleLogs()
  const periodLength = useCycleSettingsStore((s) => s.periodLength)
  const lutealPhase = useCycleSettingsStore((s) => s.lutealPhase)
  const historyResult = useCycleHistory()
  const isLoading = logsQuery.isLoading || historyResult.isLoading
  const error = logsQuery.error ?? historyResult.error
  if (!logsQuery.data || !historyResult.data) {
    return { data: undefined, isLoading, error }
  }
  return {
    data: computePMSStats(logsQuery.data, historyResult.data, { periodLength, lutealPhase }),
    isLoading,
    error,
  }
}

// ─── Fertile Window ───────────────────────────────────────────────────────

export interface FertileWindow {
  current: { start: string; end: string; daysLeft: number } | null
  history: Array<{ start: string; end: string; cycleIdx: number }>
}

function formatFromCycleDay(cycleStart: string, dayOffset: number): string {
  const d = new Date(cycleStart + 'T00:00:00')
  d.setDate(d.getDate() + dayOffset)
  return toDateStr(d)
}

/** Settings the fertile-window / intercourse reads use (the subset of useCycleSettingsStore). */
export interface WindowSettings {
  cycleLength: number | null
  periodLength: number
  lutealPhase: number
}

/**
 * Same config as the home (declared settings win over the measured average), anchored on the
 * CURRENT cycle: anchoring on the last logged start left a past window with daysLeft 0 once that
 * cycle had ended without a new log. While the period is late there is no current window — the
 * home and calendar pause estimates until a new period is logged, so this does too.
 */
export function computeFertileWindow(history: CycleHistory, settings: WindowSettings, today: string): FertileWindow {
  if (history.cycles.length === 0) return { current: null, history: [] }

  const avgLen = settings.cycleLength ?? history.avg ?? 28
  const latestCycle = history.cycles[history.cycles.length - 1]
  const config = { lastPeriodStart: latestCycle.startDate, cycleLength: avgLen, periodLength: settings.periodLength, lutealPhase: settings.lutealPhase }

  let current: FertileWindow['current'] = null
  if (getDaysLate(config, today) === 0) {
    const info = getCycleInfo(config, today)
    const currentCycleStart = formatFromCycleDay(info.ovulationDate, -(info.ovulationDay - 1))
    const currentStart = formatFromCycleDay(currentCycleStart, info.fertileStart - 1)
    const currentEnd = formatFromCycleDay(currentCycleStart, info.fertileEnd - 1)
    const daysLeft = Math.max(0, dayDiff(today, currentEnd))
    current = { start: currentStart, end: currentEnd, daysLeft }
  }

  const pastWindows = history.cycles
    .slice(-4, -1) // last 3 closed cycles
    .filter((c) => c.lengthDays !== null)
    .map((c) => ({
      start: formatFromCycleDay(c.startDate, (c.lengthDays as number) - settings.lutealPhase - 5 - 1),
      end: formatFromCycleDay(c.startDate, (c.lengthDays as number) - settings.lutealPhase + 1 - 1),
      cycleIdx: history.cycles.indexOf(c) + 1,
    }))

  return { current, history: pastWindows }
}

export function useFertileWindow() {
  const { data: history, ...rest } = useCycleHistory()
  const settings = useCycleSettingsStore()
  if (!history) return { ...rest, data: { current: null, history: [] } satisfies FertileWindow }
  return { ...rest, data: computeFertileWindow(history, settings, toDateStr(new Date())) }
}

// ─── Mood Stats ───────────────────────────────────────────────────────────

// 'down' is written by the cycle MoodForm; it was missing here, so those entries were dropped
// from the average, the distribution and the recent list.
export type MoodId = 'great' | 'energetic' | 'good' | 'okay' | 'down' | 'low'

export interface MoodStats {
  /** 0–5 scale. Display as `*2` for "out of 10" if UI needs it. */
  avgScore: number | null
  distribution: Array<{ mood: MoodId; count: number }>
  recent: Array<{ mood: MoodId; date: string }>
}

const MOOD_SCORES: Record<MoodId, number> = {
  great: 5,
  energetic: 5,
  good: 4,
  okay: 3,
  down: 2,
  low: 2,
}
const MOOD_ORDER: MoodId[] = ['great', 'energetic', 'good', 'okay', 'down', 'low']

export function useMoodStats() {
  const { data: logs, ...rest } = useCycleLogs()
  if (!logs) return { ...rest, data: undefined }

  const moodLogs = logs.filter((l) => l.type === 'mood' && l.value)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)

  const recent30 = moodLogs.filter((l) => new Date(l.date + 'T00:00:00') >= thirtyDaysAgo)

  const validMoods = recent30
    .map((l) => l.value as MoodId)
    .filter((m): m is MoodId => m in MOOD_SCORES)

  const avgScore =
    validMoods.length > 0
      ? Math.round((validMoods.reduce((a, m) => a + MOOD_SCORES[m], 0) / validMoods.length) * 10) / 10
      : null

  const counts = new Map<MoodId, number>()
  MOOD_ORDER.forEach((m) => counts.set(m, 0))
  for (const l of moodLogs) {
    const m = l.value as MoodId
    if (m in MOOD_SCORES) counts.set(m, (counts.get(m) ?? 0) + 1)
  }
  const distribution = MOOD_ORDER.map((mood) => ({ mood, count: counts.get(mood) ?? 0 }))

  const recent = moodLogs
    .slice(-7)
    .reverse()
    .map((l) => ({ mood: l.value as MoodId, date: l.date }))
    .filter((r) => r.mood in MOOD_SCORES)

  return {
    ...rest,
    data: { avgScore, distribution, recent } satisfies MoodStats,
  }
}

// ─── BBT (basal body temperature) ──────────────────────────────────────────
//
// BBT rises ~0.3–0.5°C after ovulation (progesterone). Charting the biphasic
// shift is the classic at-home ovulation *confirmation*. We plot the current
// cycle's daily readings and detect the thermal-shift day: the first day whose
// temp exceeds the max of the previous 6 days by ≥ 0.2 and stays elevated.

export interface BBTStats {
  /** {day-of-cycle, temp} for the current (latest) cycle. */
  series: Array<{ cycleDay: number; date: string; temp: number }>
  /** cycle-day index of the detected thermal shift, or null. */
  shiftDay: number | null
  coverline: number | null
}

export function computeBBTStats(logs: CycleLogRow[], history: CycleHistory): BBTStats {
  const empty: BBTStats = { series: [], shiftDay: null, coverline: null }
  const latest = history.cycles[history.cycles.length - 1]
  if (!latest) return empty
  const start = new Date(latest.startDate + 'T00:00:00')

  const series = logs
    .filter((l) => l.type === 'basal_temp' && l.value != null)
    .map((l) => ({ date: l.date, temp: Number(l.value) }))
    .filter((r) => Number.isFinite(r.temp) && new Date(r.date + 'T00:00:00') >= start)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      ...r,
      cycleDay: Math.round((new Date(r.date + 'T00:00:00').getTime() - start.getTime()) / 86400000) + 1,
    }))

  if (series.length < 3) return { series, shiftDay: null, coverline: null }

  // Thermal shift: first reading > (max of prior 6) + 0.2 that holds.
  let shiftDay: number | null = null
  let coverline: number | null = null
  for (let i = 6; i < series.length; i++) {
    const prior = series.slice(Math.max(0, i - 6), i).map((r) => r.temp)
    const priorMax = Math.max(...prior)
    if (series[i].temp >= priorMax + 0.2) {
      shiftDay = series[i].cycleDay
      coverline = Math.round((priorMax + 0.1) * 10) / 10
      break
    }
  }
  return { series, shiftDay, coverline }
}

export function useBBTStats() {
  const logsQuery = useCycleLogs()
  const historyResult = useCycleHistory()
  const isLoading = logsQuery.isLoading || historyResult.isLoading
  const error = logsQuery.error ?? historyResult.error
  if (!logsQuery.data || !historyResult.data) return { data: undefined, isLoading, error }
  return { data: computeBBTStats(logsQuery.data, historyResult.data), isLoading, error }
}

// ─── Cervical mucus ─────────────────────────────────────────────────────────
//
// Mucus progresses dry → sticky → creamy → watery → egg-white toward ovulation;
// egg-white/watery are the peak-fertility signals. We surface the current
// cycle's daily observations + a count of fertile-quality days.

export type MucusType = 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite'
const MUCUS_ORDER: MucusType[] = ['dry', 'sticky', 'creamy', 'watery', 'eggwhite']
const MUCUS_FERTILE: Set<MucusType> = new Set(['watery', 'eggwhite'])

export interface MucusStats {
  series: Array<{ cycleDay: number; date: string; type: MucusType }>
  fertileDays: number
  peakDay: number | null
}

export function computeMucusStats(logs: CycleLogRow[], history: CycleHistory): MucusStats {
  const empty: MucusStats = { series: [], fertileDays: 0, peakDay: null }
  const latest = history.cycles[history.cycles.length - 1]
  if (!latest) return empty
  const start = new Date(latest.startDate + 'T00:00:00')

  const series = logs
    .filter((l) => l.type === 'cervical_mucus' && l.value != null && (MUCUS_ORDER as string[]).includes(l.value))
    .map((l) => ({ date: l.date, type: l.value as MucusType }))
    .filter((r) => new Date(r.date + 'T00:00:00') >= start)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      ...r,
      cycleDay: Math.round((new Date(r.date + 'T00:00:00').getTime() - start.getTime()) / 86400000) + 1,
    }))

  const fertileDays = series.filter((r) => MUCUS_FERTILE.has(r.type)).length
  const eggwhite = series.filter((r) => r.type === 'eggwhite')
  const peakDay = eggwhite.length ? eggwhite[eggwhite.length - 1].cycleDay : null
  return { series, fertileDays, peakDay }
}

export function useCervicalMucusStats() {
  const logsQuery = useCycleLogs()
  const historyResult = useCycleHistory()
  const isLoading = logsQuery.isLoading || historyResult.isLoading
  const error = logsQuery.error ?? historyResult.error
  if (!logsQuery.data || !historyResult.data) return { data: undefined, isLoading, error }
  return { data: computeMucusStats(logsQuery.data, historyResult.data), isLoading, error }
}

// ─── Intercourse (TTC timing) ───────────────────────────────────────────────
//
// For trying-to-conceive, the useful read is: did intercourse land in the
// fertile window? We count marks this cycle and how many fell inside the
// predicted fertile days.

export interface IntercourseStats {
  thisCycleCount: number
  inFertileWindow: number
  recent: Array<{ date: string; protectedSex: boolean; inFertile: boolean }>
}

export function computeIntercourseStats(
  logs: CycleLogRow[],
  history: CycleHistory,
  settings: WindowSettings = useCycleSettingsStore.getState(),
  today: string = toDateStr(new Date()),
): IntercourseStats {
  const empty: IntercourseStats = { thisCycleCount: 0, inFertileWindow: 0, recent: [] }
  const latest = history.cycles[history.cycles.length - 1]
  if (!latest) return empty
  const start = latest.startDate
  const avgLen = settings.cycleLength ?? history.avg ?? 28

  const info = getCycleInfo(
    { lastPeriodStart: latest.startDate, cycleLength: avgLen, periodLength: settings.periodLength, lutealPhase: settings.lutealPhase },
    today,
  )
  // Calendar-date bounds: start + n×24h landed at 01:00 after a spring-forward change, so a mark
  // on the window's first day (local midnight) read as outside it.
  const fertileStart = addLocalDays(start, info.fertileStart - 1)
  const fertileEnd = addLocalDays(start, info.fertileEnd - 1)

  const marks = logs
    .filter((l) => l.type === 'intercourse')
    .map((l) => ({ date: l.date, protectedSex: l.value === 'protected' }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const thisCycle = marks.filter((m) => m.date >= start)
  const withFertile = thisCycle.map((m) => ({ ...m, inFertile: m.date >= fertileStart && m.date <= fertileEnd }))

  return {
    thisCycleCount: withFertile.length,
    inFertileWindow: withFertile.filter((m) => m.inFertile).length,
    recent: withFertile.slice(-8).reverse(),
  }
}

export function useIntercourseStats() {
  const logsQuery = useCycleLogs()
  const historyResult = useCycleHistory()
  const isLoading = logsQuery.isLoading || historyResult.isLoading
  const error = logsQuery.error ?? historyResult.error
  if (!logsQuery.data || !historyResult.data) return { data: undefined, isLoading, error }
  return { data: computeIntercourseStats(logsQuery.data, historyResult.data), isLoading, error }
}

// ─── Cycle Intent (trying to conceive vs cycle health) ─────────────────────
//
// Onboarding stores `tryingToConceive` in the first period_start row's notes
// JSON (same source the notification engine reads). Returns 'ttc' | 'cycle' so
// the checklist + tips can reframe content. Defaults to 'cycle' (the neutral,
// non-assumptive framing) when nothing is logged or parsing fails.

export function useCycleIntent() {
  const { data: logs, ...rest } = useCycleLogs()
  // Onboarding with "I don't know" for the last period writes no log, so fall back to the on-device intent.
  let intent: ChecklistIntent = useModeStore.getState().cycleIntent === 'ttc' ? 'ttc' : 'cycle'
  if (logs) {
    const periodStart = logs.find((l) => l.type === 'period_start' && l.notes)
    if (periodStart?.notes) {
      try {
        const meta = JSON.parse(periodStart.notes)
        if (meta && typeof meta.tryingToConceive === 'boolean') intent = meta.tryingToConceive ? 'ttc' : 'cycle'
      } catch {
        // malformed notes — keep neutral default
      }
    }
  }
  return { ...rest, data: logs ? intent : undefined }
}

// ─── Checklist (completion state synced to cycle_checklist) ────────────────

export interface ChecklistDisplayItem {
  id: string
  title: string
  description: string
  category: string
  completed: boolean
}

export interface CycleChecklist {
  title: string
  items: ChecklistDisplayItem[]
}

/** Merges the static item set for the user's intent with completion state. */
export function useCycleChecklist() {
  const intentResult = useCycleIntent()
  const intent: ChecklistIntent = intentResult.data ?? 'cycle'

  const completedQuery = useQuery({
    queryKey: ['cycleChecklist'],
    queryFn: async (): Promise<Set<string>> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return new Set()
      const { data, error } = await supabase
        .from('cycle_checklist')
        .select('item_id, completed')
        .eq('user_id', user.id)
      if (error) throw error
      return new Set(
        (data ?? [])
          .filter((r: { item_id: string; completed: boolean }) => r.completed)
          .map((r: { item_id: string }) => r.item_id),
      )
    },
    staleTime: 30_000,
  })

  const done = completedQuery.data ?? new Set<string>()
  const items: ChecklistDisplayItem[] = getChecklistItems(intent).map((item) => ({
    ...item,
    completed: done.has(item.id),
  }))

  return {
    isLoading: intentResult.isLoading || completedQuery.isLoading,
    error: intentResult.error ?? completedQuery.error,
    data: { title: getChecklistTitle(intent), items } satisfies CycleChecklist,
  }
}

/** Toggle a checklist item's completion (upserts into cycle_checklist). */
export function useToggleChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const { error } = await supabase
        .from('cycle_checklist')
        .upsert(
          { user_id: user.id, item_id: itemId, completed, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,item_id' },
        )
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cycleChecklist'] })
    },
  })
}
