import { t as tNow } from './i18n'

// Display names for the kids mood ids (stored values stay English ids).
const KEYS = {
  happy: 'kids_logForm_moodHappy',
  calm: 'kids_logForm_moodCalm',
  energetic: 'kp_kh_moodActive',
  fussy: 'kids_logForm_moodFussy',
  cranky: 'kids_logForm_moodCranky',
} as const

export function kidsMoodLabel(mood: string): string {
  const k = KEYS[mood as keyof typeof KEYS]
  return k ? tNow(k) : mood
}
