import { t as tNow } from './i18n'
import { fullMonthsBetween, parseLocalDate } from './localDate'

/**
 * Completed months of age on `now` (local calendar), never negative. A month only counts once
 * its day-of-month is reached: born Jan 20 → 0 on Feb 5, 1 on Feb 20. A birth day the month
 * doesn't have (31st, Feb 29) is reached on that month's last day. Null when the date is
 * missing or unparseable.
 */
export function childAgeMonths(birthDate: string | null | undefined, now: Date = new Date()): number | null {
  if (!birthDate) return null
  const dob = parseLocalDate(birthDate)
  if (Number.isNaN(dob.getTime())) return null
  return Math.max(0, fullMonthsBetween(dob, now))
}

/** A child's age in the kids-home wording ("8mo", "2y 3mo"), in the app language. */
export function formatChildAge(birthDate: string, now: Date = new Date()): string {
  const months = childAgeMonths(birthDate, now) ?? 0
  if (months < 1) return tNow('kids_home_age_newborn')
  if (months < 12) return tNow('kp_kh_ageMo', { n: months })
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem > 0 ? tNow('kp_kh_ageYMo', { y: years, r: rem }) : tNow('kp_kh_ageY', { y: years })
}
