import { pickForCycleDay, sliceForCycleDay } from '../cyclePhaseRotation'

describe('pickForCycleDay', () => {
  const pool = ['a', 'b', 'c']

  it('is deterministic for the same cycle day', () => {
    expect(pickForCycleDay(pool, 5)).toBe(pickForCycleDay(pool, 5))
  })

  it('advances across consecutive days', () => {
    expect(pickForCycleDay(pool, 1)).not.toBe(pickForCycleDay(pool, 2))
  })

  it('is 1-based: cycle day 1 returns the first item', () => {
    expect(pickForCycleDay(pool, 1)).toBe('a')
  })

  it('wraps around when cycleDay exceeds pool length', () => {
    expect(pickForCycleDay(pool, 4)).toBe('a')
  })

  it('handles a single-item pool', () => {
    expect(pickForCycleDay(['only'], 99)).toBe('only')
  })

  it('returns undefined for an empty pool', () => {
    expect(pickForCycleDay([], 3)).toBeUndefined()
  })

  it('guards against non-positive cycle days', () => {
    expect(pickForCycleDay(pool, 0)).toBe('c')
    expect(pickForCycleDay(pool, -1)).toBe('b')
  })
})

describe('sliceForCycleDay', () => {
  const pool = ['a', 'b', 'c', 'd']

  it('returns the requested count', () => {
    expect(sliceForCycleDay(pool, 1, 2)).toHaveLength(2)
  })

  it('is stable for the same day', () => {
    expect(sliceForCycleDay(pool, 3, 2)).toEqual(sliceForCycleDay(pool, 3, 2))
  })

  it('advances across days', () => {
    expect(sliceForCycleDay(pool, 1, 2)).not.toEqual(sliceForCycleDay(pool, 2, 2))
  })

  it('wraps without going out of bounds', () => {
    expect(sliceForCycleDay(pool, 4, 2)).toEqual(['d', 'a'])
  })

  it('caps count at pool length and never duplicates within a slice', () => {
    expect(sliceForCycleDay(pool, 1, 10)).toHaveLength(4)
  })

  it('returns [] for an empty pool', () => {
    expect(sliceForCycleDay([], 1, 2)).toEqual([])
  })
})
