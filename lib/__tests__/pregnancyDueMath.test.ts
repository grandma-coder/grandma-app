import { getCurrentWeekFromDueDate, getDaysToGo } from '../pregnancyData'

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h)

describe('pregnancy due-date math', () => {
  it('week is stable across the day and independent of time of day', () => {
    for (const h of [0, 1, 12, 23]) {
      expect(getCurrentWeekFromDueDate('2026-12-01', at(2026, 12, 1, h))).toBe(40)
    }
  })
  it('very early weeks clamp to 1', () => {
    expect(getCurrentWeekFromDueDate('2027-08-01', at(2026, 11, 5))).toBe(1)
  })
  it('past the due date: week 41 then clamped at 42, days to go never negative', () => {
    expect(getCurrentWeekFromDueDate('2026-11-01', at(2026, 11, 5))).toBe(40)
    expect(getCurrentWeekFromDueDate('2026-10-25', at(2026, 11, 5))).toBe(41)
    expect(getCurrentWeekFromDueDate('2026-01-01', at(2026, 11, 5))).toBe(42)
    expect(getDaysToGo('2026-10-25', at(2026, 11, 5))).toBe(0)
  })
  it('days to go counts whole calendar days', () => {
    expect(getDaysToGo('2026-11-15', at(2026, 11, 5, 23))).toBe(10)
    expect(getDaysToGo('2026-11-15', at(2026, 11, 5, 0))).toBe(10)
  })
  it('garbage date falls back to week 1', () => {
    expect(getCurrentWeekFromDueDate('nope', at(2026, 11, 5))).toBe(1)
  })
})
