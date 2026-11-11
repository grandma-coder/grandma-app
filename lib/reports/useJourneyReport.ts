/**
 * Data hooks for the journey doctor reports. Each one reads data the app already
 * queries (no new tables) and hands it to the matching pure builder:
 *
 *   - Pregnancy: `pregnancy_logs` (same rows the analytics hooks read, all-time,
 *     filtered per period in the builder) + `useExams({ behavior: 'pregnancy' })`.
 *   - Cycle:     `useCycleLogs` + `useCycleHistory`.
 *   - Menopause: `useMenopauseLogs` + the menopause store.
 *
 * Fetching all-time once means switching 30 / 90 / All never refetches.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAllRows, supabase } from '../supabase'
import { useTranslation } from '../i18n'
import { useCycleHistory, useCycleLogs } from '../cycleAnalytics'
import { useMenopauseLogs } from '../menopauseAnalytics'
import { useExams } from '../examData'
import { getCurrentWeekFromDueDate } from '../pregnancyData'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { useMenopauseStore } from '../../store/useMenopauseStore'
import { useUnitsStore } from '../../store/useUnitsStore'
import type { ReportContext, ReportModel, ReportPeriod } from './reportKit'
import { buildPregnancyReport, PREGNANCY_REPORT_LOG_TYPES, type PregnancyReportLog } from './pregnancyReport'
import { buildCycleReport } from './cycleReport'
import { buildMenopauseReport } from './menopauseReport'

export interface JourneyReportResult {
  model: ReportModel | undefined
  /** First load only (no data yet). */
  isLoading: boolean
  error: unknown
}

function useReportContext(period: ReportPeriod): Omit<ReportContext, 'today'> {
  const { t, language } = useTranslation()
  return useMemo(() => ({ t, locale: language, period }), [t, language, period])
}

/** Every report-relevant pregnancy log, paged (a single select stopped at 1000 rows). */
export async function fetchPregnancyReportLogs(): Promise<PregnancyReportLog[]> {
  const { data: s } = await supabase.auth.getSession()
  const userId = s.session?.user.id
  if (!userId) return []
  return fetchAllRows<PregnancyReportLog>(() =>
    supabase
      .from('pregnancy_logs')
      .select('log_date, log_type, value, notes')
      .eq('user_id', userId)
      .in('log_type', [...PREGNANCY_REPORT_LOG_TYPES])
      .order('log_date', { ascending: true })
      .order('id', { ascending: true }),
  )
}

function usePregnancyReportLogs() {
  return useQuery({
    queryKey: ['pregnancy-report-logs'],
    queryFn: fetchPregnancyReportLogs,
    staleTime: 60_000,
  })
}

export function usePregnancyReport(period: ReportPeriod): JourneyReportResult {
  const ctx = useReportContext(period)
  const dueDate = usePregnancyStore((s) => s.dueDate)
  const storedWeek = usePregnancyStore((s) => s.weekNumber)
  const weightUnit = useUnitsStore((s) => s.weightUnit)
  const logs = usePregnancyReportLogs()
  const exams = useExams({ behavior: 'pregnancy' })
  const week = dueDate ? getCurrentWeekFromDueDate(dueDate) : (storedWeek ?? null)

  const model = useMemo(() => {
    if (!logs.data || !exams.data) return undefined
    return buildPregnancyReport({ week, dueDate, logs: logs.data, exams: exams.data, weightUnit }, ctx)
  }, [logs.data, exams.data, week, dueDate, weightUnit, ctx])

  return {
    model,
    isLoading: (logs.isLoading && !logs.data) || (exams.isLoading && !exams.data),
    error: logs.error ?? exams.error,
  }
}

export function useCycleReport(period: ReportPeriod): JourneyReportResult {
  const ctx = useReportContext(period)
  const tempUnit = useUnitsStore((s) => s.tempUnit)
  const logs = useCycleLogs()
  const history = useCycleHistory()

  const model = useMemo(() => {
    if (!logs.data || !history.data) return undefined
    return buildCycleReport({ logs: logs.data, history: history.data, tempUnit }, ctx)
  }, [logs.data, history.data, tempUnit, ctx])

  return { model, isLoading: logs.isLoading && !logs.data, error: logs.error }
}

export function useMenopauseReport(period: ReportPeriod): JourneyReportResult {
  const ctx = useReportContext(period)
  const hydrated = useMenopauseStore((s) => s.hydrated)
  const stage = useMenopauseStore((s) => s.stage)
  const lastPeriodDate = useMenopauseStore((s) => s.lastPeriodDate)
  const logs = useMenopauseLogs()

  const model = useMemo(() => {
    // Wait for the persisted store too — otherwise stage / months flash empty.
    if (!logs.data || !hydrated) return undefined
    return buildMenopauseReport({ rows: logs.data, stage, lastPeriodDate }, ctx)
  }, [logs.data, hydrated, stage, lastPeriodDate, ctx])

  return { model, isLoading: (logs.isLoading && !logs.data) || !hydrated, error: logs.error }
}
