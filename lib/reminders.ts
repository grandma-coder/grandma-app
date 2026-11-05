/**
 * Personal reminders ("Lembretes") — data model + pure planning.
 *
 * A reminder's "when" is stored as local wall-clock strings (`dueDate`
 * YYYY-MM-DD, `dueTime` HH:MM), never as an instant. The moment it fires is
 * rebuilt with `new Date(y, m, d, h, min)` in the device's current zone every
 * time we (re)schedule, so "9:00" stays 9:00 across DST changes and travel.
 *
 * Pregnancy + cycle reminders live on the device (AsyncStorage, one key per
 * user + journey); kids reminders are server-backed (`kids_reminders`) and only
 * share the pure helpers here. Scheduling lives in lib/reminderNotifications.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { JourneyMode } from '../types'

export interface ChecklistItem { id: string; text: string; done: boolean }

export interface Reminder {
  id: string
  text: string
  done: boolean
  dueDate?: string | null
  dueTime?: string | null
  /** Legacy: id of the row once mirrored into `notifications`. Only read to clean it up. */
  notifId?: string | null
  archivedAt?: string | null
  notes?: string
  // Legacy fields — no longer edited in the site look, kept so old data round-trips intact.
  flagged?: boolean
  tags?: string[]
  checklist?: ChecklistItem[]
  priority?: 'low' | 'med' | 'high'
}

/** What the composer produces (create and edit). */
export interface ReminderDraft {
  text: string
  dueDate: string | null
  dueTime: string | null
  notes: string
}

/** Fire hour for reminders that have a date but no time (older data). */
export const DEFAULT_REMINDER_HOUR = 9

// ─── Storage ────────────────────────────────────────────────────────────────

export function storageKey(userId: string | null, context: JourneyMode): string | null {
  return userId ? `grandma-reminders-${context}-${userId}` : null
}

export async function loadReminders(userId: string | null, context: JourneyMode): Promise<Reminder[]> {
  const key = storageKey(userId, context)
  if (!key) return []
  const json = await AsyncStorage.getItem(key)
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? (parsed as Reminder[]).filter(isReminder) : []
  } catch {
    return []
  }
}

export async function saveReminders(userId: string | null, context: JourneyMode, list: Reminder[]): Promise<void> {
  const key = storageKey(userId, context)
  if (key) await AsyncStorage.setItem(key, JSON.stringify(list))
}

function isReminder(r: unknown): r is Reminder {
  return !!r && typeof (r as Reminder).id === 'string' && typeof (r as Reminder).text === 'string'
}

// ─── Local date/time helpers ────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')

/** Date → local YYYY-MM-DD. */
export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Date → local HH:MM (24h). */
export function toLocalTimeStr(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Parse YYYY-MM-DD (+ optional HH:MM) as a LOCAL Date. null when malformed. */
export function localDateTime(dateStr: string, timeStr?: string | null): Date | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!dm) return null
  let h = 0
  let min = 0
  if (timeStr) {
    const tm = /^(\d{1,2}):(\d{2})$/.exec(timeStr)
    if (!tm) return null
    h = Math.min(23, parseInt(tm[1], 10))
    min = Math.min(59, parseInt(tm[2], 10))
  }
  return new Date(parseInt(dm[1], 10), parseInt(dm[2], 10) - 1, parseInt(dm[3], 10), h, min, 0, 0)
}

/** Whole calendar days from `now`'s date to `dateStr` (0 = today, 1 = tomorrow, -1 = yesterday). */
export function dayOffset(dateStr: string, now: Date): number | null {
  const d = localDateTime(dateStr)
  if (!d) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // Round: a DST day is 23h or 25h long.
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

/** Local date `days` after `now`'s date, as YYYY-MM-DD. */
export function addDays(now: Date, days: number): string {
  return toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days))
}

/**
 * The moment a reminder should alert, in the device's current zone. Date-only
 * reminders alert at DEFAULT_REMINDER_HOUR. null when there is no date.
 */
export function reminderFireAt(r: Pick<Reminder, 'dueDate' | 'dueTime'>): Date | null {
  if (!r.dueDate) return null
  if (r.dueTime) return localDateTime(r.dueDate, r.dueTime)
  return localDateTime(r.dueDate, `${pad(DEFAULT_REMINDER_HOUR)}:00`)
}

/**
 * True when a date (+ time) is already behind `now`. A date without a time is
 * only "past" once that whole day is over.
 */
