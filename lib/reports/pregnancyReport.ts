/**
 * Pregnancy report for the doctor — pure builder.
 *
 * Input is what the app already stores: `pregnancy_logs` rows (same columns the
 * analytics hooks read), the due date / week from the pregnancy store, and the
 * user's pregnancy exams (`useExams({ behavior: 'pregnancy' })`). Output is a
 * generic ReportModel (see reportKit) — counts, averages, ranges and tables of
 * what was logged. No scores, no interpretation.
 */

import type { PregnancyCalendarLog } from '../analyticsData'
import { kgToDisplay, weightLabel } from '../units'
import type { WeightUnit } from '../../store/useUnitsStore'
import {
  average, capRows, formatReportDate, formatReportNumber, inPeriod, isRtl, isoDay,
  labelFor, periodStart, prettify, reportLabels,
  type ReportContext, type ReportModel, type ReportSection,
} from './reportKit'

export type PregnancyReportLog = Pick<PregnancyCalendarLog, 'log_date' | 'log_type' | 'value' | 'notes'>

export interface PregnancyReportExam {
  title: string
  examDate: string
  provider: string | null
}

export interface PregnancyReportInput {
  /** Current pregnancy week (from the due date), if known. */
  week: number | null
  dueDate: string | null
  logs: PregnancyReportLog[]
  exams?: PregnancyReportExam[]
  weightUnit?: WeightUnit
}

/** The pregnancy log types the report reads. */
export const PREGNANCY_REPORT_LOG_TYPES = ['weight', 'symptom', 'kick_count', 'contraction', 'sleep', 'water', 'mood', 'appointment'] as const

// Symptom values are stored as the English label (PregnancyLogForms SYMPTOM_OPTIONS).
const SYMPTOM_KEYS: Record<string, string> = {
  nausea: 'preg_symptom_nausea',
  fatigue: 'preg_symptom_fatigue',
  backpain: 'preg_symptom_backPain',
  headache: 'preg_symptom_headache',
  swelling: 'preg_symptom_swelling',
  heartburn: 'preg_symptom_heartburn',
  insomnia: 'preg_symptom_insomnia',
  cramps: 'preg_symptom_cramps',
  moodswings: 'preg_symptom_moodSwings',
  cravings: 'preg_symptom_cravings',
  braxtonhicks: 'preg_symptom_braxtonHicks',
  shortnessofbreath: 'preg_symptom_shortBreath',
}

const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '')

