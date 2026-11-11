// Cycles of 45–60 days are real cycles (decision: allow up to 60 everywhere); gaps over 60 are a
// missed log and stay out of the average and the regularity score.
jest.mock('../supabase', () => ({ supabase: {} }))
import { computeCycleHistory, computeRegularity } from '../cycleAnalytics'
import { getCycleCalendarDay, getCycleInfo, getDaysLate } from '../cycleLogic'
import { CYCLE_LENGTH_RANGE } from '../../store/useCycleSettingsStore'

const start = (date: string) => ({ type: 'period_start', date } as never)

function addDays(d: string, n: number): string {
  const x = new Date(d + 'T12:00:00')
  x.setDate(x.getDate() + n)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

/** Period starts separated by the given gaps, beginning 2026-01-01. */
function starts(gaps: number[]) {
  const out = [start('2026-01-01')]
  let d = '2026-01-01'
  for (const g of gaps) { d = addDays(d, g); out.push(start(d)) }
  return { logs: out, last: d }
}

describe('cycles of 45–60 days', () => {
  it('settings stepper allows up to 60', () => {
    expect(CYCLE_LENGTH_RANGE.max).toBe(60)
  })

  it('steady 50-day cycles average 50, not the 28 fallback', () => {
    const h = computeCycleHistory(starts([50, 50, 50]).logs)
    expect(h.avg).toBe(50)
    expect(h.min).toBe(50)
    expect(h.max).toBe(50)
  })

  it('a 60-day cycle still counts; a 61-day gap is a missed log', () => {
    expect(computeCycleHistory(starts([60, 60]).logs).avg).toBe(60)
    const h = computeCycleHistory(starts([50, 61, 50]).logs)
    expect(h.avg).toBe(50)
    expect(h.max).toBe(50)
  })

  it('a 50-day user is not late on day 40 of the cycle', () => {
    const { logs, last } = starts([50, 50, 50])
    const avg = computeCycleHistory(logs).avg as number
    expect(getDaysLate({ lastPeriodStart: last, cycleLength: avg }, addDays(last, 40))).toBe(0)
    expect(getDaysLate({ lastPeriodStart: last, cycleLength: avg }, addDays(last, 52))).toBe(2)
  })

  it('calendar keeps phase estimates for a past 55-day cycle', () => {
    const { logs } = starts([55])
    const h = computeCycleHistory(logs)
    const inp = { cycles: h.cycles, cycleLength: 55, periodLength: 5, lutealPhase: 14 }
    const ov = getCycleCalendarDay(inp, addDays('2026-01-01', 40), addDays('2026-01-01', 70))
    expect(ov.isOvulation).toBe(true)
    expect(getCycleInfo({ lastPeriodStart: '2026-01-01', cycleLength: 55 }, '2026-01-01').cycleLength).toBe(55)
  })
})

describe('computeRegularity', () => {
  it('does not count a missed-log gap (>60) as an irregular cycle', () => {
    const h = computeCycleHistory(starts([30, 29, 90, 30, 31]).logs)
    const r = computeRegularity(h)
    expect(r.percent).toBe(100)
    expect(r.deviations.map((d) => d.lengthDays)).toEqual([30, 29, 30, 31])
  })

  it('counts long but real cycles normally', () => {
    const r = computeRegularity(computeCycleHistory(starts([50, 51, 50, 58]).logs))
    expect(r.deviations).toHaveLength(4)
    expect(r.percent).toBe(75)
  })

  it('needs three counted cycles', () => {
    expect(computeRegularity(computeCycleHistory(starts([30, 90, 30]).logs)).percent).toBeNull()
  })
})
