import { lastPeriodAfterDelete, monthsSinceDate, shouldOfferMenopauseUpdate } from '../menopauseStage'

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

describe('lastPeriodAfterDelete', () => {
  const p = (date: string) => ({ type: 'period', date })

  it('rolls the stored date back to the newest remaining logged period when that period is deleted', () => {
    // A period logged by mistake today overwrote the stored date; deleting it must not leave the counter at today.
    expect(lastPeriodAfterDelete('2026-11-10', '2026-11-10', [p('2026-11-10'), p('2026-08-03'), { type: 'hot_flash', date: '2026-11-10' }])).toBe('2026-08-03')
  })
  it('clears the stored date when the deleted period was the only one', () => {
    expect(lastPeriodAfterDelete('2026-11-10', '2026-11-10', [p('2026-11-10')])).toBeNull()
  })
  it('keeps the stored date when a different day is deleted', () => {
    expect(lastPeriodAfterDelete('2025-03-01', '2026-11-10', [p('2026-11-10')])).toBe('2025-03-01')
    expect(lastPeriodAfterDelete(null, '2026-11-10', [p('2026-11-10')])).toBeNull()
  })
})
