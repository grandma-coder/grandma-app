/**
 * Pure date math for the shared agenda calendar (week strip / month grid) and
 * the kids agenda list window. No React, no theme — easy to unit test.
 * All dates are local 'YYYY-MM-DD' strings. Weeks start on `weekStart`
 * (JS getDay index: 0 = Sunday, 1 = Monday, 6 = Saturday) — Monday by default;
 * the calendar passes the device region's first weekday (deviceWeekStart).
 */
import { getCalendars } from 'expo-localization'
import type { AgendaView } from '../../store/useAgendaViewStore'

/** JS getDay index of the first day of the week: 0 = Sunday … 6 = Saturday. */
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6

/**
 * The device region's first weekday (Brazil/US → Sunday, most of Europe → Monday, …).
 * expo-localization counts 1 = Sunday … 7 = Saturday. Falls back to Monday.
 */
export function deviceWeekStart(): WeekStart {
  try {
    const first = getCalendars()[0]?.firstWeekday
    if (typeof first === 'number' && first >= 1 && first <= 7) return (first - 1) as WeekStart
  } catch {
    // no native module (tests / web) → default
  }
  return 1
}

/** JS getDay indices in display order for a week starting on `weekStart`. */
export function weekdayOrder(weekStart: WeekStart = 1): number[] {
  return Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7)
}

export function dayStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Local noon — safe against DST edges when adding days. */
export function parseDay(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00')
}

/** The 7 days of the week that contains `dateStr`, starting on `weekStart`. */
export function weekDates(dateStr: string, weekStart: WeekStart = 1): string[] {
  const d = parseDay(dateStr)
  const offsetToMon = (d.getDay() - weekStart + 7) % 7
  const out: string[] = []
  for (let i = 0; i < 7; i++) {
    out.push(dayStr(new Date(d.getFullYear(), d.getMonth(), d.getDate() - offsetToMon + i, 12)))
  }
  return out
}

/**
 * Month grid for the month that contains `dateStr`: whole weeks (starting on
 * `weekStart`), only as many rows as the month needs (4–6).
 */
export function monthGridDates(dateStr: string, weekStart: WeekStart = 1): { date: string; inMonth: boolean }[] {
  const d = parseDay(dateStr)
  const year = d.getFullYear()
  const month = d.getMonth()
  const lead = (new Date(year, month, 1, 12).getDay() - weekStart + 7) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const total = Math.ceil((lead + daysInMonth) / 7) * 7
  const out: { date: string; inMonth: boolean }[] = []
  for (let i = 0; i < total; i++) {
    const cell = new Date(year, month, 1 - lead + i, 12)
    out.push({ date: dayStr(cell), inMonth: cell.getMonth() === month })
  }
  return out
}

/**
 * Step the selected day by one period: ±7 days in Week view, ±1 month in Month
 * view (day-of-month clamped, so Jan 31 → Feb 28/29).
 */
export function shiftAgendaDate(dateStr: string, view: AgendaView, dir: 1 | -1): string {
  const d = parseDay(dateStr)
  if (view === 'week') {
    return dayStr(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 * dir, 12))
  }
  const target = new Date(d.getFullYear(), d.getMonth() + dir, 1, 12)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(d.getDate(), lastDay))
  return dayStr(target)
}

/** Stable key for the visible period (drives the slide-in animation). */
export function agendaPeriodKey(dateStr: string, view: AgendaView, weekStart: WeekStart = 1): string {
  return view === 'week' ? weekDates(dateStr, weekStart)[0] : dateStr.slice(0, 7)
}

/**
 * The slice of a time-sorted day list to show collapsed: `limit` contiguous rows
 * starting at the next upcoming (not yet logged) item. `nowHours` is the cut-off
 * — the current hour for today, `-Infinity` for a future day, `Infinity` for a
 * past day (nothing upcoming → the last `limit` rows). The window slides back
 * so it is always full when the list has at least `limit` rows.
 */
export function upcomingWindow<T extends { logged?: boolean; sortHours: number }>(
  rows: T[],
  nowHours: number,
  limit = 3,
): T[] {
  if (rows.length <= limit) return rows
  const next = rows.findIndex((r) => !r.logged && r.sortHours >= nowHours)
  const anchor = next === -1 ? rows.length - limit : next
  const start = Math.max(0, Math.min(anchor, rows.length - limit))
  return rows.slice(start, start + limit)
}
