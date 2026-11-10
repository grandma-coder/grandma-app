import { t as tNow } from './i18n'
import { parseLocalDate } from './localDate'

/** A child's age in the kids-home wording ("8mo", "2y 3mo"), in the app language. */
export function formatChildAge(birthDate: string, now: Date = new Date()): string {
  const dob = parseLocalDate(birthDate)
  const months =
    (now.getFullYear() - dob.getFullYear()) * 12 +
    (now.getMonth() - dob.getMonth())
  if (months < 1) return tNow('kids_home_age_newborn')
  if (months < 12) return tNow('kp_kh_ageMo', { n: months })
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem > 0 ? tNow('kp_kh_ageYMo', { y: years, r: rem }) : tNow('kp_kh_ageY', { y: years })
}
