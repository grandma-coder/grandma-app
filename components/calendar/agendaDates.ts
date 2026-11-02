/**
 * Pure date math for the shared agenda calendar (week strip / month grid) and
 * the kids agenda list window. No React, no theme — easy to unit test.
 * All dates are local 'YYYY-MM-DD' strings; weeks start on Monday.
 */
import type { AgendaView } from '../../store/useAgendaViewStore'

export function dayStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Local noon — safe against DST edges when adding days. */
export function parseDay(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00')
}

/** The 7 days (Mon → Sun) of the week that contains `dateStr`. */
export function weekDates(dateStr: string): string[] {
  const d = parseDay(dateStr)
  const offsetToMon = (d.getDay() + 6) % 7
  const out: string[] = []
  for (let i = 0; i < 7; i++) {
    out.push(dayStr(new Date(d.getFullYear(), d.getMonth(), d.getDate() - offsetToMon + i, 12)))
  }
  return out
}

/**
 * Month grid for the month that contains `dateStr`: whole Mon → Sun weeks,
 * only as many rows as the month needs (4–6).
 */
export function monthGridDates(dateStr: string): { date: string; inMonth: boolean }[] {
  const d = parseDay(dateStr)
  const year = d.getFullYear()
  const month = d.getMonth()
  const lead = (new Date(year, month, 1, 12).getDay() + 6) % 7
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
export function agendaPeriodKey(dateStr: string, view: AgendaView): string {
  return view === 'week' ? weekDates(dateStr)[0] : dateStr.slice(0, 7)
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
