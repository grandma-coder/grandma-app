jest.mock('../supabase', () => ({ supabase: {} }))
import { computeCycleHistory } from '../cycleAnalytics'

const start = (date: string) => ({ type: 'period_start', date } as never)

describe('computeCycleHistory', () => {
  it('merges period starts logged a few days apart', () => {
    const h = computeCycleHistory([start('2026-08-01'), start('2026-08-02'), start('2026-08-29'), start('2026-09-26')])
    expect(h.cycles.map((c) => c.startDate)).toEqual(['2026-08-01', '2026-08-29', '2026-09-26'])
    expect(h.avg).toBe(28)
  })

  it('keeps a skipped month out of the average', () => {
    const h = computeCycleHistory([start('2026-06-01'), start('2026-06-29'), start('2026-09-07'), start('2026-10-05')])
    // 28, 70 (missed log, over 60), 28 → average of the plausible ones
    expect(h.avg).toBe(28)
    expect(h.max).toBe(28)
  })

  it('ignores duplicate rows on the same day', () => {
    const h = computeCycleHistory([start('2026-08-01'), start('2026-08-01'), start('2026-08-29')])
    expect(h.cycles).toHaveLength(2)
  })
})
