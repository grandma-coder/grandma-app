/**
 * Pure helper computing per-metric lock/progress from cycle data counts.
 *
 * No React, no app state — pure functions only.
 * Thresholds are baked in; returns display state for each unlock metric.
 */

export type CycleMetricKey = 'cycleLength' | 'regularity' | 'fertile' | 'bbt' | 'pms' | 'mood' | 'intercourse'

export interface LockState {
  locked: boolean
  current: number
  target: number
}

export interface CycleUnlockInput {
  cyclesClosed: number
  periodsLogged: number
  bbtReadings: number
  symptomCount: number
  moodCount: number
  intercourseCount: number
}

/**
 * Compute lock/unlock state for each cycle metric.
 *
 * Thresholds:
 * - cycleLength: target 1 (need 1 closed cycle)
 * - regularity: target 3 (need 3 closed cycles for pattern)
 * - fertile: target 1 (need 1 period logged)
 * - bbt: target 1 (need 1 basal body temp reading)
 * - pms: target 1 (need 1 symptom count)
 * - mood: target 1 (need 1 mood log)
 * - intercourse: target 1 (need 1 intercourse log)
 */
export function cycleUnlocks(input: CycleUnlockInput): Record<CycleMetricKey, LockState> {
  const computeLock = (current: number, target: number): LockState => ({
    locked: current < target,
    current: Math.min(current, target),
    target,
  })

  return {
    cycleLength: computeLock(input.cyclesClosed, 1),
    regularity: computeLock(input.cyclesClosed, 3),
    fertile: computeLock(input.periodsLogged, 1),
    bbt: computeLock(input.bbtReadings, 1),
    pms: computeLock(input.symptomCount, 1),
    mood: computeLock(input.moodCount, 1),
    intercourse: computeLock(input.intercourseCount, 1),
  }
}
