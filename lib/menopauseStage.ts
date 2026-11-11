export type MenopauseStage = 'peri' | 'meno' | 'post'

/** Whole calendar months between an ISO date (YYYY-MM-DD) and `now`. null if no date. */
export function monthsSinceDate(fromISO: string | null, now: Date): number | null {
  if (!fromISO) return null
  const [y, m, d] = fromISO.split('-').map(Number)
  if (!y || !m || !d) return null
  // Reject impossible dates (e.g. '2026-13-01', '2026-02-30') via a round-trip:
  // a valid Y-M-D reconstructs to the same components, an invalid one rolls over.
  // Guards shouldOfferMenopauseUpdate against a corrupted stored date producing
  // a bogus month count instead of null.
  const probe = new Date(Date.UTC(y, m - 1, d))
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
    return null
  }
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)
  if (now.getDate() < d) months -= 1 // not yet a full month into the current one
  return Math.max(0, months)
}

/** Non-diagnostic offer: a peri user with >=12 months since last period. Never auto-applies. */
export function shouldOfferMenopauseUpdate(
  stage: MenopauseStage,
  lastPeriodISO: string | null,
  now: Date,
): boolean {
  if (stage !== 'peri') return false
  const months = monthsSinceDate(lastPeriodISO, now)
  return months !== null && months >= 12
}

/**
 * The most recent period: the newest logged 'period' row or the stored onboarding date, whichever is
 * later. The stored date alone misses periods logged on another device or before a reinstall.
 */
export function latestPeriodDate(rows: { type: string; date: string }[], stored: string | null): string | null {
  let best = stored
  for (const r of rows) if (r.type === 'period' && (!best || r.date > best)) best = r.date
  return best
}

/**
 * The stored last-period date after a logged period on `deletedDate` is removed. When that log
 * had become the stored date (older builds wrote every newer logged period into the store), keep
 * the newest OTHER logged period, else nothing — never the deleted day, or the counter sticks to
 * a period that didn't happen. Any other stored date is left alone.
 */
export function lastPeriodAfterDelete(
  stored: string | null,
  deletedDate: string,
  rows: { type: string; date: string }[],
): string | null {
  if (stored !== deletedDate) return stored
  return latestPeriodDate(rows.filter((r) => r.date !== deletedDate), null)
}
