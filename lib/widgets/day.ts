import type { WidgetDay, WidgetEntry } from './types'

/** The precomputed line for `todayISO`; clamps to the first/last day outside the range. */
export function pickDay(entry: Pick<WidgetEntry, 'days'>, todayISO: string): WidgetDay | null {
  const { days } = entry
  if (days.length === 0) return null
  const hit = days.find((d) => d.date === todayISO)
  if (hit) return hit
  return todayISO < days[0].date ? days[0] : days[days.length - 1]
}

/** True once the daily stats/series were computed for an earlier day than `todayISO`. */
export function isStale(entry: Pick<WidgetEntry, 'todayFor'>, todayISO: string): boolean {
  return entry.todayFor < todayISO
}

/** Move a 7-day series forward by `daysLate` days: drop the oldest, pad today's end with zeros. */
export function shiftSeries(values: number[], daysLate: number): number[] {
  const n = Math.max(0, Math.min(values.length, daysLate))
  return [...values.slice(n), ...Array(n).fill(0)]
}

/** Whole days between two YYYY-MM-DD dates (b − a). */
export function daysBetweenISO(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}
