jest.mock('../supabase', () => ({ supabase: {} }))
import { getCycleCalendarDay, getCycleInfo, type CycleCalendarInput } from '../cycleLogic'
import { computeCycleHistory } from '../cycleAnalytics'

const log = (type: string, date: string) => ({ type, date } as never)

function input(logs: never[], cycleLength = 28, periodLength = 5, lutealPhase = 14): CycleCalendarInput {
  const h = computeCycleHistory(logs)
  return { cycles: h.cycles, cycleLength, periodLength, lutealPhase }
}

describe('getCycleCalendarDay', () => {
  it('shows nothing with no logged period', () => {
    const d = getCycleCalendarDay(input([]), '2026-11-04', '2026-11-04')
    expect(d.cycleDay).toBeNull()
    expect(d.phase).toBeNull()
    expect(d.isPeriod).toBe(false)
  })

  it('does not invent periods before the first logged one', () => {
    const inp = input([log('period_start', '2026-10-20')])
    // 28 days earlier would be a back-projected "period" — must stay blank.
    expect(getCycleCalendarDay(inp, '2026-09-22', '2026-11-04').isPeriod).toBe(false)
    expect(getCycleCalendarDay(inp, '2026-10-19', '2026-11-04').cycleDay).toBeNull()
    expect(getCycleCalendarDay(inp, '2026-10-20', '2026-11-04')).toMatchObject({ cycleDay: 1, isPeriod: true, predicted: false })
  })

  it('uses each past cycle\'s real length, not the current average', () => {
    // 32-day cycle, then a 26-day cycle, current one open.
    const inp = input([log('period_start', '2026-08-01'), log('period_start', '2026-09-02'), log('period_start', '2026-09-28')], 28)
    // Ovulation in the 32-day cycle is day 18 (32 − 14) → Aug 18.
    expect(getCycleCalendarDay(inp, '2026-08-18', '2026-10-10')).toMatchObject({ cycleDay: 18, isOvulation: true, predicted: false })
    // The day before the second start is still the first cycle (day 32), not a projected period.
    expect(getCycleCalendarDay(inp, '2026-09-01', '2026-10-10')).toMatchObject({ cycleDay: 32, isPeriod: false })
    expect(getCycleCalendarDay(inp, '2026-09-02', '2026-10-10')).toMatchObject({ cycleDay: 1, isPeriod: true })
  })

  it('uses a logged period end for that cycle\'s bleeding days', () => {
    const inp = input([log('period_start', '2026-10-01'), log('period_end', '2026-10-03')], 28, 5)
    expect(getCycleCalendarDay(inp, '2026-10-03', '2026-10-10').isPeriod).toBe(true)
    expect(getCycleCalendarDay(inp, '2026-10-04', '2026-10-10').isPeriod).toBe(false)
  })

  it('falls back to the period-length setting when no end is logged', () => {
    const inp = input([log('period_start', '2026-10-01')], 28, 6)
    expect(getCycleCalendarDay(inp, '2026-10-06', '2026-10-10').isPeriod).toBe(true)
    expect(getCycleCalendarDay(inp, '2026-10-07', '2026-10-10').isPeriod).toBe(false)
  })

  it('marks the rest of an ongoing period and future cycles as estimates', () => {
    const inp = input([log('period_start', '2026-11-03')], 28, 5)
    expect(getCycleCalendarDay(inp, '2026-11-04', '2026-11-04')).toMatchObject({ isPeriod: true, predicted: false })
    expect(getCycleCalendarDay(inp, '2026-11-05', '2026-11-04')).toMatchObject({ isPeriod: true, predicted: true })
    // Next period estimated on Dec 1 (start + 28).
    expect(getCycleCalendarDay(inp, '2026-12-01', '2026-11-04')).toMatchObject({ cycleDay: 1, isPeriod: true, predicted: true })
  })

  it('follows a cycle-length setting change', () => {
    const inp = input([log('period_start', '2026-11-01')], 32)
    expect(getCycleCalendarDay(inp, '2026-12-03', '2026-11-04')).toMatchObject({ cycleDay: 1, isPeriod: true })
    expect(getCycleCalendarDay(inp, '2026-11-29', '2026-11-04').isPeriod).toBe(false)
  })

  it('pauses estimates when the period is late', () => {
    const inp = input([log('period_start', '2026-10-01')], 28)
    const today = '2026-11-01' // expected Oct 29 → 3 days late
    expect(getCycleCalendarDay(inp, '2026-10-29', today)).toMatchObject({ isPeriod: false, phase: null, cycleDay: 29 })
    expect(getCycleCalendarDay(inp, today, today)).toMatchObject({ daysLate: 3, isPeriod: false, phase: null })
    // Nothing invented after today.
    expect(getCycleCalendarDay(inp, '2026-11-10', today)).toMatchObject({ cycleDay: null, isPeriod: false, isFertile: false })
    // Earlier days of that cycle keep their phases.
    expect(getCycleCalendarDay(inp, '2026-10-02', today).isPeriod).toBe(true)
  })

  it('merges duplicate / overlapping starts into one cycle', () => {
    const inp = input([log('period_start', '2026-10-01'), log('period_start', '2026-10-03'), log('period_start', '2026-10-01')])
    expect(inp.cycles).toHaveLength(1)
    expect(getCycleCalendarDay(inp, '2026-10-03', '2026-10-10')).toMatchObject({ cycleDay: 3, isPeriod: true })
  })

  it('shows only the period for an implausibly long past cycle (missed log)', () => {
    const inp = input([log('period_start', '2026-06-01'), log('period_start', '2026-07-27')])
    expect(getCycleCalendarDay(inp, '2026-06-02', '2026-08-01').isPeriod).toBe(true)
    const mid = getCycleCalendarDay(inp, '2026-07-12', '2026-08-01')
    expect(mid.isFertile).toBe(false)
    expect(mid.isOvulation).toBe(false)
  })
})

describe('computeCycleHistory — period end', () => {
  it('keeps the latest end inside the period and ignores stray ones', () => {
    const h = computeCycleHistory([
      log('period_start', '2026-09-01'), log('period_end', '2026-09-04'), log('period_end', '2026-09-06'),
      log('period_end', '2026-09-20'), // stray: 19 days in
      log('period_start', '2026-09-29'),
    ])
    expect(h.cycles[0].periodEnd).toBe('2026-09-06')
    expect(h.cycles[1].periodEnd).toBeNull()
  })
})

describe('day math across DST', () => {
  // Jest runs in the machine zone; these checks only bite in a DST zone (CI sets TZ below).
  it('counts cycle days across a spring-forward change', () => {
    // US DST 2026 starts Mar 8. Mar 1 → Mar 20 is 19 days → cycle day 20.
    expect(getCycleInfo({ lastPeriodStart: '2026-03-01', cycleLength: 28 }, '2026-03-20').cycleDay).toBe(20)
    // EU DST 2026 starts Mar 29.
    expect(getCycleInfo({ lastPeriodStart: '2026-03-20', cycleLength: 28 }, '2026-04-05').cycleDay).toBe(17)
  })

  it('keeps cycle lengths and end dates across DST', () => {
    const h = computeCycleHistory([log('period_start', '2026-03-01'), log('period_start', '2026-03-29')])
    expect(h.cycles[0].lengthDays).toBe(28)
    expect(h.cycles[0].endDate).toBe('2026-03-28')
  })
})
