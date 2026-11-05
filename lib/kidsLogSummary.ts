/**
 * One-line, fully localized summary of a kids log (feeding / food / sleep / diaper / activity /
 * temperature / mood / health). Reads the same label keys the kids log forms use, so the care
 * circle activity feed and the forms never disagree. Pure: pass `t` and the temperature unit.
 * Raw enum ids and JSON are never returned — unknown enum values are dropped.
 */
import { healthLogText } from './kidsHealthLogText'
import { sleepQualityLabel } from './sleepQuality'
import { cToDisplay, tempLabel } from './units'
import { clockLabel } from './timeFormat'
import type { TempUnit } from '../store/useUnitsStore'

type T = (key: any, params?: Record<string, any>) => string

const MEAL_KEY: Record<string, string> = {
  breakfast: 'kids_logForm_mealBreakfast', morning_snack: 'kids_logForm_mealAmSnack', lunch: 'kids_logForm_mealLunch',
  afternoon_snack: 'kids_logForm_mealPmSnack', dinner: 'kids_logForm_mealDinner', night_snack: 'kids_logForm_mealNight',
}
const FOOD_QUALITY_KEY: Record<string, string> = {
  ate_well: 'kids_logForm_ateWell', ate_little: 'kids_logForm_ateLittle', did_not_eat: 'kids_logForm_didNotEat',
}
const DIAPER_KEY: Record<string, string> = {
  pee: 'kids_logForm_diaperPee', poop: 'kids_logForm_diaperPoop', mixed: 'kids_logForm_diaperBoth',
}
const COLOR_KEY: Record<string, string> = {
  yellow: 'kids_logForm_diaperColorYellow', green: 'kids_logForm_diaperColorGreen', brown: 'kids_logForm_diaperColorBrown',
  black: 'kids_logForm_diaperColorBlack', orange: 'kids_logForm_diaperColorOrange', red: 'kids_logForm_diaperColorRed',
}
const CONSIST_KEY: Record<string, string> = {
  liquid: 'kids_logForm_diaperConsistLiquid', soft: 'kids_logForm_diaperConsistSoft',
  normal: 'kids_logForm_diaperConsistNormal', hard: 'kids_logForm_diaperConsistHard',
}
const ACTIVITY_KEY: Record<string, string> = {
  class: 'kids_logForm_activityClass', school: 'kids_logForm_activitySchool', study: 'kids_logForm_activityStudy',
  reading: 'kids_logForm_activityReading', sport: 'kids_logForm_activitySport', swim: 'kids_logForm_activitySwimming',
  dance: 'kids_logForm_activityDance', music: 'kids_logForm_activityMusic', art: 'kids_logForm_activityArt',
  playground: 'kids_logForm_activityPlayground', walk: 'kids_logForm_activityWalk', therapy: 'kids_logForm_activityTherapy',
  playdate: 'kids_logForm_activityPlaydate',
}
const MOOD_KEY: Record<string, string> = {
  happy: 'kids_logForm_moodHappy', calm: 'kids_logForm_moodCalm', fussy: 'kids_logForm_moodFussy',
  cranky: 'kids_logForm_moodCranky', energetic: 'kids_logForm_moodEnergetic',
}
const TYPE_KEY: Record<string, string> = {
  feeding: 'kids_calendar_labelFeeding', food: 'kids_calendar_labelFood', sleep: 'kids_calendar_labelSleep',
  diaper: 'kids_calendar_labelDiaper', mood: 'kids_calendar_labelMood', activity: 'kids_calendar_labelActivity',
  temperature: 'kids_calendar_labelTemperature', vaccine: 'kids_calendar_labelVaccine', medicine: 'kids_calendar_labelMedicine',
  health: 'kids_calendar_labelHealth', photo: 'kids_calendar_labelMemory', memory: 'kids_calendar_labelMemory',
  growth: 'kids_calendar_labelGrowth', milestone: 'kids_calendar_labelMilestone', note: 'kids_calendar_labelNote',
}

const norm = (x: unknown) => (typeof x === 'string' ? x.trim().toLowerCase() : '')
const known = (t: T, map: Record<string, string>, x: unknown): string | null => {
  const k = map[norm(x)]
  return k ? t(k) : null
}

/** Minutes from "45m", "2h", "10h 10m", "45 min", or a bare number (minutes when `bareUnit` is 'min', else hours). */
function toMinutes(raw: unknown, bareUnit: 'min' | 'h'): number | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return Math.round(bareUnit === 'h' ? raw * 60 : raw)
  const s = String(raw).toLowerCase()
  const h = /(\d+(?:\.\d+)?)\s*h/.exec(s)
  const m = /(\d+(?:\.\d+)?)\s*m/.exec(s)
  if (h || m) return Math.round((h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0))
  const n = Number(s.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? Math.round(bareUnit === 'h' ? n * 60 : n) : null
}

