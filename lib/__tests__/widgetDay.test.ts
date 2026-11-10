import { pickDay, isStale, shiftSeries } from '../widgets/day'
import type { WidgetEntry } from '../widgets/types'

const entry = {
  todayFor: '2026-11-09',
  days: ['2026-11-09', '2026-11-10', '2026-11-11'].map((date) => ({ date, title: date, subtitle: '' })),
} as unknown as WidgetEntry

describe('widget day picking', () => {
  it('picks the exact date', () => expect(pickDay(entry, '2026-11-10')?.title).toBe('2026-11-10'))
  it('has no line once today is past the range (never a frozen day)', () => expect(pickDay(entry, '2026-11-20')).toBeNull())
  it('falls back to the first day before the range', () => expect(pickDay(entry, '2026-11-01')?.title).toBe('2026-11-09'))
  it('is stale once today is after todayFor', () => {
    expect(isStale(entry, '2026-11-09')).toBe(false)
    expect(isStale(entry, '2026-11-10')).toBe(true)
  })
  it('shifts a 7-day series left, padding with zeros', () => {
    expect(shiftSeries([1, 2, 3, 4, 5, 6, 7], 2)).toEqual([3, 4, 5, 6, 7, 0, 0])
    expect(shiftSeries([1, 2, 3, 4, 5, 6, 7], 0)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(shiftSeries([1, 2, 3, 4, 5, 6, 7], 9)).toEqual([0, 0, 0, 0, 0, 0, 0])
  })
})
