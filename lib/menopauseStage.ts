export type MenopauseStage = 'peri' | 'meno' | 'post'

/** Whole calendar months between an ISO date (YYYY-MM-DD) and `now`. null if no date. */
export function monthsSinceDate(fromISO: string | null, now: Date): number | null {
  if (!fromISO) return null
  const [y, m, d] = fromISO.split('-').map(Number)
  if (!y || !m || !d) return null
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
