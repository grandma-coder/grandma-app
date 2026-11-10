/**
 * Pure builders for the home-screen widget snapshot (see ./types.ts). Every string is rendered
 * here in the app language; widgets only pick today's precomputed line.
 */
import { getCycleInfo, getDaysLate, toDateStr, DAILY_WATER_GOAL, type CycleConfig, type CyclePhase } from '../cycleLogic'
import { getCurrentWeekFromDueDate, getDaysToGo, localizedBabySize } from '../pregnancyData'
import { getTrimester } from '../pregnancyWeeks'
import { getUpcomingAppointment } from '../pregnancyAppointments'
import { MINOR_HIDDEN_CYCLE_LOGS } from '../ageRules'
import { t } from '../i18n'
import { useLanguageStore } from '../../store/useLanguageStore'
import { formatChildAge } from '../childAge'
import { getNextDueVaccines, type HealthRecord } from '../vaccineSchedule'
import { latestPeriodDate, monthsSinceDate, type MenopauseStage } from '../menopauseStage'
import { menopauseSymptomLabel, resolveMenopauseSymptomId, type MenopauseSymptomId } from '../menopauseSymptoms'
import type { JourneyMode } from '../../types'
import { WIDGET_BUTTONS, buildHomeUrl, buildLogUrl, modeToJourney, type WidgetJourney } from './deepLinks'
import { WIDGET_SNAPSHOT_VERSION, type WidgetButton, type WidgetDay, type WidgetEntry, type WidgetSnapshot, type WidgetStat } from './types'

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

