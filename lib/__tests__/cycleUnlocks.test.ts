/**
 * Tests for cycleUnlocks — pure helper computing per-metric lock/progress
 * from cycle data counts. No React, no app state — pure functions only.
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

import { cycleUnlocks, CycleUnlockInput, LockState } from '../cycleUnlocks'

describe('cycleUnlocks', () => {
  describe('all-zero input', () => {
    it('returns all metrics locked with current:0, target as specified', () => {
      const input: CycleUnlockInput = {
        cyclesClosed: 0,
        periodsLogged: 0,
        bbtReadings: 0,
        symptomCount: 0,
        moodCount: 0,
        intercourseCount: 0,
      }

      const result = cycleUnlocks(input)

      // All should be locked
      expect(result.cycleLength).toEqual({ locked: true, current: 0, target: 1 })
      expect(result.regularity).toEqual({ locked: true, current: 0, target: 3 })
      expect(result.fertile).toEqual({ locked: true, current: 0, target: 1 })
      expect(result.bbt).toEqual({ locked: true, current: 0, target: 1 })
      expect(result.pms).toEqual({ locked: true, current: 0, target: 1 })
      expect(result.mood).toEqual({ locked: true, current: 0, target: 1 })
      expect(result.intercourse).toEqual({ locked: true, current: 0, target: 1 })
    })
  })

  describe('cyclesClosed:2, periodsLogged:2', () => {
    it('unlocks cycleLength and fertile, but regularity still locked', () => {
      const input: CycleUnlockInput = {
        cyclesClosed: 2,
        periodsLogged: 2,
        bbtReadings: 0,
        symptomCount: 0,
        moodCount: 0,
        intercourseCount: 0,
      }

      const result = cycleUnlocks(input)

      // cycleLength: target 1, current min(2, 1) = 1, locked = false
      expect(result.cycleLength).toEqual({ locked: false, current: 1, target: 1 })

      // fertile: target 1, current min(2, 1) = 1, locked = false
      expect(result.fertile).toEqual({ locked: false, current: 1, target: 1 })

      // regularity: target 3, current min(2, 3) = 2, locked = true (2 < 3)
      expect(result.regularity).toEqual({ locked: true, current: 2, target: 3 })
    })
  })

  describe('cyclesClosed:3', () => {
    it('unlocks regularity with current:3, target:3', () => {
      const input: CycleUnlockInput = {
        cyclesClosed: 3,
        periodsLogged: 0,
        bbtReadings: 0,
        symptomCount: 0,
        moodCount: 0,
        intercourseCount: 0,
      }

      const result = cycleUnlocks(input)

      // regularity: target 3, current min(3, 3) = 3, locked = false (3 >= 3)
      expect(result.regularity).toEqual({ locked: false, current: 3, target: 3 })

      // cycleLength also unlocked (current 1)
      expect(result.cycleLength).toEqual({ locked: false, current: 1, target: 1 })
    })
  })

  describe('high counts on single-target metrics', () => {
    it('clamps current to target for single-count metrics', () => {
      const input: CycleUnlockInput = {
        cyclesClosed: 0,
        periodsLogged: 0,
        bbtReadings: 5, // well above target
        symptomCount: 0,
        moodCount: 1,
        intercourseCount: 0,
      }

      const result = cycleUnlocks(input)

      // bbt: target 1, current min(5, 1) = 1, locked = false
      expect(result.bbt).toEqual({ locked: false, current: 1, target: 1 })

      // mood: target 1, current min(1, 1) = 1, locked = false
      expect(result.mood).toEqual({ locked: false, current: 1, target: 1 })

      // intercourse: target 1, current min(0, 1) = 0, locked = true
      expect(result.intercourse).toEqual({ locked: true, current: 0, target: 1 })
    })
  })

  describe('pms symptom count', () => {
    it('locks pms when symptomCount is 0, unlocks when > 0', () => {
      const lockedInput: CycleUnlockInput = {
        cyclesClosed: 0,
        periodsLogged: 0,
        bbtReadings: 0,
        symptomCount: 0,
        moodCount: 0,
        intercourseCount: 0,
      }

      const unlockedInput: CycleUnlockInput = {
        cyclesClosed: 0,
        periodsLogged: 0,
        bbtReadings: 0,
        symptomCount: 3, // at least 1
        moodCount: 0,
        intercourseCount: 0,
      }

      expect(cycleUnlocks(lockedInput).pms).toEqual({
        locked: true,
        current: 0,
        target: 1,
      })

      expect(cycleUnlocks(unlockedInput).pms).toEqual({
        locked: false,
        current: 1,
        target: 1,
      })
    })
  })

  describe('all metrics independent', () => {
    it('unlocks only the metrics with sufficient data', () => {
      const input: CycleUnlockInput = {
        cyclesClosed: 5, // unlocks cycleLength + regularity
        periodsLogged: 2, // unlocks fertile
        bbtReadings: 0, // locked
        symptomCount: 1, // unlocks pms
        moodCount: 0, // locked
        intercourseCount: 1, // unlocks intercourse
      }

      const result = cycleUnlocks(input)

      expect(result.cycleLength.locked).toBe(false)
      expect(result.regularity.locked).toBe(false)
      expect(result.fertile.locked).toBe(false)
      expect(result.bbt.locked).toBe(true)
      expect(result.pms.locked).toBe(false)
      expect(result.mood.locked).toBe(true)
      expect(result.intercourse.locked).toBe(false)
    })
  })
})
