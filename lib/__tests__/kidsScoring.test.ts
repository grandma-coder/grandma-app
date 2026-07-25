import { scoreSleep, scoreHealth, scoreNutrition, buildScores, getAgeSleepTarget, dataConfidence } from '../kidsScoring'
import type { SleepData, HealthData, NutritionData } from '../analyticsData'

const sleep = (over: Partial<SleepData> = {}): SleepData => ({
  dailyHours: [5, 5, 6, 5, 5, 0, 0],
  qualityCounts: { great: 4, good: 1, restless: 0, poor: 0 },
  weekLabels: ['M','T','W','T','F','S','S'], avgHours: 5.4, hasData: true, ...over,
})

const health = (over: Partial<HealthData> = {}): HealthData => ({
  recentEvents: [],
  weeklyFrequency: [0, 1, 0, 0, 0, 0, 0],
  vaccines: [{ name: 'MMR', done: true }, { name: 'Polio', done: false }],
  weekLabels: ['M','T','W','T','F','S','S'],
  hasData: true, ...over,
})

const nutrition = (over: Partial<NutritionData> = {}): NutritionData => ({
  mode: 'solids',
  mealFrequency: [3, 3, 3, 3, 3, 0, 0],
  eatQuality: {
    good: [2, 2, 2, 2, 2, 0, 0],
    little: [1, 1, 1, 1, 1, 0, 0],
    none: [0, 0, 0, 0, 0, 0, 0],
  },
  topFoods: [{ label: 'banana', count: 3 }],
  breastSessions: [0, 0, 0, 0, 0, 0, 0],
  bottleSessions: [0, 0, 0, 0, 0, 0, 0],
  bottleMlPerDay: [0, 0, 0, 0, 0, 0, 0],
  feedTarget: 4,
  weekLabels: ['M','T','W','T','F','S','S'],
  hasData: true, ...over,
})

describe('kidsScoring extraction (characterization)', () => {
  it('getAgeSleepTarget matches age bands', () => {
    expect(getAgeSleepTarget(2)).toBe(15)
    expect(getAgeSleepTarget(26)).toBe(12)
  })
  it('scoreSleep returns a 0..10 value for real data', () => {
    const s = scoreSleep(sleep(), 26)
    expect(s.hasData).toBe(true)
    expect(s.value).toBeGreaterThanOrEqual(0)
    expect(s.value).toBeLessThanOrEqual(10)
  })
  it('no-data pillars report hasData false', () => {
    expect(scoreSleep(sleep({ hasData: false }), 26).hasData).toBe(false)
  })
})

describe('dataConfidence', () => {
  it('is 0 with no data and ~1 when fully covered', () => {
    expect(dataConfidence(0, 7)).toBe(0)
    expect(dataConfidence(7, 7)).toBe(1)
  })
  it('is partial and clamped', () => {
    expect(dataConfidence(3, 6)).toBeCloseTo(0.5, 5)
    expect(dataConfidence(10, 7)).toBe(1) // clamps at 1
  })
  it('every scored pillar carries a confidence in 0..1', () => {
    const s = scoreSleep(sleep(), 26)
    expect(s.confidence).toBeGreaterThan(0)
    expect(s.confidence).toBeLessThanOrEqual(1)
  })
})

describe('confidence — no-data returns are 0', () => {
  it('scoreSleep with no data has confidence 0', () => {
    expect(scoreSleep(sleep({ hasData: false }), 26).confidence).toBe(0)
  })
  it('scoreNutrition with no data has confidence 0', () => {
    expect(scoreNutrition(nutrition({ hasData: false })).confidence).toBe(0)
  })
  it('scoreHealth with no data and no vaccines done has confidence 0', () => {
    expect(scoreHealth(health({ hasData: false, vaccines: [{ name: 'MMR', done: false }] })).confidence).toBe(0)
  })
})

describe('scoreHealth confidence — vaccine floor', () => {
  it('never drops to 0 when a vaccine is done, even with sparse logging', () => {
    const h = scoreHealth(health({ weeklyFrequency: [0, 0, 0, 0, 0, 0, 0] }))
    expect(h.confidence).toBeGreaterThanOrEqual(0.5)
  })
  it('reflects logged-day coverage when it exceeds the vaccine floor', () => {
    const h = scoreHealth(health({ weeklyFrequency: [1, 1, 1, 1, 1, 1, 1] }))
    expect(h.confidence).toBe(1)
  })
})

describe('scoreNutrition confidence', () => {
  it('reflects the fraction of the window with logged meals', () => {
    const n = scoreNutrition(nutrition())
    expect(n.confidence).toBeCloseTo(5 / 7, 5)
  })
})

describe('buildScores overallConfidence', () => {
  it('produces an overallConfidence in 0..1', () => {
    const scores = buildScores(
      nutrition(),
      sleep(),
      { dailyCounts: { happy: [1, 1, 0, 0, 0, 0, 0] }, dominantMoods: [{ mood: 'happy', count: 2 }], weekLabels: ['M','T','W','T','F','S','S'], hasData: true },
      health(),
      { weights: [{ value: 10, date: '2026-07-20' }], heights: [], heads: [], hasData: true },
      { activeDays: 3, totalSessions: 3, totalMinutes: 30, uniqueTypes: ['walk'], dailySessions: [1, 1, 1, 0, 0, 0, 0], weekLabels: ['M','T','W','T','F','S','S'], hasData: true },
      26,
      null,
    )
    expect(scores.overallConfidence).toBeGreaterThan(0)
    expect(scores.overallConfidence).toBeLessThanOrEqual(1)
  })
})

describe('scoreSleep folds in hours vs target', () => {
  const good = sleep({ dailyHours: [12,12,12,12,12,12,12], avgHours: 12,
    qualityCounts: { great: 7, good: 0, restless: 0, poor: 0 } })
  const deficit = sleep({ dailyHours: [5,5,6,5,5,5,5], avgHours: 5.3,
    qualityCounts: { great: 7, good: 0, restless: 0, poor: 0 } }) // all "great" but far under target

  it('a large deficit scores well below an at-target child, even with great quality', () => {
    const g = scoreSleep(good, 26)      // target 12h, meets it
    const d = scoreSleep(deficit, 26)   // ~6.7h short
    expect(d.value).toBeLessThan(g.value - 2)
  })
  it('meeting the target scores high', () => {
    expect(scoreSleep(good, 26).value).toBeGreaterThanOrEqual(8)
  })
})