function durationLabel(t: T, raw: unknown, bareUnit: 'min' | 'h'): string | null {
  const mins = toMinutes(raw, bareUnit)
  if (!mins) return null
  return mins >= 60
    ? t('kp_kc_hm', { h: Math.floor(mins / 60), m: mins % 60 })
    : t('kp_pc_nMin', { n: mins })
}

/** Localized label for a stored activity type / diaper colour / consistency id; null when unknown. */
export function activityTypeLabel(t: T, raw: unknown): string | null { return known(t, ACTIVITY_KEY, raw) }
export function diaperColorLabel(t: T, raw: unknown): string | null { return known(t, COLOR_KEY, raw) }
export function diaperConsistencyLabel(t: T, raw: unknown): string | null { return known(t, CONSIST_KEY, raw) }

/** "Mood: Happy" style title for a mood log, or null when no readable mood. */
export function moodLabel(t: T, raw: unknown): string | null {
  const v = typeof raw === 'string' ? raw : (raw as any)?.mood
  return known(t, MOOD_KEY, v)
}

/** Title for a log type, e.g. "Diaper", "Breastfed", "Mood: Happy". */
export function kidsLogTitle(t: T, type: string, value: string | null): string {
  let v: any = null
  try { v = value ? JSON.parse(value) : null } catch { v = value }
  if (type === 'feeding' && v?.feedType === 'breast') return t('kp_kc_breastfed')
  if (type === 'feeding' && v?.feedType === 'bottle') return t('kids_home_feeding_modal_bottle')
  if (type === 'mood') {
    const m = moodLabel(t, v)
    if (m) return t('handoff_mood', { list: m })
  }
  const key = TYPE_KEY[type]
  return key ? t(key) : ''
}

export function kidsLogSummary(
  t: T, tempUnit: TempUnit, type: string, value: string | null, notes: string | null,
): string {
  const fallback = notes ?? ''
  if (!value) return fallback
  let v: any
  try { v = JSON.parse(value) } catch {
    // Not JSON: a bare reading ("37.2") or free text. Mood ids are shown in the title.
    if (type === 'mood') return ''
    if (type === 'temperature' && !Number.isNaN(Number(value))) return tempText(Number(value), tempUnit)
    return value
  }
  if (typeof v === 'number') return type === 'temperature' ? tempText(v, tempUnit) : String(v)
  if (typeof v !== 'object' || v === null) {
    if (type === 'mood') return ''
    return typeof v === 'string' ? v : fallback
  }
  const time = (x: unknown) => (typeof x === 'string' && x ? clockLabel(x) : null)
  const join = (parts: (string | null | false | undefined)[]) => parts.filter(Boolean).join(' · ') || fallback

  switch (type) {
    case 'feeding': {
      if (v.feedType === 'breast') {
        const side = norm(v.side)
        return join([
          t('kp_kc_breastfed'),
          side === 'left' ? t('kp_kc_left') : side === 'right' ? t('kp_kc_right') : side ? t('kids_logForm_diaperBoth') : null,
          durationLabel(t, v.duration, 'min'),
          time(v.time),
        ])
      }
      const ml = v.amount ? String(v.amount).replace(/[^\d.]/g, '') : ''
      return join([t('kids_home_feeding_modal_bottle'), ml && `${ml} ml`, time(v.time)])
    }
    case 'food':
      return join([
        known(t, MEAL_KEY, v.meal), known(t, FOOD_QUALITY_KEY, v.quality),
        v.estimatedCals ? `~${v.estimatedCals} ${t('common_kcal')}` : null, time(v.time),
      ])
    case 'sleep': {
      const range = v.startTime && v.endTime ? `${clockLabel(v.startTime)} – ${clockLabel(v.endTime)}`
        : v.startTime ? t('kids_summary_sleepStarted', { time: clockLabel(v.startTime) }) : null
      const q = sleepQualityLabel(v.quality)
      return join([range, durationLabel(t, v.duration, 'h'), q || null])
    }
    case 'diaper':
      return join([known(t, DIAPER_KEY, v.diaperType), known(t, COLOR_KEY, v.color), known(t, CONSIST_KEY, v.consistency), time(v.time)])
    case 'activity':
      return join([
        typeof v.name === 'string' && v.name.trim() ? v.name.trim() : known(t, ACTIVITY_KEY, v.activityType),
        v.startTime && v.endTime ? `${clockLabel(v.startTime)} – ${clockLabel(v.endTime)}` : null,
        durationLabel(t, v.duration, 'min'),
      ])
    case 'temperature': {
      const raw = v.value ?? v.temp ?? v.temperature
      const n = raw == null || raw === '' ? NaN : Number(raw)
      return Number.isFinite(n) ? tempText(n, tempUnit) : fallback
    }
    case 'mood':
      return ''
    default: {
      if (typeof v.name === 'string' && v.name.trim()) return v.name.trim()
      const { text } = healthLogText(value, notes)
      return text ?? fallback
    }
  }
}

function tempText(c: number, unit: TempUnit): string {
  return `${cToDisplay(c, unit).toFixed(1).replace(/\.0$/, '')}${tempLabel(unit)}`
}
