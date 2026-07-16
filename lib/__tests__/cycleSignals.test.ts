import {
  computeBBTStats,
  computeMucusStats,
  computeIntercourseStats,
  type CycleLogRow,
  type CycleHistory,
} from '../cycleAnalytics'

function log(partial: Partial<CycleLogRow> & { date: string; type: CycleLogRow['type'] }): CycleLogRow {
  return { id: partial.date + partial.type, user_id: 'u', value: null, notes: null, created_at: '', ...partial }
}

// A single open cycle starting 2026-07-01 (so "current cycle" = from Jul 1).
const HISTORY: CycleHistory = {
  cycles: [{ startDate: '2026-07-01', endDate: null, lengthDays: null }],
  avg: 28, min: 28, max: 28,
}

describe('computeBBTStats', () => {
  test('empty when < 3 readings', () => {
    const r = computeBBTStats([log({ date: '2026-07-02', type: 'basal_temp', value: '36.4' })], HISTORY)
    expect(r.shiftDay).toBeNull()
    expect(r.series).toHaveLength(1)
  })

  test('detects the biphasic thermal shift', () => {
    // 7 low days ~36.4, then a jump to 36.7 (>= priorMax+0.2) on cycle day 8.
    const temps = ['36.4', '36.3', '36.4', '36.5', '36.4', '36.3', '36.4', '36.7', '36.8']
    const logs = temps.map((v, i) => log({ date: `2026-07-0${i + 1}`.replace('07-0', '07-0'), type: 'basal_temp', value: v }))
    // build proper dates Jul 1..9
    const fixed = temps.map((v, i) => {
      const d = new Date('2026-07-01T00:00:00'); d.setDate(1 + i)
      return log({ date: d.toISOString().slice(0, 10), type: 'basal_temp', value: v })
    })
    const r = computeBBTStats(fixed, HISTORY)
    expect(r.shiftDay).toBe(8)
    expect(r.coverline).toBe(36.6) // priorMax 36.5 + 0.1
    expect(r.series[0].cycleDay).toBe(1)
  })

  test('ignores non-numeric + pre-cycle readings', () => {
    const r = computeBBTStats([
      log({ date: '2026-06-20', type: 'basal_temp', value: '36.5' }), // before cycle start
      log({ date: '2026-07-02', type: 'basal_temp', value: 'oops' }),  // non-numeric
    ], HISTORY)
    expect(r.series).toHaveLength(0)
  })
})

describe('computeMucusStats', () => {
  test('counts fertile-quality days + finds last egg-white peak', () => {
    const r = computeMucusStats([
      log({ date: '2026-07-03', type: 'cervical_mucus', value: 'dry' }),
      log({ date: '2026-07-10', type: 'cervical_mucus', value: 'watery' }),
      log({ date: '2026-07-12', type: 'cervical_mucus', value: 'eggwhite' }),
      log({ date: '2026-07-13', type: 'cervical_mucus', value: 'eggwhite' }),
      log({ date: '2026-07-15', type: 'cervical_mucus', value: 'creamy' }),
    ], HISTORY)
    expect(r.fertileDays).toBe(3) // watery + 2 eggwhite
    expect(r.peakDay).toBe(13)    // day-of-cycle of the LAST eggwhite (Jul 13 = day 13)
    expect(r.series).toHaveLength(5)
  })

  test('empty when nothing logged', () => {
    expect(computeMucusStats([], HISTORY)).toEqual({ series: [], fertileDays: 0, peakDay: null })
  })
})

describe('computeIntercourseStats', () => {
  test('counts marks this cycle and flags fertile-window overlap', () => {
    // avg 28, ovulation ~ day 14 → fertile window roughly days 10–15 from Jul 1.
    const r = computeIntercourseStats([
      log({ date: '2026-07-03', type: 'intercourse', value: 'unprotected' }), // day 3 — not fertile
      log({ date: '2026-07-12', type: 'intercourse', value: 'unprotected' }), // ~day 12 — fertile
      log({ date: '2026-07-13', type: 'intercourse', value: 'protected' }),   // ~day 13 — fertile
    ], HISTORY)
    expect(r.thisCycleCount).toBe(3)
    expect(r.inFertileWindow).toBeGreaterThanOrEqual(1)
    expect(r.recent[0].date).toBe('2026-07-13') // newest first
  })
})