export function capitalize(s: string): string {
  return s ? s[0].toLocaleUpperCase() + s.slice(1) : s
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
          hero: { eyebrow: t('widget_eb_cycleDay'), big: String(info.cycleLength + late), unit: '', caption: plural('widget_periodLate', late), footer: '' },
        }
      : {
          date,
          title: t('widget_cycleDay', { day: info.cycleDay, len: info.cycleLength }),
          subtitle: `${info.phaseLabel} · ${plural('widget_periodIn', info.daysUntilPeriod)}`,
          hero: {
            eyebrow: t('widget_eb_cycleDay'),
            big: String(info.cycleDay),
            unit: t('widget_ofLen', { len: info.cycleLength }),
            caption: info.phaseLabel,
            footer: capitalize(plural('widget_periodIn', info.daysUntilPeriod)),
          },
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
    const fruit = localizedBabySize(week).toLowerCase()
    const footer = toGo > 0 ? plural('widget_daysToGo', toGo) : t('widget_dueNow')
    e.days.push({
      date: toDateStr(d),
      title: t('widget_pregWeeks', { n: week, fruit }),
      subtitle: footer,
      progress: Math.min(1, week / 40),
      hero: { eyebrow: t('widget_eb_week', { n: week, tri: getTrimester(week) }), big: String(week), unit: t('widget_unit_wks'), caption: t('widget_sizeOf', { fruit }), footer },
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

// ─── kids ──────────────────────────────────────────────────────────────────

export interface KidLog { date: string; type: string; value: string | null; created_at: string }
export interface KidInput { id: string; name: string; birthDate: string; countryCode?: string }

const FEED_TYPES = new Set(['feeding', 'food'])

function sleepDuration(value: string | null): string | null {
  if (!value) return null
  try {
    const d = (JSON.parse(value) as { duration?: unknown }).duration
    return typeof d === 'string' && d ? d : null
  } catch {
    return null
  }
}

export function buildKidsEntry(child: KidInput, logs: KidLog[], given: HealthRecord[], ctx: Ctx): WidgetEntry {
  const { now } = ctx
  const e = baseEntry('kids', `kids:${child.id}`, child.name, now, child.id)
  const today = toDateStr(now)
  const byNewest = [...logs].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  const lastSleep = byNewest.find((l) => l.type === 'sleep')
  const slept = lastSleep ? sleepDuration(lastSleep.value) : null
  const lastFeed = byNewest.find((l) => FEED_TYPES.has(l.type))

  for (let i = 0; i < WIDGET_DAYS; i++) {
    const d = dayAt(now, i)
    const age = formatChildAge(child.birthDate, d)
    const footer = slept ? capitalize(t('widget_kidsSlept', { d: slept })) : ''
    e.days.push({
      date: toDateStr(d),
      title: `${child.name} · ${age}`,
      subtitle: slept ? t('widget_kidsSlept', { d: slept }) : '',
      // With a feed logged the hero is the live "2h since last feed"; without one, the child's age.
      hero: lastFeed
        ? { eyebrow: `${child.name} · ${age}`, big: '', unit: '', caption: t('widget_sinceLastFeed'), footer, live: true }
        : { eyebrow: child.name, big: age, unit: '', caption: '', footer },
    })
  }
  // Normalised to ms + Z: Supabase sends microseconds and an offset, which iOS parsing doesn't reliably accept.
  if (lastFeed) e.sinceLast = { label: t('widget_sinceLastFeed'), at: new Date(lastFeed.created_at).toISOString() }

  const feedsOn = (date: string) => logs.filter((l) => l.date === date && FEED_TYPES.has(l.type)).length
  e.series = { label: t('widget_series_feeds'), kind: 'bars', values: last7(now).map(feedsOn) }
  e.stats = [
    { label: t('widget_stat_feedsToday'), value: String(feedsOn(today)), daily: true },
    { label: t('widget_stat_diapersToday'), value: String(logs.filter((l) => l.date === today && l.type === 'diaper').length), daily: true },
  ]
  const vaccine = getNextDueVaccines(child.birthDate, given, child.countryCode ?? 'US')[0]
  if (vaccine) e.stats.push({ label: t('widget_stat_nextVaccine'), value: `${vaccine.name} · ${vaccine.dueAge}`, daily: false })
  return e
}

// ─── menopause ─────────────────────────────────────────────────────────────

export interface MenopauseInput {
  stage: MenopauseStage | null
  lastPeriodDate: string | null
  logs: { date: string; type: string; value: string | null; severity: number | null }[]
}

const STAGE_KEY = { peri: 'report_meno_stage_peri', meno: 'report_meno_stage_meno', post: 'report_meno_stage_post' } as const

export function buildMenopauseEntry(input: MenopauseInput, ctx: Ctx): WidgetEntry {
  const { now } = ctx
  const e = baseEntry('menopause', 'menopause', t('widget_name_menopause'), now)
  const lastPeriod = latestPeriodDate(input.logs, input.lastPeriodDate)
  if (!input.stage && !lastPeriod && input.logs.length === 0) {
    e.state = 'empty'
    e.emptyText = t('widget_empty_menopause')
    return e
  }
  const severityOn = (date: string, type: string) =>
    input.logs.find((l) => l.date === date && l.type === type)?.severity ?? 0

  for (let i = 0; i < WIDGET_DAYS; i++) {
    const d = dayAt(now, i)
    const date = toDateStr(d)
    const months = monthsSinceDate(lastPeriod, d)
    const parts: string[] = []
    if (months != null) parts.push(months === 0 ? t('widget_menoMonthsZero') : plural('widget_menoMonths', months))
    if (input.stage) parts.push(t(STAGE_KEY[input.stage]))
    const hot = severityOn(date, 'hot_flash')
    const footer = hot > 0 ? t('widget_menoHotToday', { n: hot }) : t('widget_menoNoHotToday')
    const eyebrow = input.stage ? t(STAGE_KEY[input.stage]) : t('widget_name_menopause')
    e.days.push({
      date,
      title: parts.join(' · '),
      subtitle: footer,
      hero: months != null && months > 0
        ? { eyebrow, big: String(months), unit: plural('widget_unit_months', months), caption: t('widget_sinceLastPeriod'), footer }
        : { eyebrow, big: '', unit: '', caption: months === 0 ? t('widget_menoMonthsZero') : '', footer },
    })
  }

  const today = toDateStr(now)
  e.series = { label: t('widget_series_hotFlashes'), kind: 'bars', values: last7(now).map((d) => severityOn(d, 'hot_flash')) }
  const sleep = severityOn(today, 'sleep')
  e.stats = [{ label: t('widget_stat_sleepTrouble'), value: sleep > 0 ? `${sleep}/5` : '0', daily: true }]

  const since = toDateStr(dayAt(now, -29))
  const counts = new Map<MenopauseSymptomId, number>()
  for (const l of input.logs) {
    const id = l.date >= since ? resolveMenopauseSymptomId(l.type) : null
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (top) e.stats.push({ label: t('widget_stat_topSymptom'), value: menopauseSymptomLabel(top[0]), daily: false })
  return e
}

// ─── whole snapshot ────────────────────────────────────────────────────────

export interface SnapshotInput {
  now: Date
  isMinor: boolean
  enrolled: JourneyMode[]
  activeMode: JourneyMode
  activeChildId: string | null
  cycle?: CycleInput
  pregnancy?: PregnancyInput
  kids?: { children: KidInput[]; logs: Record<string, KidLog[]>; given: Record<string, HealthRecord[]> }
  menopause?: MenopauseInput
}

function snapshotStrings(): WidgetSnapshot['strings'] {
  return {
    signIn: t('widget_signIn'),
    pickChild: t('widget_pickChild'),
    refresh: t('widget_refresh'),
    start: {
      cycle: t('widget_start_cycle'),
      pregnancy: t('widget_start_pregnancy'),
      kids: t('widget_start_kids'),
      menopause: t('widget_start_menopause'),
    },
  }
}

export function buildSnapshot(input: SnapshotInput): WidgetSnapshot {
  const ctx: Ctx = { now: input.now, isMinor: input.isMinor }
  const has = (m: JourneyMode) => input.enrolled.includes(m)
  const entries: WidgetEntry[] = []
  if (has('pre-pregnancy') && input.cycle) entries.push(buildCycleEntry(input.cycle, ctx))
  if (has('pregnancy') && input.pregnancy) entries.push(buildPregnancyEntry(input.pregnancy, ctx))
  if (has('kids') && input.kids) {
    for (const c of input.kids.children) {
      entries.push(buildKidsEntry(c, input.kids.logs[c.id] ?? [], input.kids.given[c.id] ?? [], ctx))
    }
  }
  if (has('menopause') && input.menopause) entries.push(buildMenopauseEntry(input.menopause, ctx))

  const journey = modeToJourney(input.activeMode)
  const wanted = journey === 'kids' ? `kids:${input.activeChildId ?? ''}` : journey
  const activeKey = entries.find((e) => e.key === wanted)?.key
    ?? entries.find((e) => e.journey === journey)?.key
    ?? entries[0]?.key
    ?? null

  return {
    version: WIDGET_SNAPSHOT_VERSION,
    signedIn: true,
    generatedAt: input.now.toISOString(),
    activeKey,
    entries,
    strings: snapshotStrings(),
  }
}

/** What widgets show after sign-out: no entries, "Sign in to Grandma". */
export function emptySnapshot(now: Date): WidgetSnapshot {
  return {
    version: WIDGET_SNAPSHOT_VERSION,
    signedIn: false,
    generatedAt: now.toISOString(),
    activeKey: null,
    entries: [],
    strings: snapshotStrings(),
  }
}
