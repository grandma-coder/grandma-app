import { scoreSleep, scoreHealth, scoreNutrition, buildScores, getAgeSleepTarget, dataConfidence } from '../kidsScoring'
import { buildHealthData } from '../analyticsData'
import type { SleepData, HealthData, NutritionData } from '../analyticsData'

const sleep = (over: Partial<SleepData> = {}): SleepData => ({
  dailyHours: [5, 5, 6, 5, 5, 0, 0],
  qualityCounts: { great: 4, good: 1, restless: 0, poor: 0 },
  weekLabels: ['M','T','W','T','F','S','S'], avgHours: 5.4, hasData: true, ...over,
})

const health = (over: Partial<HealthData> = {}): HealthData => ({
  recentEvents: [],
  weeklyFrequency: [0, 1, 0, 0, 0, 0, 0],
  concernEvents: 0,
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

describe('scoreHealth is not perverse', () => {
  it('routine logging (no concern events) does NOT lower the score', () => {
    const quiet = scoreHealth(health({ weeklyFrequency: [0, 0, 0, 0, 0, 0, 0], concernEvents: 0 }))
    const logged = scoreHealth(health({ weeklyFrequency: [3, 2, 1, 0, 0, 0, 0], concernEvents: 0 }))
    expect(logged.value).toBeGreaterThanOrEqual(quiet.value)
  })
  it('genuine concern events DO lower the score', () => {
    const calm = scoreHealth(health({ concernEvents: 0 }))
    const sick = scoreHealth(health({ concernEvents: 4 }))
    expect(sick.value).toBeLessThan(calm.value)
  })
})

describe('buildHealthData classifies concern events from raw logs', () => {
  const dates = ['2026-07-20', '2026-07-21']
  const labels = ['Mon', 'Tue']
  const mkLog = (overrides: Partial<{ type: string; value: string | null; date: string }>) => ({
    id: 'l1',
    child_id: 'c1',
    date: dates[0],
    type: 'note',
    value: null as string | null,
    notes: null as string | null,
    photos: [] as string[],
    created_at: '2026-07-20T00:00:00.000Z',
    ...overrides,
  })

  it('a normal temperature reading and a routine medicine log are NOT concern events', () => {
    const logs = [
      mkLog({ type: 'temperature', value: '37.2' }),
      mkLog({ type: 'medicine', value: 'Tylenol' }),
    ]
    const data = buildHealthData(logs, dates, labels)
    expect(data.concernEvents).toBe(0)
  })

  it('a fever-range temperature and an injury note ARE counted as concern events', () => {
    const logs = [
      mkLog({ type: 'temperature', value: '38.6' }),
      mkLog({ type: 'note', value: JSON.stringify({ eventType: 'Injury', description: 'Fell off the bed' }) }),
    ]
    const data = buildHealthData(logs, dates, labels)
    expect(data.concernEvents).toBe(2)
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

describe('nutrition small-sample guard', () => {
  it('one perfect meal does not score near 10', () => {
    const one = nutrition({
      mealFrequency: [1, 0, 0, 0, 0, 0, 0],
      eatQuality: { good: [1, 0, 0, 0, 0, 0, 0], little: new Array(7).fill(0), none: new Array(7).fill(0) },
      topFoods: [{ label: 'cheese', count: 1 }],
    })
    const s = scoreNutrition(one)
    expect(s.value).toBeLessThan(8)
    expect(s.confidence).toBeLessThan(0.5)
  })
  it('a full week of good meals scores high with high confidence', () => {
    const full = nutrition({
      mealFrequency: [3, 3, 3, 3, 3, 3, 3],
      eatQuality: { good: [3, 3, 3, 3, 3, 3, 3], little: new Array(7).fill(0), none: new Array(7).fill(0) },
      topFoods: [
        { label: 'a', count: 5 }, { label: 'b', count: 5 }, { label: 'c', count: 5 },
        { label: 'd', count: 5 }, { label: 'e', count: 5 },
      ],
    })
    const s = scoreNutrition(full)
    expect(s.value).toBeGreaterThanOrEqual(8)
    expect(s.confidence).toBeGreaterThan(0.9)
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
