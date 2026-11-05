/**
 * One localized, per-type summary of a pregnancy log. Used by the calendar
 * timeline rows AND the log detail popup so a value reads the same everywhere.
 *
 * Pure: the translator, the weight unit and the id→label lookups are injected.
 * Never returns raw JSON or English enum ids (unknown ids are dropped).
 */
import { kgToDisplay, weightLabel } from './units'
import type { WeightUnit } from '../store/useUnitsStore'
import { healthLogText } from './kidsHealthLogText'

export interface PregSummaryDeps {
  t: (key: any, params?: Record<string, string | number>) => string
  weightUnit: WeightUnit
  /** Stored mood id ('happy') → label, undefined when unknown. */
  moodLabel: (id: string) => string | undefined
  /** Stored option id ('Back pain', 'Yoga', 'Iron'…) → label; returns the id itself when unmapped. */
  optionLabel: (id: string) => string
}

export interface PregLogDisplay {
  /** Big number / text (popup hero). */
  metric: string
  /** Unit shown next to the metric; '' for text values. */
  unit: string
  isText: boolean
  /** Single-line summary for timeline rows. '' when nothing readable. */
  summary: string
}

type LogLike = { log_type: string; value: string | null; notes?: string | null }

function parseObj(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  } catch { return {} }
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')

export function pregnancyLogDisplay(log: LogLike, d: PregSummaryDeps): PregLogDisplay {
  const { t } = d
  const raw = (log.value ?? '').trim()
  const valueObj = parseObj(raw)
  const notesObj = parseObj(log.notes)
  const plural = (base: string, n: number) => t(n === 1 ? `${base}_one` : `${base}_other`)
  const num = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : null }
  const text = (metric: string): PregLogDisplay => ({ metric, unit: '', isText: true, summary: metric })
  const withUnit = (metric: string, unit: string): PregLogDisplay => ({
    metric, unit, isText: false, summary: metric ? (unit ? `${metric} ${unit}` : metric) : '',
  })
  const empty: PregLogDisplay = { metric: '', unit: '', isText: true, summary: '' }

  switch (log.log_type) {
    case 'mood': {
      const id = (str(valueObj.mood) || raw).toLowerCase()
      const label = d.moodLabel(id)
      return label ? text(label) : empty
    }
    case 'sleep': {
      const n = num(raw)
      return n === null ? empty : withUnit(String(n), t(n === 1 ? 'kp_u_hour' : 'kp_u_hours'))
    }
    case 'weight': {
      const kg = num(raw)
      return kg === null ? empty : withUnit(kgToDisplay(kg, d.weightUnit).toFixed(1), weightLabel(d.weightUnit))
    }
    case 'water': {
      const n = num(raw)
      return n === null ? empty : withUnit(String(n), plural('preg_unit_glasses', n))
    }
    case 'vitamins': {
      const taken = raw === '1' || raw === 'true'
      return { metric: taken ? '✓' : '—', unit: '', isText: false, summary: t(taken ? 'preg_sum_vitaminsTaken' : 'preg_sum_vitaminsNotTaken') }
    }
    case 'kick_count': {
      const n = num(raw)
      return n === null ? empty : withUnit(String(n), plural('preg_unit_kicks', n))
    }
    case 'exercise': {
      const n = num(raw)
      const kind = str(notesObj.type) ? d.optionLabel(str(notesObj.type)) : ''
      if (n === null) return kind ? text(kind) : empty
      const base = withUnit(String(n), t('kp_u_min'))
      return kind ? { ...base, summary: `${kind} · ${base.summary}` } : base
    }
    case 'contraction': {
      const n = num(raw)
      return n === null ? empty : withUnit(String(n), t('kp_u_sec'))
    }
    case 'kegel': {
      const n = num(raw)
      return n === null ? empty : withUnit(String(n), t(n === 1 ? 'kp_u_set' : 'kp_u_sets'))
    }
    case 'symptom':
    case 'nutrition': {
      const items = raw.split(',').map((s) => s.trim()).filter(Boolean).map(d.optionLabel)
      return items.length ? text(items.join(', ')) : empty
    }
    case 'appointment':
      return raw ? text(d.optionLabel(raw)) : empty
    case 'nesting':
    case 'birth_prep': {
      const title = str(notesObj.title)
      return title ? text(d.optionLabel(title)) : empty
    }
    default: {
      // exam_result and unknown shapes: readable text only, never raw JSON.
      const h = healthLogText(log.value, null).text
      return h ? text(h) : empty
    }
  }
}

export function pregnancyLogSummary(log: LogLike, d: PregSummaryDeps): string {
  return pregnancyLogDisplay(log, d).summary
}
