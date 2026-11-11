import { parseLocalDate } from '../localDate'

describe('parseLocalDate', () => {
  it('reads a bare day as local midnight (not UTC midnight)', () => {
    const d = parseLocalDate('2026-11-01')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 1, 0])
  })

  it('leaves full timestamps alone', () => {
    expect(parseLocalDate('2026-11-01T12:30:00Z').toISOString()).toBe('2026-11-01T12:30:00.000Z')
  })
})

import { getAgeMonths, getFeedingStage } from '../../store/useGoalsStore'

describe('kids goals age (store/useGoalsStore)', () => {
  it('counts completed months, not calendar-month changes', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 10, 9, 0))
    try {
      // Born Oct 25 → 16 days old on Nov 10, not "1 month".
      expect(getAgeMonths('2026-10-25')).toBe(0)
      // Born May 31 → 5 months on Nov 10: still the milk-only stage, not "mixed".
      expect(getFeedingStage('2026-05-31')).toBe('liquid')
      expect(getAgeMonths('')).toBe(24)
    } finally {
      jest.useRealTimers()
    }
  })
})

import { fullMonthsBetween } from '../localDate'

describe('fullMonthsBetween', () => {
  const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)
  it('only counts a month once its day is reached', () => {
    expect(fullMonthsBetween(d(2026, 10, 25), d(2026, 11, 10))).toBe(0)
    expect(fullMonthsBetween(d(2026, 10, 25), d(2026, 11, 25))).toBe(1)
    expect(fullMonthsBetween(d(2025, 11, 25), d(2026, 11, 24))).toBe(11)
    expect(fullMonthsBetween(d(2025, 11, 25), d(2026, 11, 25))).toBe(12)
  })
  it('treats the last day of a shorter month as a full month', () => {
    expect(fullMonthsBetween(d(2026, 1, 31), d(2026, 2, 28))).toBe(1)
    expect(fullMonthsBetween(d(2026, 1, 31), d(2026, 2, 27))).toBe(0)
  })
})

import { calendarDaysBetween } from '../localDate'

describe('calendarDaysBetween', () => {
  it('counts calendar days, not 24h blocks (23:00 yesterday is 1 day ago at 08:00)', () => {
    expect(calendarDaysBetween(new Date(2026, 10, 8, 23, 0), new Date(2026, 10, 9, 8, 0))).toBe(1)
    expect(calendarDaysBetween(new Date(2026, 10, 9, 0, 5), new Date(2026, 10, 9, 23, 55))).toBe(0)
    expect(calendarDaysBetween(new Date(2026, 10, 2, 12), new Date(2026, 10, 9, 1))).toBe(7)
  })
  it('is whole days across a DST change', () => {
    expect(calendarDaysBetween(new Date(2026, 2, 7, 12), new Date(2026, 2, 9, 12))).toBe(2)
  })
})

import { clockHoursApart } from '../localDate'

describe('clockHoursApart', () => {
  it('wraps midnight: a 00:30 log is 1h from a 23:00 routine', () => {
    expect(clockHoursApart(0, 23)).toBe(1)
    expect(clockHoursApart(23, 1)).toBe(2)
    expect(clockHoursApart(7, 21)).toBe(10)
    expect(clockHoursApart(9, 9)).toBe(0)
  })
})
