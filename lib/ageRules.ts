/**
 * Age rules (Nov 2026 decision, modelled on how period-tracking apps handle it):
 * - Minimum sign-up age 13, or 16 in the EU/EEA, UK and Canada (stricter digital-consent rules).
 * - Under 18: social / marketplace areas (Village, Community) and intimacy logs are hidden.
 * The App Store age-rating questionnaire declares this as age assurance — keep them in step.
 */
const SIXTEEN_PLUS = new Set([
  // EU
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
  'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // EEA, UK, Canada
  'IS', 'LI', 'NO', 'GB', 'CA',
])

export const ADULT_AGE = 18

export function minSignupAge(region: string | null | undefined): 13 | 16 {
  return region && SIXTEEN_PLUS.has(region.toUpperCase()) ? 16 : 13
}

/** Whole years on `now` for an ISO date (YYYY-MM-DD). NaN when unparseable. */
export function ageOn(dob: string, now: Date = new Date()): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob)
  if (!m) return NaN
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) age -= 1
  return age
}

/** Unknown or invalid birth date → not a minor (we only restrict on a known age). */
export function isMinor(dob: string | null | undefined, now: Date = new Date()): boolean {
  if (!dob) return false
  const a = ageOn(dob, now)
  return Number.isFinite(a) && a < ADULT_AGE
}

export function latestAllowedDob(region: string | null | undefined, now: Date = new Date()): Date {
  return new Date(now.getFullYear() - minSignupAge(region), now.getMonth(), now.getDate())
}

/** Cycle log types hidden for under-18s. */
export const MINOR_HIDDEN_CYCLE_LOGS: ReadonlySet<string> = new Set(['intercourse', 'sex_drive'])
