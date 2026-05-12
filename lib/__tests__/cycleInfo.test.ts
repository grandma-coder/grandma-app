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
