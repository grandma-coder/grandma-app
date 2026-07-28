import { computeSymptomStats, computeVasomotorFrequency } from '../menopauseAnalytics'

const rows = [
  { date: '2026-07-01', type: 'hot_flash', value: null, severity: 4 },
  { date: '2026-07-01', type: 'hot_flash', value: null, severity: 2 },
  { date: '2026-07-02', type: 'night_sweat', value: null, severity: 3 },
  { date: '2026-07-02', type: 'sleep', value: null, severity: 5 },
  { date: '2026-07-02', type: 'period', value: 'light', severity: null },
]

describe('menopauseAnalytics', () => {
  it('counts symptoms and averages severity, ignoring events', () => {
    const stats = computeSymptomStats(rows)
    const hot = stats.find((s) => s.id === 'hot_flash')!
    expect(hot.count).toBe(2)
    expect(hot.avgSeverity).toBe(3) // (4+2)/2
    expect(stats.find((s) => s.id === 'period')).toBeUndefined() // events excluded
    expect(stats[0].count).toBeGreaterThanOrEqual(stats[stats.length - 1].count) // sorted desc
  })
  it('sums vasomotor events per day', () => {
    const vaso = computeVasomotorFrequency(rows)
    expect(vaso.find((d) => d.date === '2026-07-01')!.count).toBe(2) // two hot flashes
    expect(vaso.find((d) => d.date === '2026-07-02')!.count).toBe(1) // one night sweat
  })
})
