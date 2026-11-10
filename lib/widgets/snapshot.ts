/**
 * Pure builders for the home-screen widget snapshot (see ./types.ts). Every string is rendered
 * here in the app language; widgets only pick today's precomputed line.
 */
import { getCycleInfo, getDaysLate, toDateStr, DAILY_WATER_GOAL, type CycleConfig, type CyclePhase } from '../cycleLogic'
import { getCurrentWeekFromDueDate, getDaysToGo, localizedBabySize } from '../pregnancyData'
import { getUpcomingAppointment } from '../pregnancyAppointments'
import { MINOR_HIDDEN_CYCLE_LOGS } from '../ageRules'
import { t } from '../i18n'
import { useLanguageStore } from '../../store/useLanguageStore'
import { WIDGET_BUTTONS, buildHomeUrl, buildLogUrl, type WidgetJourney } from './deepLinks'
import type { WidgetButton, WidgetDay, WidgetEntry, WidgetStat } from './types'

/** Today plus the next 7 days — a widget stays right for a week without the app opening. */
export const WIDGET_DAYS = 8

export interface Ctx { now: Date; isMinor: boolean }

export interface CycleInput {
  /** null = no period logged yet. */
  config: CycleConfig | null
  logs: { date: string; type: string; value: string | null }[]
}

export interface PregnancyInput {
  dueDate: string | null
  /** Today's pregnancy_logs by log_type. */
  todayLogs: Record<string, { value: string | null }>
  fruitPng?: string
}

// ─── shared helpers ────────────────────────────────────────────────────────

export function dayAt(now: Date, offset: number): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12)
}

/** YYYY-MM-DD for each of the last 7 days, oldest first, ending today. */
export function last7(now: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => toDateStr(dayAt(now, i - 6)))
}

export function plural(key: string, n: number, params: Record<string, string | number> = {}): string {
  const k = (n === 1 ? `${key}_one` : key) as Parameters<typeof t>[0]
  return t(k, { n, ...params })
}

export function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const lang = useLanguageStore.getState().language
  return new Date(y, m - 1, d).toLocaleDateString(lang, { month: 'short', day: 'numeric' })
}

export function buttonsFor(journey: WidgetJourney, childId?: string): WidgetButton[] {
  return WIDGET_BUTTONS[journey].map((b) => ({ label: t(b.labelKey), url: buildLogUrl(journey, b.type, childId) }))
}

function baseEntry(journey: WidgetJourney, key: string, name: string, now: Date, childId?: string): WidgetEntry {
  return {
    key,
    journey,
    name,
    state: 'ok',
    days: [],
    todayFor: toDateStr(now),
    stats: [],
    buttons: buttonsFor(journey, childId),
    openUrl: buildHomeUrl(journey, childId),
  }
}

// ─── cycle ─────────────────────────────────────────────────────────────────

const PHASE_CODE: Record<CyclePhase, 'm' | 'f' | 'o' | 'l'> = {
  menstruation: 'm',
  follicular: 'f',
  ovulation: 'o',
  luteal: 'l',
}

/** Same scores as the app's mood stats (lib/cycleAnalytics.ts). */
const MOOD_SCORE: Record<string, number> = { great: 5, energetic: 5, good: 4, okay: 3, down: 2, low: 2 }

