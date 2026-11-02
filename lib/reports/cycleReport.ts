/**
 * Cycle report for the doctor — pure builder.
 *
 * Input is what the Cycle analytics already reads: `cycle_logs` rows
 * (`useCycleLogs`) and the derived cycle history (`useCycleHistory`). Symptom
 * phases reuse `computePMSStats` so a symptom is tagged with the same phase the
 * analytics show. Output is a generic ReportModel — dates, lengths, counts,
 * ranges and logged test results. No scores, no fertility or other
 * interpretation, no contraception claims.
 */

import { computePMSStats, type Cycle, type CycleHistory, type CycleLogRow } from '../cycleAnalytics'
import type { CyclePhase } from '../cycleLogic'
import { resolveSymptomId, symptomLabel, type SymptomId } from '../cycleSymptoms'
import { cToDisplay, tempLabel } from '../units'
import type { TempUnit } from '../../store/useUnitsStore'
import {
  average, capRows, formatReportDate, formatReportNumber, inPeriod, isRtl, isoDay,
  labelFor, periodStart, prettify, reportLabels,
  type ReportContext, type ReportModel, type ReportSection,
} from './reportKit'

export interface CycleReportInput {
  logs: CycleLogRow[]
  history: CycleHistory
  tempUnit?: TempUnit
}

const PHASES: CyclePhase[] = ['menstruation', 'follicular', 'ovulation', 'luteal']

// Existing translated labels for the cycle symptom ids.
const SYMPTOM_KEYS: Partial<Record<SymptomId, string>> = {
  cramps: 'cycleTracker_symptom_cramps',
  headache: 'cycleTracker_symptom_headache',
  bloated: 'cycleTracker_symptom_bloating',
  fatigue: 'cycleTracker_symptom_fatigue',
  nausea: 'cycleTracker_symptom_nausea',
  acne: 'cycleTracker_symptom_acne',
  'tender-breasts': 'cycleTracker_symptom_breastPain',
  'back-pain': 'preg_symptom_backPain',
  insomnia: 'preg_symptom_insomnia',
  cravings: 'preg_symptom_cravings',
  'low-mood': 'gn_meno_sym_low_mood',
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000)
}

/** Period length (days, inclusive) of a cycle from its period_end log, if logged. */
function periodLengthOf(cycle: Cycle, nextStart: string | undefined, ends: string[]): number | null {
  const end = ends.find((e) => e >= cycle.startDate && (!nextStart || e < nextStart) && daysBetween(cycle.startDate, e) <= 15)
  return end ? daysBetween(cycle.startDate, end) + 1 : null
}

