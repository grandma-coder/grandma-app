/**
 * Parse a stored calendar day ('YYYY-MM-DD') as LOCAL midnight. `new Date('2026-11-01')` is UTC
 * midnight, which is the previous evening in the Americas — dates showed a day early, ages could
 * be a month off for births on the 1st, and countdowns disagreed with week math in the evening.
 * Anything that isn't a bare day (full ISO timestamps) is parsed as-is.
 */
export function parseLocalDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00') : new Date(value)
}

/**
 * Whole months completed between two moments, the way a baby's age is counted: born Oct 25 is
 * 0 months on Nov 10 and 1 month on Nov 25. Plain year/month subtraction ignored the day, so a
 * 16-day-old read "1mo", feeding stages and vaccine windows moved up to a month early, and "1y"
 * showed before the first birthday. The last day of a shorter month completes the month
 * (Jan 31 → Feb 28 is 1). Negative when `to` is before `from`.
 */
export function fullMonthsBetween(from: Date, to: Date = new Date()): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  const lastDayOfToMonth = new Date(to.getFullYear(), to.getMonth() + 1, 0).getDate()
  if (months > 0 && to.getDate() < from.getDate() && to.getDate() < lastDayOfToMonth) months -= 1
  return months
}
