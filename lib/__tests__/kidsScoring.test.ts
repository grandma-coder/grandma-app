import { scoreSleep, scoreHealth, scoreNutrition, buildScores, getAgeSleepTarget } from '../kidsScoring'
import type { SleepData, HealthData } from '../analyticsData'

const sleep = (over: Partial<SleepData> = {}): SleepData => ({
  dailyHours: [5, 5, 6, 5, 5, 0, 0],
  qualityCounts: { great: 4, good: 1, restless: 0, poor: 0 },
  weekLabels: ['M','T','W','T','F','S','S'], avgHours: 5.4, hasData: true, ...over,
})

describe('kidsScoring extraction (characterization)', () => {
  it('getAgeSleepTarget matches age bands', () => {
    expect(getAgeSleepTarget(2)).toBe(15)
    expect(getAgeSleepTarget(26)).toBe(12)
  })
  it('scoreSleep returns a 0..10 value for real data', () => {
    const s = scoreSleep(sleep())
    expect(s.hasData).toBe(true)
    expect(s.value).toBeGreaterThanOrEqual(0)
    expect(s.value).toBeLessThanOrEqual(10)
  })
  it('no-data pillars report hasData false', () => {
    expect(scoreSleep(sleep({ hasData: false })).hasData).toBe(false)
  })
})
