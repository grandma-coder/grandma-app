/**
 * menopauseDayLoad — how much a day carried, for the calendar's soft day tint.
 *
 * Score = sum of the day's symptom intensities (1–5 each). A symptom saved without an
 * intensity weighs the middle step (3), so a plain count still moves the tint.
 * Period / HRT / notes are events, not symptoms, and don't add to the score.
 *
 * The level only picks a tint shade (none → light → medium → heavy). It is never shown
 * as a number or a grade.
 */
import { resolveMenopauseSymptomId } from './menopauseSymptoms'

export type MenopauseDayLevel = 0 | 1 | 2 | 3

const UNRATED_WEIGHT = 3
/** Score at which a day reaches level 2 (medium) and 3 (heavy). */
const MEDIUM_FROM = 5
const HEAVY_FROM = 10

export function menopauseDayScore(rows: readonly { type: string; severity: number | null }[]): number {
  let score = 0
  for (const r of rows) {
    if (!resolveMenopauseSymptomId(r.type)) continue
    const sev = r.severity == null ? UNRATED_WEIGHT : Math.max(1, Math.min(5, r.severity))
    score += sev
  }
  return score
}

/** 0 = nothing logged · 1 = light (one mild/moderate symptom) · 2 = medium · 3 = heavy. */
export function menopauseDayLevel(rows: readonly { type: string; severity: number | null }[]): MenopauseDayLevel {
  const score = menopauseDayScore(rows)
  if (score <= 0) return 0
  if (score < MEDIUM_FROM) return 1
  if (score < HEAVY_FROM) return 2
  return 3
}

/** Alpha suffixes (8-digit hex) for the peach tint per level, light and dark theme. */
const ALPHA_LIGHT = ['', '47', '8C', 'D9'] as const
const ALPHA_DARK = ['', '33', '5C', '8A'] as const

/** `peach` + alpha for the level, or undefined for an empty day. */
export function menopauseDayTint(level: MenopauseDayLevel, peach: string, isDark: boolean): string | undefined {
  if (level === 0) return undefined
  return peach + (isDark ? ALPHA_DARK : ALPHA_LIGHT)[level]
}
