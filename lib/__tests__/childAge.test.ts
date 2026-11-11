import { childAgeMonths, formatChildAge } from '../childAge'

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 9, 0)

describe('childAgeMonths — completed months, day-aware', () => {
  it('is 0 until the first monthly birthday', () => {
    expect(childAgeMonths('2026-01-20', at(2026, 2, 5))).toBe(0)
    expect(childAgeMonths('2026-01-20', at(2026, 2, 19))).toBe(0)
    expect(childAgeMonths('2026-01-20', at(2026, 2, 20))).toBe(1)
  })

  it('a child born on the 31st turns 1 month on the last day of a short month', () => {
    expect(childAgeMonths('2026-01-31', at(2026, 2, 1))).toBe(0)
    expect(childAgeMonths('2026-01-31', at(2026, 2, 27))).toBe(0)
    expect(childAgeMonths('2026-01-31', at(2026, 2, 28))).toBe(1)
    expect(childAgeMonths('2026-01-31', at(2026, 4, 30))).toBe(3)
  })

  it('is still 11 months the day before the first birthday', () => {
    expect(childAgeMonths('2025-11-11', at(2026, 11, 10))).toBe(11)
    expect(childAgeMonths('2025-11-10', at(2026, 11, 10))).toBe(12)
  })

  it('leap-day baby turns 1 on Feb 28 of a common year', () => {
    expect(childAgeMonths('2024-02-29', at(2025, 2, 27))).toBe(11)
    expect(childAgeMonths('2024-02-29', at(2025, 2, 28))).toBe(12)
  })

  it('never negative; null for missing or unparseable dates', () => {
    expect(childAgeMonths('2027-01-01', at(2026, 11, 10))).toBe(0)
    expect(childAgeMonths('', at(2026, 11, 10))).toBeNull()
    expect(childAgeMonths('not-a-date', at(2026, 11, 10))).toBeNull()
  })
})

describe('formatChildAge', () => {
  it('a 2-week-old is a newborn, not "1mo"', () => {
    expect(formatChildAge('2026-10-27', at(2026, 11, 10))).toBe(formatChildAge('2026-11-10', at(2026, 11, 10)))
    expect(formatChildAge('2026-10-27', at(2026, 11, 10))).not.toMatch(/1/)
  })

  it('shows 11 months, not "1y", the day before the first birthday', () => {
    expect(formatChildAge('2025-11-11', at(2026, 11, 10))).toMatch(/11/)
  })
})
