import { monthsSinceDate, shouldOfferMenopauseUpdate } from '../menopauseStage'

const NOW = new Date('2026-07-25T12:00:00Z')

describe('menopauseStage', () => {
  it('returns null months when no date', () => {
    expect(monthsSinceDate(null, NOW)).toBeNull()
  })
  it('returns null for out-of-range / malformed dates', () => {
    expect(monthsSinceDate('2026-13-01', NOW)).toBeNull()
    expect(monthsSinceDate('2026-02-30', NOW)).toBeNull()
    expect(monthsSinceDate('garbage', NOW)).toBeNull()
  })
  it('counts whole months since a date', () => {
    expect(monthsSinceDate('2026-04-25', NOW)).toBe(3)
    expect(monthsSinceDate('2025-07-25', NOW)).toBe(12)
  })
  it('offers a menopause update only for peri users at >=12 months', () => {
    expect(shouldOfferMenopauseUpdate('peri', '2025-07-25', NOW)).toBe(true) // 12mo
    expect(shouldOfferMenopauseUpdate('peri', '2026-04-25', NOW)).toBe(false) // 3mo
    expect(shouldOfferMenopauseUpdate('meno', '2025-01-01', NOW)).toBe(false) // already meno
    expect(shouldOfferMenopauseUpdate('peri', null, NOW)).toBe(false)
  })
})