export function isWhenPast(dueDate: string | null | undefined, dueTime: string | null | undefined, now: Date): boolean {
  if (!dueDate) return false
  if (dueTime) {
    const at = localDateTime(dueDate, dueTime)
    return !!at && at.getTime() <= now.getTime()
  }
  const off = dayOffset(dueDate, now)
  return off !== null && off < 0
}

/**
 * Default time offered when a day is picked: 09:00, or — when that has already
 * gone by today — the next whole hour (capped at 23:00; 23:xx rolls to 23:59).
 */
export function defaultTimeFor(dateStr: string, now: Date): string {
  const nine = `${pad(DEFAULT_REMINDER_HOUR)}:00`
  if (dayOffset(dateStr, now) !== 0) return nine
  if (now.getHours() < DEFAULT_REMINDER_HOUR) return nine
  const next = now.getHours() + 1
  return next <= 23 ? `${pad(next)}:00` : '23:59'
}

// ─── Labels (locale injected so this stays pure) ────────────────────────────

export interface DayWords { today: string; tomorrow: string; yesterday: string }

/** "Today" / "Tomorrow" / "Yesterday" / "Thu, Nov 6" (+ year when not this year). */
export function formatReminderDay(dateStr: string, now: Date, locale: string, words: DayWords): string {
  const off = dayOffset(dateStr, now)
  if (off === 0) return words.today
  if (off === 1) return words.tomorrow
  if (off === -1) return words.yesterday
  const d = localDateTime(dateStr)
  if (!d) return dateStr
  return d.toLocaleDateString(locale, {
    weekday: 'short', day: 'numeric', month: 'short',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}

/** HH:MM → the locale's clock ("09:00", "9:00 AM"). */
export function formatReminderTime(timeStr: string, locale: string): string {
  const d = localDateTime('2000-01-01', timeStr)
  return d ? d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : timeStr
}

/** Day + time, e.g. "Tomorrow · 09:00". null when there's no date. */
export function formatReminderWhen(
  r: Pick<Reminder, 'dueDate' | 'dueTime'>, now: Date, locale: string, words: DayWords,
): string | null {
  if (!r.dueDate) return null
  const day = formatReminderDay(r.dueDate, now, locale, words)
  return r.dueTime ? `${day} · ${formatReminderTime(r.dueTime, locale)}` : day
}

// ─── Lists ──────────────────────────────────────────────────────────────────

export type DueState = 'none' | 'past' | 'today' | 'tomorrow' | 'later'

export function dueState(r: Pick<Reminder, 'dueDate' | 'dueTime'>, now: Date): DueState {
  if (!r.dueDate) return 'none'
  if (isWhenPast(r.dueDate, r.dueTime, now)) return 'past'
  const off = dayOffset(r.dueDate, now)
  if (off === 0) return 'today'
  if (off === 1) return 'tomorrow'
  return 'later'
}

function fireMs(r: Reminder): number {
  return reminderFireAt(r)?.getTime() ?? Number.POSITIVE_INFINITY
}

/**
 * Split for the list: dated not-done reminders soonest first (anything already
 * past sits on top, oldest first), undated ones in the order they were added
 * (legacy flagged ones first), and done ones most recently finished first.
 */
export function splitReminders(list: Reminder[]): { dated: Reminder[]; undated: Reminder[]; done: Reminder[] } {
  const open = list.filter((r) => !r.done)
  const dated = open.filter((r) => !!r.dueDate).sort((a, b) => fireMs(a) - fireMs(b))
  const undated = open
    .filter((r) => !r.dueDate)
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (!!a.r.flagged === !!b.r.flagged ? a.i - b.i : a.r.flagged ? -1 : 1))
    .map((x) => x.r)
  const done = list
    .filter((r) => r.done)
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const at = a.r.archivedAt ?? ''
      const bt = b.r.archivedAt ?? ''
      return at === bt ? b.i - a.i : at < bt ? 1 : -1
    })
    .map((x) => x.r)
  return { dated, undated, done }
}

/** Not-done reminders, soonest first (dated before undated), limited to n. */
export function upcomingReminders(list: Reminder[], n: number): Reminder[] {
  const { dated, undated } = splitReminders(list)
  return [...dated, ...undated].slice(0, n)
}

/** How many reminders are still open — the wallet card badge. */
export function openReminderCount(list: Reminder[]): number {
  return list.reduce((n, r) => (r.done ? n : n + 1), 0)
}

export function allTags(list: Reminder[]): string[] {
  const seen: string[] = []
  for (const r of list) for (const tag of r.tags ?? []) if (!seen.includes(tag)) seen.push(tag)
  return seen
}