export function buildCycleReport(input: CycleReportInput, ctx: ReportContext): ReportModel {
  const { t, locale } = ctx
  const today = ctx.today ?? new Date()
  const to = isoDay(today)
  const from = periodStart(ctx.period, today)
  const d = (iso: string) => formatReportDate(iso, locale)
  const n = (x: number, digits = 1) => formatReportNumber(x, locale, digits)
  const days = (x: number) => t('report_unit_days', { value: n(x) })

  const logs = input.logs.filter((l) => inPeriod(l.date, from, to))
  const all = input.history.cycles
  const ends = input.logs.filter((l) => l.type === 'period_end').map((l) => l.date).sort()

  const sections: ReportSection[] = []

  // ── Cycles: start, length, period length ─────────────────────────────────
  const cycles = all
    .map((c, i) => ({ c, periodDays: periodLengthOf(c, all[i + 1]?.startDate, ends) }))
    .filter(({ c }) => c.startDate <= to && (!from || (c.endDate ?? to) >= from))
  const closed = cycles.map(({ c }) => c.lengthDays).filter((x): x is number => x != null)
  const periodLens = cycles.map(({ periodDays }) => periodDays).filter((x): x is number => x != null)
  const avgCycle = average(closed)
  const avgPeriod = average(periodLens)
  sections.push({
    id: 'cycles',
    title: t('report_sec_cycles'),
    sticker: 'cal',
    count: cycles.length,
    summary: cycles.length
      ? [
          { label: t('report_sum_cyclesLogged'), value: String(cycles.length) },
          ...(avgCycle != null ? [{ label: t('report_sum_avgCycle'), value: days(avgCycle) }] : []),
          ...(closed.length > 1 ? [{ label: t('report_sum_cycleRange'), value: `${days(Math.min(...closed))} – ${days(Math.max(...closed))}` }] : []),
          ...(avgPeriod != null ? [{ label: t('report_sum_avgPeriod'), value: days(avgPeriod) }] : []),
          ...(periodLens.length > 1 ? [{ label: t('report_sum_periodRange'), value: `${days(Math.min(...periodLens))} – ${days(Math.max(...periodLens))}` }] : []),
        ]
      : [],
    table: {
      columns: [t('report_col_cycleStart'), t('report_col_cycleLength'), t('report_col_periodLength')],
      numeric: [1, 2],
      ...capRows([...cycles].reverse().map(({ c, periodDays }) => [
        d(c.startDate),
        c.lengthDays != null ? String(c.lengthDays) : t('report_inProgress'),
        periodDays != null ? String(periodDays) : '—',
      ]), t),
    },
  })

  // ── Symptoms by phase (phase tagging reused from computePMSStats) ─────────
  const symptomLogs = logs.filter((l) => l.type === 'symptom' && l.value)
  const names = new Map<string, number>()
  for (const l of symptomLogs) {
    for (const raw of (l.value ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
      names.set(raw, (names.get(raw) ?? 0) + 1)
    }
  }
  const symptomRows = [...names.keys()].map((name) => {
    const only = symptomLogs
      .filter((l) => (l.value ?? '').split(',').map((s) => s.trim()).includes(name))
      .map((l) => ({ ...l, value: name }))
    const stat = computePMSStats(only, input.history).topSymptoms[0]
    const id = resolveSymptomId(name)
    const label = labelFor(t, id ? SYMPTOM_KEYS[id] : null, id ? symptomLabel(id) : prettify(name))
    return { label, count: stat?.count ?? only.length, phases: stat?.phaseCounts }
  }).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  const occurrences = [...names.values()].reduce((a, b) => a + b, 0)
  sections.push({
    id: 'symptoms',
    title: t('report_sec_symptomsByPhase'),
    sticker: 'bubble',
    count: occurrences,
    summary: [],
    table: {
      columns: [t('report_col_symptom'), t('report_col_times'), ...PHASES.map((p) => t(`cycleRing_label_${p}` as const))],
      numeric: [1, 2, 3, 4, 5],
      ...capRows(symptomRows.map((s) => [s.label, String(s.count), ...PHASES.map((p) => String(s.phases?.[p] ?? 0))]), t),
    },
    note: t('report_cycle_phaseNote'),
  })

  // ── Basal body temperature ────────────────────────────────────────────────
  const unit = input.tempUnit ?? 'c'
  const bbt = logs
    .filter((l) => l.type === 'basal_temp')
    .map((l) => ({ date: l.date, c: Number(l.value) }))
    .filter((r) => Number.isFinite(r.c) && r.c > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
  const temps = bbt.map((r) => cToDisplay(r.c, unit))
  sections.push({
    id: 'bbt',
    title: t('report_sec_bbt'),
    sticker: 'thermo',
    count: bbt.length,
    summary: bbt.length
      ? [
          { label: t('report_sum_readings'), value: String(bbt.length) },
          ...(bbt.length > 1 ? [{ label: t('report_sum_range'), value: `${n(Math.min(...temps), 2)} – ${n(Math.max(...temps), 2)} ${tempLabel(unit)}` }] : []),
        ]
      : [],
    table: {
      columns: [t('report_col_date'), t('report_col_temp', { unit: tempLabel(unit) })],
      numeric: [1],
      ...capRows(bbt.map((r) => [d(r.date), n(cToDisplay(r.c, unit), 2)]), t),
    },
  })

  // ── LH tests ──────────────────────────────────────────────────────────────
  const lh = logs
    .filter((l) => l.type === 'lh' && l.value)
    .sort((a, b) => b.date.localeCompare(a.date))
  sections.push({
    id: 'lh',
    title: t('report_sec_lh'),
    sticker: 'otest',
    count: lh.length,
    summary: [],
    table: {
      columns: [t('report_col_date'), t('report_col_result')],
      ...capRows(lh.map((l) => [d(l.date), labelFor(t, `cycleLogForm_lh_${l.value}`, prettify(l.value ?? ''))]), t),
    },
  })

  const lastStart = all[all.length - 1]?.startDate
  const facts = lastStart ? [{ label: t('report_cycle_lastStart'), value: d(lastStart) }] : []

  const firstDate = [logs.map((l) => l.date).sort()[0], cycles[0]?.c.startDate]
    .filter((x): x is string => !!x)
    .sort()[0] ?? null

  return {
    behavior: 'pre-pregnancy',
    title: t('report_cycle_title'),
    facts,
    sections,
    labels: reportLabels(ctx, firstDate),
    rtl: isRtl(locale),
  }
}
