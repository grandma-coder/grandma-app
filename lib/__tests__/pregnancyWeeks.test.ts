import { getTrimester, weekForDate, getWeekInfo } from '../pregnancyWeeks'

describe('getTrimester', () => {
  it('weeks 1-13 are trimester 1', () => {
    expect(getTrimester(1)).toBe(1)
    expect(getTrimester(13)).toBe(1)
  })
  it('weeks 14-26 are trimester 2', () => {
    expect(getTrimester(14)).toBe(2)
    expect(getTrimester(26)).toBe(2)
  })
  it('weeks 27+ are trimester 3', () => {
    expect(getTrimester(27)).toBe(3)
    expect(getTrimester(40)).toBe(3)
  })
})

describe('weekForDate', () => {
  it('returns 40 on the due date itself', () => {
    expect(weekForDate('2026-12-01', '2026-12-01')).toBe(40)
  })

  it('returns 1 ~40 weeks before due date', () => {
    // 280 days before 2026-12-01 = 2026-02-25
    expect(weekForDate('2026-12-01', '2026-02-25')).toBe(1)
  })

  it('returns 20 ~20 weeks before due date', () => {
    // 20 weeks before = 140 days before 2026-12-01 → 2026-07-14
    expect(weekForDate('2026-12-01', '2026-07-14')).toBe(20)
  })

  it('clamps to 42 past due date', () => {
    expect(weekForDate('2026-01-01', '2027-01-01')).toBe(42)
  })

  it('clamps to 1 far before due date', () => {
    expect(weekForDate('2026-12-01', '2020-01-01')).toBe(1)
  })
})

describe('getWeekInfo', () => {
  it('clamps below 4 to week-4 entry', () => {
    expect(getWeekInfo(1)).toEqual(getWeekInfo(4))
  })
  it('clamps above 40 to week-40 entry', () => {
    expect(getWeekInfo(45)).toEqual(getWeekInfo(40))
  })
  it('returns a defined size string', () => {
    expect(typeof getWeekInfo(20).size).toBe('string')
  })
})