// ─── Mutations (pure) ───────────────────────────────────────────────────────

let lastId = 0
/** Unique, sortable local id — two adds in the same millisecond must not collide. */
export function newReminderId(now = Date.now()): string {
  lastId = now > lastId ? now : lastId + 1
  return String(lastId)
}

/** Normalise a composer draft: trimmed text/notes, no time without a date. */
export function cleanDraft(d: ReminderDraft): ReminderDraft {
  const dueDate = d.dueDate || null
  return {
    text: d.text.trim(),
    dueDate,
    dueTime: dueDate ? d.dueTime || null : null,
    notes: d.notes.trim(),
  }
}

export function createReminder(draft: ReminderDraft, id = newReminderId()): Reminder {
  const d = cleanDraft(draft)
  return {
    id,
    text: d.text,
    done: false,
    dueDate: d.dueDate,
    dueTime: d.dueTime,
    ...(d.notes ? { notes: d.notes } : {}),
  }
}

/** Apply an edit. Moving a done reminder to a new future moment reopens it. */
export function applyDraft(r: Reminder, draft: ReminderDraft, now: Date): Reminder {
  const d = cleanDraft(draft)
  const whenChanged = d.dueDate !== (r.dueDate ?? null) || d.dueTime !== (r.dueTime ?? null)
  const reopen = r.done && whenChanged && !!d.dueDate && !isWhenPast(d.dueDate, d.dueTime, now)
  const next: Reminder = { ...r, text: d.text, dueDate: d.dueDate, dueTime: d.dueTime }
  if (d.notes) next.notes = d.notes
  else delete next.notes
  if (reopen) { next.done = false; next.archivedAt = null }
  return next
}

export function setReminderDone(r: Reminder, done: boolean, now: Date): Reminder {
  return { ...r, done, archivedAt: done ? now.toISOString() : null }
}

/**
 * Can this draft be saved? Text is required. A new or changed date/time must
 * not be in the past; an unchanged one may be (editing the text of an overdue
 * reminder is fine).
 */
export function draftProblem(
  draft: ReminderDraft,
  original: Pick<Reminder, 'dueDate' | 'dueTime'> | null,
  now: Date,
): 'empty' | 'past' | null {
  const d = cleanDraft(draft)
  if (!d.text) return 'empty'
  const unchanged = !!original && d.dueDate === (original.dueDate ?? null) && d.dueTime === (original.dueTime ?? null)
  if (!unchanged && isWhenPast(d.dueDate, d.dueTime, now)) return 'past'
  return null
}

// ─── Notification plan (pure) ───────────────────────────────────────────────

export const REMINDER_NOTIF_PREFIX = 'reminder-'

/** Stable OS identifier per reminder — scheduling it again replaces, never duplicates. */
export function reminderNotificationId(context: JourneyMode, id: string): string {
  return `${REMINDER_NOTIF_PREFIX}${context}-${id}`
}

export function reminderNotificationPrefix(context: JourneyMode): string {
  return `${REMINDER_NOTIF_PREFIX}${context}-`
}

/**
 * iOS keeps at most 64 pending local notifications per app, shared with the
 * daily/weekly/period ones. Each journey schedules only its soonest N; the rest
 * get scheduled as earlier ones fire and the list is re-synced.
 */
export const MAX_SCHEDULED_PER_CONTEXT = 20

export interface PlannedReminderAlert {
  identifier: string
  reminder: Reminder
  fireAt: Date
}

/** Open reminders with a future alert moment, soonest first, capped. */
export function planReminderAlerts(
  context: JourneyMode,
  list: Reminder[],
  now: Date,
  max = MAX_SCHEDULED_PER_CONTEXT,
): PlannedReminderAlert[] {
  const out: PlannedReminderAlert[] = []
  for (const r of list) {
    if (r.done) continue
    const fireAt = reminderFireAt(r)
    if (!fireAt || fireAt.getTime() <= now.getTime()) continue
    out.push({ identifier: reminderNotificationId(context, r.id), reminder: r, fireAt })
  }
  out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
  return out.slice(0, max)
}

/** Scheduled ids for this journey that the plan no longer wants (done, deleted, past, over the cap). */
export function staleReminderIds(context: JourneyMode, scheduledIds: string[], planned: PlannedReminderAlert[]): string[] {
  const prefix = reminderNotificationPrefix(context)
  const keep = new Set(planned.map((p) => p.identifier))
  return scheduledIds.filter((id) => id.startsWith(prefix) && !keep.has(id))
}
