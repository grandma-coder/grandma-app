/**
 * Fertile-window confidence score.
 *
 * Inputs: cycle history + recent BBT / LH log windows.
 * Outputs: an integer 0–100 + a one-line explainer key.
 *
 * Tiers:
 *   60–70   calendar only (depends on cycle count)
 *   80      calendar + 7 days BBT
 *   92      calendar + 7 days BBT + 3 days LH
 *   96      BBT post-ovulation shift confirmed
 */

export interface ConfidenceInputs {
  cycleCount: number
  bbtCount7d: number
  lhCount3d: number
  shiftConfirmed: boolean
}

export interface ConfidenceResult {
  pct: number
  explainerKey: string
}

export function computeFertileConfidence(input: ConfidenceInputs): ConfidenceResult {
  if (input.shiftConfirmed) {
    return { pct: 96, explainerKey: 'cycle_conf_shift_confirmed' }
  }
  if (input.bbtCount7d >= 7 && input.lhCount3d >= 3) {
    return { pct: 92, explainerKey: 'cycle_conf_bbt_lh' }
  }
  if (input.bbtCount7d >= 7) {
    return { pct: 80, explainerKey: 'cycle_conf_bbt_only' }
  }
  // Calendar only: 1 cycle → 60, 4+ cycles → 70.
  const pct = Math.min(70, 60 + Math.max(0, input.cycleCount - 1) * 3)
  return { pct, explainerKey: 'cycle_conf_calendar' }
}

/** Detect a post-ovulation BBT shift in the most recent BBT readings. */
export function detectBBTShift(values: number[]): boolean {
  if (values.length < 7) return false
  const recent = values.slice(-3)
  const prior = values.slice(0, -3).slice(-4)
  if (prior.length < 3) return false
  const r = recent.reduce((a, b) => a + b, 0) / recent.length
  const p = prior.reduce((a, b) => a + b, 0) / prior.length
  return r - p >= 0.25
}
