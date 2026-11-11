/**
 * Menopause report for the doctor — pure builder.
 *
 * Input is what the Menopause analytics already reads: `menopause_logs` rows
 * (`useMenopauseLogs`) plus stage and last-period date from the menopause
 * store. Symptom totals reuse `computeSymptomStats`. Output is a generic
 * ReportModel — counts, logged severities (1–5) and per-day / per-week tables.
 * No scores, no interpretation, nothing about therapy.
 */

import { computeSymptomStats, type MenopauseLogRow } from '../menopauseAnalytics'
import { menopauseSymptomLabel, resolveMenopauseSymptomId, type MenopauseSymptomId } from '../menopauseSymptoms'
import { monthsSinceDate, type MenopauseStage } from '../menopauseStage'
import {
  average, capRows, formatReportDate, formatReportNumber, inPeriod, isRtl, isoDay,
  labelFor, periodStart, reportLabels,
  type ReportContext, type ReportModel, type ReportSection,
} from './reportKit'

export interface MenopauseReportInput {
  rows: MenopauseLogRow[]
  stage: MenopauseStage | null
  lastPeriodDate: string | null
}

const SLEEP_MOOD: MenopauseSymptomId[] = ['sleep', 'fatigue', 'low_mood', 'anxiety', 'brain_fog']

/** Monday of the week containing `iso` (YYYY-MM-DD). */
function weekStart(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  const back = (d.getDay() + 6) % 7
  return isoDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back, 12))
}

export function buildMenopauseReport(input: MenopauseReportInput, ctx: ReportContext): ReportModel {
  const { t, locale } = ctx
  const today = ctx.today ?? new Date()
  const to = isoDay(today)
  const from = periodStart(ctx.period, today)
  const d = (iso: string) => formatReportDate(iso, locale)
  const n = (x: number, digits = 1) => formatReportNumber(x, locale, digits)
  const label = (id: string) => labelFor(t, `gn_meno_sym_${id}`, menopauseSymptomLabel(id as MenopauseSymptomId))
  const sev = (avg: number) => (avg > 0 ? n(avg) : '—')

  const rows = input.rows.filter((r) => inPeriod(r.date, from, to))
  const symptomRows = rows
    .map((r) => ({ ...r, id: resolveMenopauseSymptomId(r.type) }))
    .filter((r): r is MenopauseLogRow & { id: MenopauseSymptomId } => r.id != null)

  const sections: ReportSection[] = []

  // ── Symptom totals ────────────────────────────────────────────────────────
  const stats = computeSymptomStats(rows)
  sections.push({
    id: 'symptoms',
    title: t('report_sec_symptoms'),
    sticker: 'headache',
    count: symptomRows.length,
    summary: [],
    table: {
      columns: [t('report_col_symptom'), t('report_col_times'), t('report_col_avgSeverity')],
      numeric: [1, 2],
      ...capRows(stats.map((s) => [label(s.id), String(s.count), sev(s.avgSeverity)]), t),
    },
  })

  // ── Symptoms by week ──────────────────────────────────────────────────────
  const weeks = new Map<string, { count: number; sev: number[] }>()
  for (const r of symptomRows) {
    const w = weekStart(r.date)
    const cur = weeks.get(w) ?? { count: 0, sev: [] }
    cur.count += 1
    if (r.severity != null && r.severity > 0) cur.sev.push(r.severity)
    weeks.set(w, cur)
  }
  const weekRows = [...weeks.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  sections.push({
    id: 'weekly',
    title: t('report_sec_weekly'),
    sticker: 'cal',
    count: weekRows.length,
    summary: [],
    table: {
      columns: [t('report_col_weekOf'), t('report_col_entries'), t('report_col_avgSeverity')],
      numeric: [1, 2],
      ...capRows(weekRows.map(([w, v]) => [d(w), String(v.count), sev(average(v.sev) ?? 0)]), t),
    },
  })

  // ── Hot flashes & night sweats per day ────────────────────────────────────
  const vaso = new Map<string, { hot: number; night: number }>()
  for (const r of symptomRows) {
    if (r.id !== 'hot_flash' && r.id !== 'night_sweat') continue
    const cur = vaso.get(r.date) ?? { hot: 0, night: 0 }
    if (r.id === 'hot_flash') cur.hot += 1
    else cur.night += 1
    vaso.set(r.date, cur)
  }
  const vasoDays = [...vaso.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  const hotPerDay = vasoDays.map(([, v]) => v.hot).filter((x) => x > 0)
  const hotTotal = hotPerDay.reduce((a, b) => a + b, 0)
  const nightTotal = vasoDays.reduce((a, [, v]) => a + v.night, 0)
  sections.push({
    id: 'vasomotor',
    title: t('report_sec_hotFlashes'),
    sticker: 'flame',
    count: hotTotal + nightTotal,
    summary: hotTotal + nightTotal > 0
      ? [
          { label: t('report_sum_hotFlashTotal'), value: String(hotTotal) },
          { label: t('report_sum_daysWithHotFlashes'), value: String(hotPerDay.length) },
          ...(hotPerDay.length ? [{ label: t('report_sum_hotFlashPerDay'), value: n(average(hotPerDay) ?? 0) }] : []),
          { label: t('report_sum_nightSweatTotal'), value: String(nightTotal) },
        ]
      : [],
    table: {
      columns: [t('report_col_date'), t('report_col_hotFlashes'), t('report_col_nightSweats')],
      numeric: [1, 2],
      ...capRows(vasoDays.map(([date, v]) => [d(date), String(v.hot), String(v.night)]), t),
    },
  })

  // ── Sleep & mood ──────────────────────────────────────────────────────────
  const sm = stats.filter((s) => SLEEP_MOOD.includes(s.id as MenopauseSymptomId))
  sections.push({
    id: 'sleepMood',
    title: t('report_sec_sleepMood'),
    sticker: 'moon',
    count: sm.reduce((a, s) => a + s.count, 0),
    summary: [],
    table: {
      columns: [t('report_col_symptom'), t('report_col_times'), t('report_col_avgSeverity')],
      numeric: [1, 2],
      ...capRows(sm.map((s) => [label(s.id), String(s.count), sev(s.avgSeverity)]), t),
    },
  })

  const months = monthsSinceDate(input.lastPeriodDate, today)
  const facts = [
    ...(input.stage ? [{ label: t('report_meno_stage'), value: t(`report_meno_stage_${input.stage}` as const) }] : []),
    ...(input.lastPeriodDate ? [{ label: t('report_meno_lastPeriod'), value: d(input.lastPeriodDate) }] : []),
    ...(months != null ? [{ label: t('report_meno_monthsSince'), value: String(months) }] : []),
  ]

  const firstDate = rows.map((r) => r.date).sort()[0] ?? null

  return {
    behavior: 'menopause',
    title: t('report_meno_title'),
    facts,
    sections,
    labels: reportLabels(ctx, firstDate),
    rtl: isRtl(locale),
  }
}
