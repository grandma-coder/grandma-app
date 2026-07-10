import { getCycleInfo, getHydrationLevel, DAILY_WATER_GOAL } from '../cycleLogic'

describe('getCycleInfo', () => {
  const baseConfig = { lastPeriodStart: '2026-05-01', cycleLength: 28, periodLength: 5, lutealPhase: 14 }

  it('day 1 of period is menstruation phase', () => {
    const info = getCycleInfo(baseConfig, '2026-05-01')
    expect(info.cycleDay).toBe(1)
    expect(info.phase).toBe('menstruation')
  })

  it('day 5 (last period day) is still menstruation', () => {
    const info = getCycleInfo(baseConfig, '2026-05-05')
    expect(info.cycleDay).toBe(5)
    expect(info.phase).toBe('menstruation')
  })

  it('mid-cycle is follicular before ovulation window', () => {
    const info = getCycleInfo(baseConfig, '2026-05-09') // day 9
    expect(info.cycleDay).toBe(9)
    expect(info.phase).toBe('follicular')
  })

  it('around ovulation day reports ovulation phase', () => {
    // cycleLength 28 - luteal 14 = ovulation day 14 → date = lastPeriodStart + 13 days = 2026-05-14
    const info = getCycleInfo(baseConfig, '2026-05-14')
    expect(info.cycleDay).toBe(14)
    expect(info.phase).toBe('ovulation')
    expect(info.conceptionProbability).toBe('peak')
  })

  it('post-ovulation is luteal phase', () => {
    const info = getCycleInfo(baseConfig, '2026-05-22') // day 22
    expect(info.cycleDay).toBe(22)
    expect(info.phase).toBe('luteal')
  })

  it('fertile window includes the day before ovulation', () => {
    const info = getCycleInfo(baseConfig, '2026-05-13') // day 13
    expect(info.isFertile).toBe(true)
  })

  it('fertile window excludes early follicular days', () => {
    const info = getCycleInfo(baseConfig, '2026-05-07') // day 7
    expect(info.isFertile).toBe(false)
  })

  it('wraps to a new cycle past cycleLength', () => {
    // 30 days after period start, with 28-day cycle → day 3 of next cycle
    const info = getCycleInfo(baseConfig, '2026-05-31')
    expect(info.cycleDay).toBe(3)
    expect(info.phase).toBe('menstruation')
  })

  it('returns empty info when lastPeriodStart is missing', () => {
    const info = getCycleInfo({}, '2026-05-14')
    expect(info.cycleDay).toBe(0)
  })

  // Regression: dates BEFORE lastPeriodStart must project backward into prior
  // cycles, not collapse to a negative cycleDay that reads as menstruation.
  // (JS `-23 % 28 === -23`, so the old `(days % len) + 1` made every past date
  // day <= periodLength → the whole calendar before the last period painted red.)
  describe('dates before lastPeriodStart (backward projection)', () => {
    it('the day before period start is the last day of the previous cycle, NOT menstruation', () => {
      const info = getCycleInfo(baseConfig, '2026-04-30') // 1 day before
      expect(info.cycleDay).toBe(28)
      expect(info.phase).toBe('luteal')
    })

    it('the first day of the previous cycle is menstruation day 1', () => {
      // 28 days before 2026-05-01 = 2026-04-03 → day 1 of the prior cycle
      const info = getCycleInfo(baseConfig, '2026-04-03')
      expect(info.cycleDay).toBe(1)
      expect(info.phase).toBe('menstruation')
    })

    it('a mid-prior-cycle date is not menstruation', () => {
      // 2026-04-12 = day 10 of the prior cycle (follicular), must not read as period
      const info = getCycleInfo(baseConfig, '2026-04-12')
      expect(info.cycleDay).toBe(10)
      expect(info.phase).toBe('follicular')
    })
  })
})

describe('getHydrationLevel', () => {
  it('0 glasses is very low', () => {
    expect(getHydrationLevel(0).label).toBe('Very low')
    expect(getHydrationLevel(0).percentage).toBe(0)
  })

  it('hitting goal returns Great', () => {
    expect(getHydrationLevel(DAILY_WATER_GOAL).label).toBe('Great!')
    expect(getHydrationLevel(DAILY_WATER_GOAL).percentage).toBe(100)
  })

  it('caps percentage at 100 when over goal', () => {
    expect(getHydrationLevel(DAILY_WATER_GOAL + 5).percentage).toBe(100)
  })

  it('halfway returns the halfway label', () => {
    expect(getHydrationLevel(4).label).toBe('Halfway')
  })
})
