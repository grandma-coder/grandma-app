import { toDateStr, dailyFertilityCurve, getDaysLate } from '../cycleLogic'

describe('toDateStr', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    const d = new Date(2026, 4, 11) // May 11 2026 (month is 0-indexed)
    expect(toDateStr(d)).toBe('2026-05-11')
  })

  it('zero-pads single-digit months and days', () => {
    const d = new Date(2026, 0, 3) // Jan 3 2026
    expect(toDateStr(d)).toBe('2026-01-03')
  })

  it('uses local time, not UTC (regression guard)', () => {
    // 2026-05-11 23:30 local in any negative-UTC timezone would be 2026-05-12 in UTC.
    // toDateStr MUST return the local date so evening logs don't shift to "tomorrow".
    const localEvening = new Date(2026, 4, 11, 23, 30, 0)
    expect(toDateStr(localEvening)).toBe('2026-05-11')
  })
})

describe('dailyFertilityCurve', () => {
  it('returns an entry per cycle day', () => {
    expect(dailyFertilityCurve(28)).toHaveLength(28)
    expect(dailyFertilityCurve(30)).toHaveLength(30)
  })

  it('peaks on the two days at and before ovulation', () => {
    const c = dailyFertilityCurve(28, 14)
    // ovulationDay = 28 - 14 = 14 (1-indexed). Indices: day N → c[N-1].
    // Values follow the clinically-reviewed curve (Wilcox NEJM 1995): peak ~33%
    // on ovulation & the day before, ~22% on the shoulders. (Earlier 70/48
    // values overstated conception probability ~2x.)
    expect(c[13]).toBe(33) // day 14 (ovulation)
    expect(c[12]).toBe(33) // day 13 (one before)
    expect(c[14]).toBe(22) // day 15 (one after)
    expect(c[11]).toBe(22) // day 12 (two before)
  })

  it('clamps cycle length to medical range', () => {
    expect(dailyFertilityCurve(10)).toHaveLength(21)
    expect(dailyFertilityCurve(120)).toHaveLength(60)
  })
})

// A late period used to wrap silently into a new predicted cycle (day 35 of 28 read as "day 7,
// next period in 22 days"), hiding the one signal a TTC user most needs.
describe('getDaysLate', () => {
  const cfg = { lastPeriodStart: '2026-10-01', cycleLength: 28, periodLength: 5, lutealPhase: 14 }

  it('is 0 before and on the expected day', () => {
    expect(getDaysLate(cfg, '2026-10-20')).toBe(0)
    expect(getDaysLate(cfg, '2026-10-29')).toBe(0) // expected next start
  })

  it('counts days past the expected start', () => {
    expect(getDaysLate(cfg, '2026-10-30')).toBe(1)
    expect(getDaysLate(cfg, '2026-11-04')).toBe(6)
  })

  it('is 0 with no logged period', () => {
    expect(getDaysLate({ ...cfg, lastPeriodStart: '' }, '2026-11-04')).toBe(0)
  })
})
