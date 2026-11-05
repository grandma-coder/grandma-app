/**
 * Plain-word readings for the cycle Notes tiles: no percentages, no x/5 scores.
 * Each returns an i18n key (or null when there is nothing to say yet).
 */

export type RegularityWord = 'steady' | 'mostly' | 'varies'
export type MoodWord = 'lighter' | 'mixed' | 'heavier'

/** `percent` = share of closed cycles within 2 days of the average (0-100). */
export function regularityWord(percent: number | null | undefined): RegularityWord | null {
  if (percent == null) return null
  if (percent >= 80) return 'steady'
  if (percent >= 50) return 'mostly'
  return 'varies'
}

/** `avg` = average mood on the 1-5 scale used by useMoodStats. */
export function moodWord(avg: number | null | undefined): MoodWord | null {
  if (avg == null) return null
  if (avg >= 3.5) return 'lighter'
  if (avg >= 2.5) return 'mixed'
  return 'heavier'
}

export const regularityWordKey = (w: RegularityWord) => `cycleWords_regularity_${w}` as const
export const moodWordKey = (w: MoodWord) => `cycleWords_mood_${w}` as const
