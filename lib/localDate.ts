/**
 * Parse a stored calendar day ('YYYY-MM-DD') as LOCAL midnight. `new Date('2026-11-01')` is UTC
 * midnight, which is the previous evening in the Americas — dates showed a day early, ages could
 * be a month off for births on the 1st, and countdowns disagreed with week math in the evening.
 * Anything that isn't a bare day (full ISO timestamps) is parsed as-is.
 */
export function parseLocalDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00') : new Date(value)
}
