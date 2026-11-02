import { scoreSleep, scoreHealth, scoreNutrition, scoreGrowth, scoreMood, scoreActivity, buildScores, getAgeSleepTarget, dataConfidence, scoreLabel } from '../kidsScoring'
import { buildHealthData } from '../analyticsData'
import type { SleepData, HealthData, NutritionData, GrowthData, MoodData, ActivityData } from '../analyticsData'

const sleep = (over: Partial<SleepData> = {}): SleepData => ({
  dailyHours: [5, 5, 6, 5, 5, 0, 0],
  qualityCounts: { great: 4, good: 1, restless: 0, poor: 0 },
  weekLabels: ['M','T','W','T','F','S','S'], avgHours: 5.4, hasData: true, ...over,
})

const health = (over: Partial<HealthData> = {}): HealthData => ({
  recentEvents: [],
  weeklyFrequency: [0, 1, 0, 0, 0, 0, 0],
  concernEvents: 0,
  concernTimeline: [],
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

describe('scoreGrowth uses WHO percentiles', () => {
  const growth = (over: Partial<GrowthData> = {}): GrowthData => ({ weights: [], heights: [], heads: [], hasData: true, ...over })

  // Dates computed RELATIVE to today (local, mirroring the private
  // `localDateStr` in lib/kidsScoring.ts) so these tests don't depend on the
  // wall-clock date: scoreGrowth's recency bonus uses a rolling 7-day-from-now
  // window, so hardcoded absolute dates would silently go stale once the
  // newest measurement fell outside that window.
  const daysAgo = (n: number): string => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  it('a stable curve scores well regardless of percentile level', () => {
    // Tracks the ~85th-percentile weight-for-age curve, evaluated at EACH
    // measurement's own age-at-measurement (not today's age): 13.65kg at
    // ~24.2mo, 13.85kg at ~25.0mo, 14.07kg at ~25.9mo all land on ~p85 for
    // the age they were actually taken at. This is normal age-appropriate
    // GAIN along a single percentile band and must NOT be scored as a
    // "crossing" just because the raw kilograms went up over time.
    const stable = growth({ weights: [
      { value: 13.65, date: daysAgo(55) }, { value: 13.85, date: daysAgo(30) }, { value: 14.07, date: daysAgo(2) },
    ] })
    expect(scoreGrowth(stable, 26, 'male').value).toBeGreaterThanOrEqual(9)
  })
  it('a real percentile crossing (abnormal for its own age-at-measurement) still lowers the score', () => {
    // Same dates as the stable curve above, but each value is now abnormal
    // for the age the child actually was on that date: 15.5kg at ~24.2mo is
    // far above the curve (~p99) and 10.5kg at ~25.9mo is far below it
    // (~p7) — a genuine crossing, not just growth. Confirms the penalty
    // still fires once age-at-measurement (not current age) is used.
    const crossing = growth({ weights: [
      { value: 15.5, date: daysAgo(55) }, { value: 12.0, date: daysAgo(30) }, { value: 10.5, date: daysAgo(2) },
    ] })
    const stable = growth({ weights: [
      { value: 13.65, date: daysAgo(55) }, { value: 13.85, date: daysAgo(30) }, { value: 14.07, date: daysAgo(2) },
    ] })
    const crossingScore = scoreGrowth(crossing, 26, 'male')
    const stableScore = scoreGrowth(stable, 26, 'male')
    expect(crossingScore.value).toBeLessThan(stableScore.value)
    expect(crossingScore.value).toBeLessThan(7) // a real crossing should read as a genuine dip
  })
  it('unknown sex lowers confidence', () => {
    const s = growth({ weights: [{ value: 12, date: daysAgo(2) }, { value: 12.4, date: daysAgo(1) }] })
    expect(scoreGrowth(s, 26, null).confidence).toBeLessThan(scoreGrowth(s, 26, 'male').confidence)
  })
})

describe('confidence-weighted overall', () => {
  it('a high-value low-confidence pillar contributes little', () => {
    const nutritionData = nutrition({
      mealFrequency: [3, 3, 3, 3, 3, 3, 3],
      eatQuality: { good: [3, 3, 3, 3, 3, 3, 3], little: new Array(7).fill(0), none: new Array(7).fill(0) },
      topFoods: [
        { label: 'a', count: 5 }, { label: 'b', count: 5 }, { label: 'c', count: 5 },
        { label: 'd', count: 5 }, { label: 'e', count: 5 },
      ],
    })
    const sleepData = sleep({ dailyHours: [5, 5, 5, 5, 5, 0, 0], avgHours: 5 }) // low sleep, decent confidence
    const moodData: MoodData = { dailyCounts: {}, dominantMoods: [], weekLabels: [], hasData: false }
    const healthData = health({ concernEvents: 0 })
    const growthData: GrowthData = { weights: [], heights: [], heads: [], hasData: true }
    const activityData: ActivityData = {
      activeDays: 0, totalSessions: 0, totalMinutes: 0, uniqueTypes: [],
      dailySessions: [0, 0, 0, 0, 0, 0, 0], weekLabels: [], hasData: false,
    }

    const full = buildScores(nutritionData, sleepData, moodData, healthData, growthData, activityData, 26, 'male')

    expect(full.overallConfidence).toBeGreaterThan(0)
    expect(full.overallConfidence).toBeLessThanOrEqual(1)
    expect(full.overall).toBeGreaterThanOrEqual(0)
    expect(full.overall).toBeLessThanOrEqual(10)

    // Directional check: hand-derive both the plain weight-normalized average
    // and the effective-weight (weight × confidence) average from the actual
    // per-pillar scores buildScores used, and confirm `overall` tracks the
    // confidence-weighted one — proving the low-confidence, low-value sleep
    // pillar (avgHours 5 vs a 12h target at 26mo) doesn't drag the composite
    // down as hard as plain weight-normalization would. Health is excluded
    // here to mirror buildScores' own `pillars` array — it's a reference
    // pillar and no longer feeds `overall` (see "excludes health" below).
    const ns = scoreNutrition(nutritionData)
    const ss = scoreSleep(sleepData, 26)
    const gs = scoreGrowth(growthData, 26, 'male')
    const pillars = [
      { score: ns, weight: 0.27 }, { score: ss, weight: 0.22 },
      { score: gs, weight: 0.09 },
    ]
    const present = pillars.filter((p) => p.score.hasData)
    const plainWTotal = present.reduce((a, p) => a + p.weight, 0)
    const plainOverall = present.reduce((a, p) => a + p.score.value * (p.weight / plainWTotal), 0)
    const effTotal = present.reduce((a, p) => a + p.weight * p.score.confidence, 0)
    const confOverall = present.reduce((a, p) => a + p.score.value * ((p.weight * p.score.confidence) / effTotal), 0)

    // Sanity: this scenario must actually distinguish the two formulas,
    // otherwise the assertion below would pass trivially.
    expect(Math.abs(confOverall - plainOverall)).toBeGreaterThan(0.05)
    expect(full.overall).toBeCloseTo(Math.round(confOverall * 10) / 10, 1)
  })
})

// Health is a REFERENCE pillar (vaccines-on-record + concern flags), not a
// graded one — illness is episodic and vaccines aren't a score. `buildScores`
// still computes and returns `scores.health` (the reference panel needs the
// data), but it must never feed `overall`/`overallConfidence`.
describe('buildScores excludes health from overall', () => {
  const nutritionData = nutrition({
    mealFrequency: [3, 3, 3, 3, 3, 3, 3],
    eatQuality: { good: [3, 3, 3, 3, 3, 3, 3], little: new Array(7).fill(0), none: new Array(7).fill(0) },
    topFoods: [
      { label: 'a', count: 5 }, { label: 'b', count: 5 }, { label: 'c', count: 5 },
      { label: 'd', count: 5 }, { label: 'e', count: 5 },
    ],
  })
  const sleepData = sleep({
    dailyHours: [12, 12, 12, 12, 12, 12, 12], avgHours: 12,
    qualityCounts: { great: 7, good: 0, restless: 0, poor: 0 },
  })
  const moodData: MoodData = {
    dailyCounts: { happy: [3, 3, 3, 3, 3, 3, 3] },
    dominantMoods: [{ mood: 'happy', count: 21 }],
    weekLabels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    hasData: true,
  }
  const growthData: GrowthData = { weights: [{ value: 10, date: '2026-07-20' }], heights: [], heads: [], hasData: true }
  const activityData: ActivityData = {
    activeDays: 7, totalSessions: 7, totalMinutes: 210, uniqueTypes: ['walk', 'bike', 'swim'],
    dailySessions: [1, 1, 1, 1, 1, 1, 1], weekLabels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], hasData: true,
  }

  it('a terrible health score does not drag overall down at all', () => {
    const goodHealth = health({ concernEvents: 0, weeklyFrequency: [1, 1, 1, 1, 1, 1, 1], vaccines: [{ name: 'MMR', done: true }] })
    const terribleHealth = health({
      concernEvents: 10,
      weeklyFrequency: [3, 3, 3, 3, 3, 3, 3],
      vaccines: [{ name: 'MMR', done: false }, { name: 'Polio', done: false }],
    })

    // Sanity: the two health fixtures must actually score differently,
    // otherwise a passing `overall` comparison below would be trivial.
    expect(scoreHealth(terribleHealth).value).toBeLessThan(scoreHealth(goodHealth).value)

    const withGoodHealth = buildScores(nutritionData, sleepData, moodData, goodHealth, growthData, activityData, 26, 'male')
    const withTerribleHealth = buildScores(nutritionData, sleepData, moodData, terribleHealth, growthData, activityData, 26, 'male')

    // Every other pillar is identical between the two calls — if health fed
    // `overall` at all, the terrible-health run would score lower.
    expect(withTerribleHealth.overall).toBe(withGoodHealth.overall)
    expect(withTerribleHealth.overallConfidence).toBe(withGoodHealth.overallConfidence)

    // `scores.health` itself is still populated (the reference panel needs it).
    expect(withTerribleHealth.health.hasData).toBe(true)
    expect(withTerribleHealth.health.value).toBe(scoreHealth(terribleHealth).value)
  })

  it('overall matches the plain weight-normalized average of the other five pillars only', () => {
    const healthData = health({ concernEvents: 0 })
    const full = buildScores(nutritionData, sleepData, moodData, healthData, growthData, activityData, 26, 'male')

    const ns = scoreNutrition(nutritionData)
    const ss = scoreSleep(sleepData, 26)
    const ms = scoreMood(moodData)
    const gs = scoreGrowth(growthData, 26, 'male')
    const as = scoreActivity(activityData)
    const pillars = [
      { score: ns, weight: 0.27 }, { score: ss, weight: 0.22 }, { score: ms, weight: 0.18 },
      { score: gs, weight: 0.09 }, { score: as, weight: 0.11 },
    ]
    const effTotal = pillars.reduce((a, p) => a + p.weight * p.score.confidence, 0)
    const expectedOverall = pillars.reduce((a, p) => a + p.score.value * ((p.weight * p.score.confidence) / effTotal), 0)

    expect(full.overall).toBeCloseTo(Math.round(expectedOverall * 10) / 10, 1)
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

// Pillar labels are internal ordering bands only — never a graded word that
// could leak into the UI as clinical judgement (compliance, 2026-11-02).
describe('scoreLabel is a neutral internal band', () => {
  it('maps 0-10 to band-1..band-5 with no judgement words', () => {
    expect([9, 7.5, 6, 4, 1].map(scoreLabel)).toEqual(['band-5', 'band-4', 'band-3', 'band-2', 'band-1'])
    for (let v = 0; v <= 10; v += 0.5) {
      expect(scoreLabel(v)).not.toMatch(/excellent|good|fair|needs|attention|care|low|poor|bad|critical/i)
    }
  })
})
