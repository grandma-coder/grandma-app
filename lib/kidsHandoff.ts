/**
 * Kids "Handoff" — a plain-text summary of what was logged for one child since a
 * chosen time, for handing the child over (nanny, grandparent, partner) through the
 * phone's share sheet.
 *
 * Pure: (logs, child, since, now, t, locale) → { title, lines, text }. No fetching,
 * no React. Facts only — counts, amounts, times and the user's own words. Never a
 * judgement ("normal", "too little", "fever"…); see docs/compliance/2026-11-02-regras-saude.md.
 *
 * Reads the same `child_logs` row shapes the Kids log forms write
 * (components/calendar/KidsLogForms.tsx):
 *   feeding/food  { feedType: 'bottle'|'breast'|'solids', time, amount?, meal?, newFoodName? } (+ notes = food description)
 *   sleep         { startTime, endTime?, duration? ("1h 10m" / "8h") }
 *   diaper        { diaperType: 'pee'|'poop'|'mixed', time }
 *   mood          'happy' | { mood }
 *   activity      { activityType, name?, duration?, startTime }
 *   medicine/temperature/vaccine  bare string value
 *   note          { eventType: 'Doctor visit'|'Injury'|'Other', description }
 * Logs without a stored time fall back to `created_at`.
 */
import type { TranslationKeys } from './i18n/keys'
import type { SiteStickerName } from '../components/stickers/SiteSticker'
import { KIDS_LOG_STICKER } from './logStickers'

export interface HandoffLog {
  id?: string
  date: string            // YYYY-MM-DD (local)
  type: string
  value: string | null
  notes: string | null
  created_at: string      // ISO timestamp
}

export type HandoffKind = 'feeding' | 'sleep' | 'diaper' | 'health' | 'mood' | 'activity' | 'note'

export interface HandoffLine {
  kind: HandoffKind
  /** Site sticker for the in-app preview (no emoji in the UI). */
  sticker: SiteStickerName
  /** Emoji prefix used only in the shared plain text. */
  emoji: string
  text: string
}

export interface Handoff {
  title: string
  lines: HandoffLine[]
  /** Full plain text for the share sheet / clipboard. */
  text: string
  empty: boolean
}

type T = (key: keyof TranslationKeys, params?: Record<string, string | number>) => string

const GROUP_ORDER: HandoffKind[] = ['feeding', 'sleep', 'diaper', 'health', 'mood', 'activity', 'note']

const MEAL_KEY: Record<string, keyof TranslationKeys> = {
  breakfast: 'kids_logForm_mealBreakfast',
  morning_snack: 'kids_logForm_mealAmSnack',
  lunch: 'kids_logForm_mealLunch',
  afternoon_snack: 'kids_logForm_mealPmSnack',
  dinner: 'kids_logForm_mealDinner',
  night_snack: 'kids_logForm_mealNight',
}

const MOOD_KEY: Record<string, keyof TranslationKeys> = {
  happy: 'kids_logForm_moodHappy',
  calm: 'kids_logForm_moodCalm',
  fussy: 'kids_logForm_moodFussy',
  cranky: 'kids_logForm_moodCranky',
  energetic: 'kids_logForm_moodEnergetic',
}

const ACTIVITY_KEY: Record<string, keyof TranslationKeys> = {
  class: 'kids_logForm_activityClass',
  school: 'kids_logForm_activitySchool',
  study: 'kids_logForm_activityStudy',
  reading: 'kids_logForm_activityReading',
  sport: 'kids_logForm_activitySport',
  swim: 'kids_logForm_activitySwimming',
  dance: 'kids_logForm_activityDance',
  music: 'kids_logForm_activityMusic',
  art: 'kids_logForm_activityArt',
  playground: 'kids_logForm_activityPlayground',
  walk: 'kids_logForm_activityWalk',
  therapy: 'kids_logForm_activityTherapy',
  playdate: 'kids_logForm_activityPlaydate',
}

// ─── Parsing helpers ─────────────────────────────────────────────────────────

function parseValue(value: string | null): unknown {
  if (value == null) return null
  try { return JSON.parse(value) } catch { return value }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : ''
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "HH:MM" on a local YYYY-MM-DD → Date, or null when either part is malformed. */
function atTime(date: string, hhmm: string): Date | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  const tm = /^(\d{1,2}):(\d{2})/.exec(hhmm)
  if (!dm || !tm) return null
  const d = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2]), 0, 0)
  return isNaN(d.getTime()) ? null : d
}