export function buildCycleEntry(input: CycleInput, ctx: Ctx): WidgetEntry {
  const { now, isMinor } = ctx
  const e = baseEntry('cycle', 'cycle', t('widget_name_cycle'), now)
  const today = toDateStr(now)
  const visibleLogs = isMinor ? input.logs.filter((l) => !MINOR_HIDDEN_CYCLE_LOGS.has(l.type)) : input.logs

  if (!input.config) {
    e.state = 'empty'
    e.emptyText = t('widget_empty_cycle')
    return e
  }
  const config = input.config

  for (let i = 0; i < WIDGET_DAYS; i++) {
    const date = toDateStr(dayAt(now, i))
    const info = getCycleInfo(config, date)
    const late = getDaysLate(config, date)
    const day: WidgetDay = late > 0
      ? {
          date,
          title: t('widget_cycleDayOnly', { day: info.cycleLength + late }),
          subtitle: plural('widget_periodLate', late),
        }
      : {
          date,
          title: t('widget_cycleDay', { day: info.cycleDay, len: info.cycleLength }),
          subtitle: `${info.phaseLabel} · ${plural('widget_periodIn', info.daysUntilPeriod)}`,
        }
    // Phase strip over this cycle: day k of the cycle is (date − (cycleDay − 1) + k).
    const start = dayAt(dayAt(now, i), -(info.cycleDay - 1))
    day.strip = {
      today: late > 0 ? info.cycleLength : info.cycleDay,
      length: info.cycleLength,
      phases: Array.from({ length: info.cycleLength }, (_, k) => PHASE_CODE[getCycleInfo(config, toDateStr(dayAt(start, k))).phase]),
    }
    e.days.push(day)
  }

  const info = getCycleInfo(config, today)
  const fertileFrom = toDateStr(dayAt(now, info.fertileStart - info.cycleDay))
  const fertileTo = toDateStr(dayAt(now, info.fertileEnd - info.cycleDay))
  e.stats = [
    { label: t('widget_stat_nextPeriod'), value: shortDate(info.nextPeriodDate), daily: false },
    { label: t('widget_stat_fertile'), value: `${shortDate(fertileFrom)}–${shortDate(fertileTo)}`, daily: false },
    { label: t('widget_stat_loggedToday'), value: String(visibleLogs.filter((l) => l.date === today).length), daily: true },
  ]

  const moodByDay = new Map<string, number>()
  for (const l of visibleLogs) {
    if (l.type === 'mood' && l.value && MOOD_SCORE[l.value]) moodByDay.set(l.date, MOOD_SCORE[l.value])
  }
  e.series = { label: t('widget_series_mood'), kind: 'moods', values: last7(now).map((d) => moodByDay.get(d) ?? 0) }
  return e
}

// ─── pregnancy ─────────────────────────────────────────────────────────────

export function buildPregnancyEntry(input: PregnancyInput, ctx: Ctx): WidgetEntry {
  const { now } = ctx
  const e = baseEntry('pregnancy', 'pregnancy', t('widget_name_pregnancy'), now)
  if (!input.dueDate) {
    e.state = 'empty'
    e.emptyText = t('widget_empty_pregnancy')
    return e
  }
  const dueDate = input.dueDate

  for (let i = 0; i < WIDGET_DAYS; i++) {
    const d = dayAt(now, i)
    const week = getCurrentWeekFromDueDate(dueDate, d)
    const toGo = getDaysToGo(dueDate, d)
    e.days.push({
      date: toDateStr(d),
      title: t('widget_pregWeeks', { n: week, fruit: localizedBabySize(week).toLowerCase() }),
      subtitle: toGo > 0 ? plural('widget_daysToGo', toGo) : t('widget_dueNow'),
      progress: Math.min(1, week / 40),
    })
  }

  const week = getCurrentWeekFromDueDate(dueDate, now)
  const kicks = Number(input.todayLogs.kick_count?.value ?? 0) || 0
  const water = Number(input.todayLogs.water?.value ?? 0) || 0
  const stats: WidgetStat[] = [
    { label: t('widget_stat_kicksToday'), value: String(kicks), daily: true },
    { label: t('widget_stat_waterToday'), value: `${water}/${DAILY_WATER_GOAL}`, daily: true },
  ]
  const appt = getUpcomingAppointment(week)
  if (appt) stats.push({ label: t('widget_stat_nextAppointment'), value: `${appt.name} · ${t('widget_weekShort', { n: appt.week })}`, daily: false })
  e.stats = stats
  if (input.fruitPng) e.image = input.fruitPng
  return e
}