function num(v: string | null | undefined): number | null {
  if (v == null) return null
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function jsonNotes(notes: string | null | undefined): Record<string, unknown> {
  if (!notes) return {}
  try {
    const o = JSON.parse(notes)
    return o && typeof o === 'object' ? (o as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/** Count occurrences per label, sorted by count desc then label. */
function tally(values: { label: string; date: string }[]): { label: string; count: number; last: string }[] {
  const acc = new Map<string, { count: number; last: string }>()
  for (const v of values) {
    const cur = acc.get(v.label) ?? { count: 0, last: v.date }
    cur.count += 1
    if (v.date > cur.last) cur.last = v.date
    acc.set(v.label, cur)
  }
  return [...acc.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export function buildPregnancyReport(input: PregnancyReportInput, ctx: ReportContext): ReportModel {
  const { t, locale } = ctx
  const today = ctx.today ?? new Date()
  const to = isoDay(today)
  const from = periodStart(ctx.period, today)
  const d = (iso: string) => formatReportDate(iso, locale)
  const n = (x: number, digits = 1) => formatReportNumber(x, locale, digits)

  const logs = input.logs
    .filter((l) => inPeriod(l.log_date, from, to))
    .slice()
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
  const ofType = (type: string) => logs.filter((l) => l.log_type === type)

  const sections: ReportSection[] = []

  // ── Weight ────────────────────────────────────────────────────────────────
  const unit = input.weightUnit ?? 'kg'
  const weights = ofType('weight')
    .map((l) => ({ date: l.log_date, kg: num(l.value) }))
    .filter((w): w is { date: string; kg: number } => w.kg != null && w.kg > 0)
  const wFmt = (kg: number) => `${n(kgToDisplay(kg, unit))} ${weightLabel(unit)}`
  const weightSummary = weights.length
    ? [
        { label: t('report_sum_first'), value: `${wFmt(weights[0].kg)} · ${d(weights[0].date)}` },
        { label: t('report_sum_latest'), value: `${wFmt(weights[weights.length - 1].kg)} · ${d(weights[weights.length - 1].date)}` },
        ...(weights.length > 1
          ? [{
              label: t('report_sum_change'),
              value: (() => {
                const delta = kgToDisplay(weights[weights.length - 1].kg, unit) - kgToDisplay(weights[0].kg, unit)
                return `${delta > 0 ? '+' : ''}${n(delta)} ${weightLabel(unit)}`
              })(),
            }]
          : []),
      ]
    : []
  const weightRows = capRows([...weights].reverse().map((w) => [d(w.date), n(kgToDisplay(w.kg, unit))]), t)
  sections.push({
    id: 'weight',
    title: t('report_sec_weight'),
    sticker: 'scale',
    count: weights.length,
    summary: weightSummary,
    table: { columns: [t('report_col_date'), t('report_col_weight', { unit: weightLabel(unit) })], numeric: [1], ...weightRows },
  })

  // ── Symptoms ──────────────────────────────────────────────────────────────
  const symptomValues = ofType('symptom').flatMap((l) =>
    (l.value ?? '').split(',').map((s) => s.trim()).filter(Boolean).map((raw) => ({
      label: labelFor(t, SYMPTOM_KEYS[norm(raw)], prettify(raw)),
      date: l.log_date,
    })),
  )
  const symptoms = tally(symptomValues)
  sections.push({
    id: 'symptoms',
    title: t('report_sec_symptoms'),
    sticker: 'headache',
    count: symptomValues.length,
    summary: [],
    table: {
      columns: [t('report_col_symptom'), t('report_col_times'), t('report_col_lastLogged')],
      numeric: [1],
      ...capRows(symptoms.map((s) => [s.label, String(s.count), d(s.last)]), t),
    },
  })

  // ── Kick counts ───────────────────────────────────────────────────────────
  const kicks = ofType('kick_count')
    .map((l) => {
      const mins = num(String(jsonNotes(l.notes).durationMinutes ?? ''))
      return { date: l.log_date, kicks: num(l.value), minutes: mins }
    })
    .filter((k): k is { date: string; kicks: number; minutes: number | null } => k.kicks != null && k.kicks > 0)
  const avgKicks = average(kicks.map((k) => k.kicks))
  sections.push({
    id: 'kicks',
    title: t('report_sec_kicks'),
    sticker: 'foot',
    count: kicks.length,
    summary: kicks.length
      ? [
          { label: t('report_sum_sessions'), value: String(kicks.length) },
          ...(avgKicks != null ? [{ label: t('report_sum_avgKicks'), value: n(avgKicks) }] : []),
        ]
      : [],
    table: {
      columns: [t('report_col_date'), t('report_col_kicks'), t('report_col_minutes')],
      numeric: [1, 2],
      ...capRows([...kicks].reverse().map((k) => [d(k.date), String(k.kicks), k.minutes != null ? n(k.minutes, 0) : '—']), t),
    },
  })

  // ── Contractions (value = duration in seconds, notes.intervalMin) ─────────
  const contractionLogs = ofType('contraction')
  const byDay = new Map<string, { count: number; durations: number[]; intervals: number[] }>()
  for (const l of contractionLogs) {
    const cur = byDay.get(l.log_date) ?? { count: 0, durations: [], intervals: [] }
    cur.count += 1
    const dur = num(l.value)
    if (dur != null && dur > 0) cur.durations.push(dur)
    const interval = num(String(jsonNotes(l.notes).intervalMin ?? ''))
    if (interval != null && interval > 0) cur.intervals.push(interval)
    byDay.set(l.log_date, cur)
  }
  const contractionDays = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  sections.push({
    id: 'contractions',
    title: t('report_sec_contractions'),
    sticker: 'stopwatch',
    count: contractionLogs.length,
    summary: contractionLogs.length ? [{ label: t('report_sum_total'), value: String(contractionLogs.length) }] : [],
    table: {
      columns: [t('report_col_date'), t('report_col_contractions'), t('report_col_avgDuration'), t('report_col_avgInterval')],
      numeric: [1, 2, 3],
      ...capRows(contractionDays.map(([date, v]) => {
        const dur = average(v.durations)
        const iv = average(v.intervals)
        return [d(date), String(v.count), dur != null ? n(dur, 0) : '—', iv != null ? n(iv) : '—']
      }), t),
    },
  })

  // ── Sleep ─────────────────────────────────────────────────────────────────
  const sleep = ofType('sleep').map((l) => num(l.value)).filter((h): h is number => h != null && h > 0)
  const avgSleep = average(sleep)
  sections.push({
    id: 'sleep',
    title: t('report_sec_sleep'),
    sticker: 'moon',
    count: sleep.length,
    summary: sleep.length
      ? [
          { label: t('report_sum_nights'), value: String(sleep.length) },
          { label: t('report_sum_avgPerNight'), value: t('report_unit_hours', { value: n(avgSleep ?? 0) }) },
          { label: t('report_sum_range'), value: `${t('report_unit_hours', { value: n(Math.min(...sleep)) })} – ${t('report_unit_hours', { value: n(Math.max(...sleep)) })}` },
        ]
      : [],
  })

  // ── Water ─────────────────────────────────────────────────────────────────
  const waterByDay = new Map<string, number>()
  for (const l of ofType('water')) {
    const g = num(l.value)
    if (g == null || g < 0) continue
    // A day's water is saved as the running total — keep the highest value.
    waterByDay.set(l.log_date, Math.max(waterByDay.get(l.log_date) ?? 0, g))
  }
  const water = [...waterByDay.values()]
  sections.push({
    id: 'water',
    title: t('report_sec_water'),
    sticker: 'glass',
    count: water.length,
    summary: water.length
      ? [
          { label: t('report_sum_daysLogged'), value: String(water.length) },
          { label: t('report_sum_avgPerDay'), value: t('report_unit_glasses', { value: n(average(water) ?? 0) }) },
        ]
      : [],
  })

  // ── Mood ──────────────────────────────────────────────────────────────────
  const moodValues = ofType('mood')
    .filter((l) => !!l.value)
    .map((l) => ({ label: labelFor(t, `preg_mood_${String(l.value).trim().toLowerCase()}`, prettify(String(l.value))), date: l.log_date }))
  const moods = tally(moodValues)
  sections.push({
    id: 'mood',
    title: t('report_sec_mood'),
    sticker: 'face3',
    count: moodValues.length,
    summary: [],
    table: {
      columns: [t('report_col_mood'), t('report_col_times'), t('report_col_lastLogged')],
      numeric: [1],
      ...capRows(moods.map((m) => [m.label, String(m.count), d(m.last)]), t),
    },
  })

  // ── Exams & appointments (exam records + logged appointments) ────────────
  const visits = [
    ...(input.exams ?? []).map((e) => ({ date: e.examDate, item: e.title, provider: e.provider })),
    ...ofType('appointment').map((l) => {
      const doctor = jsonNotes(l.notes).doctor
      return { date: l.log_date, item: l.value ?? '', provider: typeof doctor === 'string' ? doctor : null }
    }),
  ]
    .filter((v) => inPeriod(v.date, from, to))
    .sort((a, b) => b.date.localeCompare(a.date))
  sections.push({
    id: 'exams',
    title: t('report_sec_exams'),
    sticker: 'doc',
    count: visits.length,
    summary: [],
    table: {
      columns: [t('report_col_date'), t('report_col_exam'), t('report_col_provider')],
      ...capRows(visits.map((v) => [d(v.date), v.item.trim() || '—', v.provider?.trim() || '—']), t),
    },
  })

  const facts = [
    ...(input.week != null ? [{ label: t('report_preg_week'), value: String(input.week) }] : []),
    ...(input.dueDate ? [{ label: t('report_preg_dueDate'), value: d(input.dueDate) }] : []),
  ]

  const firstDate = [logs[0]?.log_date, visits[visits.length - 1]?.date].filter((x): x is string => !!x).sort()[0] ?? null

  return {
    behavior: 'pregnancy',
    title: t('report_preg_title'),
    facts,
    sections,
    labels: reportLabels(ctx, firstDate),
    rtl: isRtl(locale),
  }
}