/** When the logged thing happened: stored time on the log date, else created_at. */
function eventTime(log: HandoffLog, val: Record<string, unknown> | null): Date {
  const stored = str(val?.time) || str(val?.startTime)
  const fromStored = stored ? atTime(log.date, stored) : null
  if (fromStored) return fromStored
  const created = new Date(log.created_at)
  if (!isNaN(created.getTime())) {
    if (localDateStr(created) === log.date) return created
    // Back-dated entry: keep the log's day, borrow the time of day it was entered.
    const onDay = atTime(log.date, `${created.getHours()}:${String(created.getMinutes()).padStart(2, '0')}`)
    if (onDay) return onDay
  }
  return atTime(log.date, '12:00') ?? new Date(0)
}

/** "1h 10m" / "8h" / "45m" / "1.5h" / "8" (hours) → minutes. */
/** Minutes from a stored duration ("45m", "1h 30m", "8h"). A bare number is `bareUnit` (legacy rows). */
export function parseDurationMinutes(raw: unknown, bareUnit: 'h' | 'm' = 'h'): number | null {
  const s = typeof raw === 'number' ? String(raw) : str(raw)
  if (!s) return null
  const hm = /^(?:(\d+(?:[.,]\d+)?)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?$/i.exec(s)
  if (hm && (hm[1] || hm[2])) {
    const mins = Math.round(parseFloat((hm[1] ?? '0').replace(',', '.')) * 60) + parseInt(hm[2] ?? '0', 10)
    return mins > 0 ? mins : null
  }
  const bare = parseFloat(s.replace(',', '.'))
  return Number.isFinite(bare) && bare > 0 ? Math.round(bareUnit === 'h' ? bare * 60 : bare) : null
}

// ─── Formatting ──────────────────────────────────────────────────────────────

function intlLocale(locale: string): string {
  return locale === 'en' ? 'en-US' : locale
}

function makeTimeFmt(locale: string) {
  const loc = intlLocale(locale)
  return (d: Date) => {
    try { return d.toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit' }) }
    catch { return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}` }
  }
}

function formatSince(since: Date, now: Date, locale: string, fmtTime: (d: Date) => string): string {
  if (localDateStr(since) === localDateStr(now)) return fmtTime(since)
  try {
    return since.toLocaleString(intlLocale(locale), { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  } catch {
    return fmtTime(since)
  }
}

function formatDuration(mins: number, t: T): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0 && m > 0) return t('handoff_durHm', { h, m: String(m).padStart(2, '0') })
  if (h > 0) return t('handoff_durH', { h })
  return t('handoff_durM', { m })
}

function formatMl(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
}

// ─── Builder ─────────────────────────────────────────────────────────────────

export function buildKidsHandoff(
  logs: HandoffLog[],
  child: { name: string },
  since: Date,
  now: Date,
  t: T,
  locale: string,
): Handoff {
  const fmtTime = makeTimeFmt(locale)
  const sinceLabel = formatSince(since, now, locale, fmtTime)
  const name = child.name?.trim() || '—'
  const title = t('handoff_title', { name, time: sinceLabel })
  const inWindow = (d: Date) => d.getTime() >= since.getTime() && d.getTime() <= now.getTime()

  const groups: Record<HandoffKind, HandoffLine[]> = {
    feeding: [], sleep: [], diaper: [], health: [], mood: [], activity: [], note: [],
  }

  // Resolve each log once, in chronological order.
  const resolved = logs
    .filter((l) => l.type !== 'skipped')
    .map((log) => {
      const parsed = parseValue(log.value)
      const val = asRecord(parsed)
      return { log, parsed, val, at: eventTime(log, val) }
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime())

  // Feeding / food
  let fedCount = 0
  let bottles = 0
  let bottleMl = 0
  let breasts = 0
  let anyMilk = false
  const solids: string[] = []
  // Sleep
  const sessions: { start: Date; end: Date; mins: number }[] = []
  const ongoing: Date[] = []
  // Diaper
  let wet = 0
  let dirty = 0
  let diapers = 0
  // Mood / activity
  const moods: string[] = []
  const activities: string[] = []
  const notes: string[] = []

  for (const { log, parsed, val, at } of resolved) {
    if (log.type === 'sleep') {
      const start = at
      const endStr = str(val?.endTime)
      let end: Date | null = endStr ? atTime(log.date, endStr) : null
      if (end && end.getTime() <= start.getTime()) end = new Date(end.getTime() + 24 * 3600_000)
      if (!end) {
        const dur = parseDurationMinutes(val?.duration)
        if (dur) end = new Date(start.getTime() + dur * 60_000)
      }
      // A sleep counts when any part of it falls in the window.
      const overlaps = start.getTime() <= now.getTime() && (end ?? now).getTime() >= since.getTime()
      if (!overlaps) continue
      if (end && end.getTime() <= now.getTime()) {
        sessions.push({ start, end, mins: Math.round((end.getTime() - start.getTime()) / 60_000) })
      } else {
        ongoing.push(start)
      }
      const note = str(log.notes)
      if (note) notes.push(note)
      continue
    }

    if (!inWindow(at)) continue
    const note = str(log.notes)

    switch (log.type) {
      case 'feeding':
      case 'food': {
        fedCount++
        const feedType = str(val?.feedType) || (log.type === 'food' ? 'solids' : '')
        if (feedType === 'bottle') {
          bottles++
          anyMilk = true
          const ml = parseFloat(str(val?.amount).replace(',', '.'))
          if (Number.isFinite(ml) && ml > 0) bottleMl += ml
        } else if (feedType === 'breast') {
          breasts++
          anyMilk = true
        } else {
          const mealKey = MEAL_KEY[str(val?.meal)]
          const meal = mealKey ? t(mealKey) : ''
          // Food logs keep their description in `notes` — it belongs to the meal, not the notes list.
          const what = note || str(val?.newFoodName)
          solids.push(meal && what ? `${meal} (${what})` : meal || what || t('handoff_solids'))
        }
        if (note && log.type !== 'food' && feedType !== 'solids') notes.push(note)
        continue
      }
      case 'diaper': {
        diapers++
        const kind = str(val?.diaperType)
        if (kind === 'pee' || kind === 'mixed') wet++
        if (kind === 'poop' || kind === 'mixed') dirty++
        break
      }
      case 'medicine': {
        const what = str(parsed) || t('handoff_medicine')
        groups.health.push({ kind: 'health', sticker: KIDS_LOG_STICKER.medicine, emoji: '💊', text: t('handoff_at', { what, time: fmtTime(at) }) })
        break
      }
      case 'temperature': {
        const raw = str(parsed)
        const value = /^\d+(?:[.,]\d+)?$/.test(raw) ? `${raw} °C` : raw
        groups.health.push({ kind: 'health', sticker: KIDS_LOG_STICKER.health, emoji: '🌡️', text: t('handoff_at', { what: t('handoff_temp', { value }), time: fmtTime(at) }) })
        break
      }
      case 'vaccine': {
        groups.health.push({ kind: 'health', sticker: KIDS_LOG_STICKER.vaccine, emoji: '💉', text: t('handoff_at', { what: t('handoff_vaccine', { name: str(parsed) }), time: fmtTime(at) }) })
        break
      }
      case 'note': {
        const evt = str(val?.eventType)
        const desc = str(val?.description) || str(val?.text) || (val ? '' : str(parsed))
        const label = /doctor/i.test(evt) ? t('handoff_doctor') : /injur/i.test(evt) ? t('handoff_injury') : ''
        const what = [label, desc && desc !== evt ? desc : ''].filter(Boolean).join(': ') || desc || label
        if (what) groups.health.push({ kind: 'health', sticker: KIDS_LOG_STICKER.health, emoji: '🩺', text: t('handoff_at', { what, time: fmtTime(at) }) })
        break
      }
      case 'mood': {
        const id = (str(val?.mood) || str(parsed)).toLowerCase().replace(/['"]/g, '')
        if (id) moods.push(MOOD_KEY[id] ? t(MOOD_KEY[id]) : id)
        break
      }
      case 'activity': {
        const typeKey = ACTIVITY_KEY[str(val?.activityType)]
        const label = str(val?.name) || (typeKey ? t(typeKey) : str(val?.activityType))
        const mins = parseDurationMinutes(val?.duration)
        if (label) activities.push(mins ? `${label} (${formatDuration(mins, t)})` : label)
        break
      }
      default:
        break
    }
    if (note) notes.push(note)
  }

  if (fedCount > 0) {
    const parts: string[] = []
    if (bottles > 0) {
      const ml = formatMl(bottleMl)
      parts.push(bottles === 1
        ? (bottleMl > 0 ? t('handoff_bottleMl', { ml }) : t('handoff_bottle'))
        : (bottleMl > 0 ? t('handoff_bottlesMl', { count: bottles, ml }) : t('handoff_bottles', { count: bottles })))
    }
    if (breasts > 0) parts.push(breasts === 1 ? t('handoff_breast') : t('handoff_breasts', { count: breasts }))
    parts.push(...solids)
    const head = t('handoff_fed', { count: fedCount })
    groups.feeding.push({
      kind: 'feeding',
      sticker: anyMilk ? KIDS_LOG_STICKER.feeding : KIDS_LOG_STICKER.food,
      emoji: anyMilk ? '🍼' : '🥣',
      text: parts.length ? `${head} — ${parts.join(', ')}` : head,
    })
  }

  if (sessions.length > 0) {
    const total = sessions.reduce((sum, s) => sum + s.mins, 0)
    const ranges = sessions.map((s) => `${fmtTime(s.start)}–${fmtTime(s.end)}`).join(', ')
    groups.sleep.push({ kind: 'sleep', sticker: KIDS_LOG_STICKER.sleep, emoji: '😴', text: t('handoff_slept', { duration: formatDuration(total, t), ranges }) })
  }
  for (const start of ongoing) {
    groups.sleep.push({ kind: 'sleep', sticker: KIDS_LOG_STICKER.sleep, emoji: '😴', text: t('handoff_asleepSince', { time: fmtTime(start) }) })
  }

  if (diapers > 0) {
    groups.diaper.push({ kind: 'diaper', sticker: KIDS_LOG_STICKER.diaper, emoji: '🧷', text: t('handoff_diapers', { count: diapers, wet, dirty }) })
  }
  if (moods.length > 0) {
    groups.mood.push({ kind: 'mood', sticker: KIDS_LOG_STICKER.mood, emoji: '🙂', text: t('handoff_mood', { list: moods.join(', ') }) })
  }
  if (activities.length > 0) {
    groups.activity.push({ kind: 'activity', sticker: KIDS_LOG_STICKER.activity, emoji: '🧸', text: t('handoff_activities', { list: activities.join(', ') }) })
  }
  for (const n of notes) {
    groups.note.push({ kind: 'note', sticker: 'pencil', emoji: '📝', text: t('handoff_note', { text: n }) })
  }

  const lines = GROUP_ORDER.flatMap((k) => groups[k])
  const footer = `— ${t('handoff_footer')}`
  const empty = lines.length === 0
  const text = empty
    ? [t('handoff_empty', { name, time: sinceLabel }), footer].join('\n')
    : [title, ...lines.map((l) => `${l.emoji} ${l.text}`), footer].join('\n')

  return { title, lines, text, empty }
}

// ─── "Since" presets ─────────────────────────────────────────────────────────

/** Today at 06:00, or yesterday's 06:00 when it isn't 6 am yet. */
export function morningSince(now: Date): Date {
  const d = new Date(now)
  d.setHours(6, 0, 0, 0)
  if (d.getTime() > now.getTime()) d.setDate(d.getDate() - 1)
  return d
}

/** A picked clock time → the most recent moment at that time (today, or yesterday if still ahead). */
export function sinceFromClock(hours: number, minutes: number, now: Date): Date {
  const d = new Date(now)
  d.setHours(hours, minutes, 0, 0)
  if (d.getTime() > now.getTime()) d.setDate(d.getDate() - 1)
  return d
}

/** First local date (YYYY-MM-DD) to fetch: the day before `since`, so an overnight sleep that began earlier is caught. */
export function handoffFetchFrom(since: Date): string {
  const d = new Date(since)
  d.setDate(d.getDate() - 1)
  return localDateStr(d)
}
