import {
  buildHealthInsight, buildSleepInsight, buildNutritionInsight,
  buildMoodInsight, buildGrowthInsight, buildActivityInsight, windowLabel,
} from '../kidsPillarInsights'
import { buildHealthData } from '../analyticsData'
import type {
  AnalyticsData, ChildLog, HealthData, NutritionData, SleepData, MoodData,
  DiaperData, RoutineComplianceData, GrowthData, ActivityData, WellnessScores,
  PillarScore,
} from '../analyticsData'

// ─── Fixtures ───────────────────────────────────────────────────────────────

const emptyScore = { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 }

const health = (over: Partial<HealthData> = {}): HealthData => ({
  recentEvents: [],
  weeklyFrequency: [0, 0, 0, 0, 0, 0, 0],
  concernEvents: 0,
  concernTimeline: [],
  vaccines: [{ name: 'MMR', done: true }, { name: 'Polio', done: false }],
  weekLabels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  hasData: true,
  ...over,
})

const nutrition: NutritionData = {
  mode: 'solids', mealFrequency: [], eatQuality: { good: [], little: [], none: [] },
  topFoods: [], breastSessions: [], bottleSessions: [], bottleMlPerDay: [],
  feedTarget: 4, weekLabels: [], hasData: false,
}
const sleep: SleepData = {
  dailyHours: [], qualityCounts: { great: 0, good: 0, restless: 0, poor: 0 },
  weekLabels: [], avgHours: 0, hasData: false,
}
const mood: MoodData = { dailyCounts: {}, dominantMoods: [], weekLabels: [], hasData: false }
const diaper: DiaperData = {
  dailyCounts: [], typeCounts: { pee: 0, poop: 0, mixed: 0 }, colorCounts: {},
  weekLabels: [], totalCount: 0, hasData: false,
}
const routineCompliance: RoutineComplianceData = {
  weeklySkips: [], totalSkips: 0, skipRate: 0, mostSkipped: [], weekLabels: [], hasData: false,
}
const growth: GrowthData = { weights: [], heights: [], heads: [], hasData: false }
const activity: ActivityData = {
  activeDays: 0, totalSessions: 0, totalMinutes: 0, uniqueTypes: [],
  dailySessions: [], weekLabels: [], hasData: false,
}
const scores: WellnessScores = {
  overall: 0, overallConfidence: 0,
  nutrition: emptyScore, sleep: emptyScore, mood: emptyScore,
  health: emptyScore, growth: emptyScore, activity: emptyScore,
}

// Generalized to accept any AnalyticsData field override (not just
// dateRange/health/logs) so the sleep/nutrition/mood/growth/activity
// builders below can shape their own slice without re-deriving the whole
// object. Existing health-insight tests below pass `{ dateRange, health,
// logs? }` exactly as before — that remains a valid (subset) call shape.
function makeAnalytics(over: Partial<AnalyticsData> = {}): AnalyticsData {
  return {
    nutrition, sleep, mood, diaper, routineCompliance, growth, activity, scores,
    totalLogs: 0,
    logs: [],
    health: health(),
    dateRange: { from: '2026-07-01', to: '2026-07-07' },
    ...over,
  }
}

/** A confident PillarScore fixture — `hasData: true`, confidence/trend overridable. */
function score(over: Partial<PillarScore> = {}): PillarScore {
  return { value: 5, label: 'fair', trend: 0, hasData: true, confidence: 0.9, ...over }
}

const mkLog = (over: Partial<ChildLog> & Pick<ChildLog, 'date' | 'type'>): ChildLog => ({
  id: `${over.date}-${over.type}`,
  child_id: 'c1',
  value: null,
  notes: null,
  photos: [],
  created_at: `${over.date}T00:00:00.000Z`,
  ...over,
})

// ─── buildHealthInsight ─────────────────────────────────────────────────────

describe('buildHealthInsight — well case', () => {
  it('states nothing was logged — never that the child "has been well" — when concernTimeline is empty', () => {
    const analytics = makeAnalytics({
      dateRange: { from: '2026-07-01', to: '2026-07-07' },
      health: health({ concernTimeline: [] }),
    })
    const insight = buildHealthInsight(analytics, 26, 'Rio')
    expect(insight.lead).toMatch(/logged/i)
    expect(insight.lead).not.toMatch(/well/i)
    expect(insight.lead).toMatch(/Rio/)
    expect(insight.lead).not.toMatch(/\d+ (fever|injury|health concern)/i)
  })

  it('reaches back to an out-of-window concern for a generous, still-honest reassurance span', () => {
    // Last fever was 2026-06-14 — 42 days (6 weeks) before the window's end,
    // and well outside the selected 7-day window (2026-07-20..26).
    const analytics = makeAnalytics({
      dateRange: { from: '2026-07-20', to: '2026-07-26' },
      health: health({
        concernTimeline: [{ date: '2026-06-14', kind: 'fever', label: 'Fever 38.6°C' }],
      }),
    })
    const insight = buildHealthInsight(analytics, 26, 'Rio')
    expect(insight.lead).toMatch(/logged/i)
    expect(insight.lead).not.toMatch(/well/i)
    expect(insight.lead).toMatch(/6 weeks/)
  })

  it('always includes the vaccines-on-record count as reassurance, not a completion %', () => {
    const analytics = makeAnalytics({
      dateRange: { from: '2026-07-01', to: '2026-07-07' },
      health: health({ vaccines: [{ name: 'MMR', done: true }, { name: 'Polio', done: true }, { name: 'HepB', done: false }] }),
    })
    const insight = buildHealthInsight(analytics, 26, 'Rio')
    expect(insight.supporting.some((s) => /2 vaccines on record/.test(s))).toBe(true)
    expect(insight.supporting.some((s) => /%/.test(s))).toBe(false)
  })
})

describe('buildHealthInsight — concern case', () => {
  it('leads with the count and spacing when concerns fall inside the selected window', () => {
    const analytics = makeAnalytics({
      dateRange: { from: '2026-06-28', to: '2026-07-27' }, // 30-day ("month") window
      health: health({
        concernTimeline: [
          { date: '2026-06-29', kind: 'fever', label: 'Fever 38.4°C' },
          { date: '2026-07-13', kind: 'fever', label: 'Fever 38.9°C' },
          { date: '2026-07-27', kind: 'fever', label: 'Fever 38.2°C' },
        ],
      }),
    })
    const insight = buildHealthInsight(analytics, 26, 'Rio')
    expect(insight.lead).toMatch(/3 fever days/)
    expect(insight.lead).toMatch(/in the last month/)
    expect(insight.lead).toMatch(/2 weeks/)
  })

  it('mentions the count directionally even for a single, non-fever concern (mixed kind wording)', () => {
    const analytics = makeAnalytics({
      dateRange: { from: '2026-07-01', to: '2026-07-07' },
      health: health({
        concernTimeline: [{ date: '2026-07-03', kind: 'injury', label: 'Fell off the bed' }],
      }),
    })
    const insight = buildHealthInsight(analytics, 26, 'Rio')
    expect(insight.lead).toMatch(/1 injury/)
    expect(insight.lead).not.toMatch(/well/i)
  })

  it('adds a factual line about the last fever episode once it has concluded (no "settled" verdict)', () => {
    const analytics = makeAnalytics({
      dateRange: { from: '2026-07-01', to: '2026-07-10' },
      health: health({
        concernTimeline: [
          { date: '2026-07-02', kind: 'fever', label: 'Fever 38.5°C' },
          { date: '2026-07-03', kind: 'fever', label: 'Fever 38.3°C' },
        ],
      }),
    })
    const insight = buildHealthInsight(analytics, 26, 'Rio')
    expect(insight.supporting.some((s) => /last fever \(Jul 2\) was logged over ~2 days/.test(s))).toBe(true)
    expect(insight.supporting.some((s) => /settled/.test(s))).toBe(false)
  })

  it('omits the recovery line when the most recent fever hasn\'t actually concluded yet', () => {
    const analytics = makeAnalytics({
      dateRange: { from: '2026-07-01', to: '2026-07-03' },
      health: health({
        concernTimeline: [{ date: '2026-07-03', kind: 'fever', label: 'Fever 38.5°C' }],
      }),
    })
    const insight = buildHealthInsight(analytics, 26, 'Rio')
    expect(insight.supporting.some((s) => /was logged over/.test(s))).toBe(false)
  })

  it('surfaces a recent medicine note only when it is within the last week, else omits it', () => {
    const recent = makeAnalytics({
      dateRange: { from: '2026-07-01', to: '2026-07-07' },
      health: health({ concernTimeline: [] }),
      logs: [mkLog({ date: '2026-07-06', type: 'medicine', value: 'Amoxicillin' })],
    })
    expect(buildHealthInsight(recent, 26, 'Rio').supporting.some((s) => /Amoxicillin/.test(s))).toBe(true)
    expect(buildHealthInsight(recent, 26, 'Rio').supporting.some((s) => /worth watching/.test(s))).toBe(false)

    const stale = makeAnalytics({
      dateRange: { from: '2026-07-01', to: '2026-07-07' },
      health: health({ concernTimeline: [] }),
      logs: [mkLog({ date: '2026-06-01', type: 'medicine', value: 'Amoxicillin' })],
    })
    expect(buildHealthInsight(stale, 26, 'Rio').supporting.some((s) => /Amoxicillin/.test(s))).toBe(false)
  })
})

describe('buildHealthInsight — demotedAvailable', () => {
  it('is true when there is a raw care log to show, false when there is none', () => {
    const withLog = makeAnalytics({
      dateRange: { from: '2026-07-01', to: '2026-07-07' },
      health: health({ recentEvents: [{ date: 'Jul 3', type: 'Temperature', label: '37.2°C' }] }),
    })
    expect(buildHealthInsight(withLog, 26, 'Rio').demotedAvailable).toBe(true)

    const withoutLog = makeAnalytics({
      dateRange: { from: '2026-07-01', to: '2026-07-07' },
      health: health({ recentEvents: [], hasData: false }),
    })
    expect(buildHealthInsight(withoutLog, 26, 'Rio').demotedAvailable).toBe(false)
  })
})

// ─── buildHealthData — concernTimeline classification ──────────────────────

describe('buildHealthData — concernTimeline classification', () => {
  const dates = ['2026-07-20', '2026-07-21']
  const labels = ['Mon', 'Tue']

  it('a fever-range temperature and an injury note become timeline entries', () => {
    const logs: ChildLog[] = [
      mkLog({ date: '2026-07-20', type: 'temperature', value: '38.6' }),
      mkLog({ date: '2026-07-21', type: 'note', value: JSON.stringify({ eventType: 'Injury', description: 'Fell off the bed' }) }),
    ]
    const data = buildHealthData(logs, dates, labels)
    expect(data.concernTimeline).toHaveLength(2)
    expect(data.concernTimeline.map((c) => c.kind).sort()).toEqual(['fever', 'injury'])
    expect(data.concernTimeline.every((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.date))).toBe(true)
  })

  it('a normal temperature reading and a vitamin log produce no timeline entries', () => {
    const logs: ChildLog[] = [
      mkLog({ date: '2026-07-20', type: 'temperature', value: '37.1' }),
      mkLog({ date: '2026-07-21', type: 'medicine', value: 'Vitamin D' }),
    ]
    const data = buildHealthData(logs, dates, labels)
    expect(data.concernTimeline).toEqual([])
    expect(data.concernEvents).toBe(0)
  })

  it('a doctor-visit note is classified as kind "doctor"', () => {
    const logs: ChildLog[] = [
      mkLog({ date: '2026-07-20', type: 'note', value: JSON.stringify({ eventType: 'Doctor visit', description: 'Checkup' }) }),
    ]
    const data = buildHealthData(logs, dates, labels)
    expect(data.concernTimeline).toEqual([{ date: '2026-07-20', kind: 'doctor', label: 'Checkup' }])
  })

  it('concernTimeline is sorted chronologically regardless of input order', () => {
    const logs: ChildLog[] = [
      mkLog({ date: '2026-07-21', type: 'temperature', value: '38.5' }),
      mkLog({ date: '2026-07-20', type: 'temperature', value: '39.0' }),
    ]
    const data = buildHealthData(logs, ['2026-07-20', '2026-07-21'], labels)
    expect(data.concernTimeline.map((c) => c.date)).toEqual(['2026-07-20', '2026-07-21'])
  })
})

// ─── windowLabel ────────────────────────────────────────────────────────────

describe('windowLabel', () => {
  it('names the default 7-day window "this week"', () => {
    expect(windowLabel(7)).toBe('this week')
  })

  it('never hardcodes "this week" for a longer window — names the real day count', () => {
    expect(windowLabel(30)).toBe('the last 30 days')
    expect(windowLabel(90)).toBe('the last 90 days')
  })
})

// ─── buildSleepInsight ──────────────────────────────────────────────────────

describe('buildSleepInsight', () => {
  it('leads with the avg-vs-target deficit + trend once the pillar clears the confidence floor', () => {
    const analytics = makeAnalytics({
      sleep: {
        dailyHours: [10, 10, 10, 10, 10, 10, 10],
        qualityCounts: { great: 4, good: 3, restless: 0, poor: 0 },
        weekLabels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
        avgHours: 10,
        hasData: true,
      },
      scores: { ...scores, sleep: score({ value: 6, trend: 0, confidence: 0.9 }) },
    })
    const insight = buildSleepInsight(analytics, 6, 'Rio') // 6mo → 13h target
    expect(insight.lead).toMatch(/averaging 10\.0h/)
    expect(insight.lead).toMatch(/3\.0h under the 13h target/)
    expect(insight.lead).toMatch(/held steady over this week/)
  })

  it('hedges instead of asserting a deficit when the pillar\'s OWN confidence is low (thin, long window)', () => {
    const dailyHours = new Array(30).fill(0)
    dailyHours[2] = 5
    const analytics = makeAnalytics({
      sleep: {
        dailyHours,
        qualityCounts: { great: 0, good: 1, restless: 0, poor: 0 },
        weekLabels: new Array(30).fill(''),
        avgHours: 5,
        hasData: true,
      },
      scores: { ...scores, sleep: score({ value: 3, trend: -53, confidence: 0.1 }) },
    })
    const insight = buildSleepInsight(analytics, 26, 'Rio')
    expect(insight.lead).toMatch(/still early/i)
    expect(insight.lead).not.toMatch(/\d+(\.\d+)?h under/)
    expect(insight.demotedAvailable).toBe(true)
  })
})

// ─── buildNutritionInsight ──────────────────────────────────────────────────

describe('buildNutritionInsight', () => {
  it('solids: leads with variety + new-foods count, and rates eating-well over RATED meals only', () => {
    const dateRange = { from: '2026-07-01', to: '2026-07-07' }
    const analytics = makeAnalytics({
      dateRange,
      nutrition: {
        mode: 'solids',
        mealFrequency: [3, 3, 3, 3, 3, 3, 3],
        eatQuality: {
          good: [3, 3, 3, 3, 2, 2, 2],
          little: [0, 0, 0, 0, 1, 1, 1],
          none: [0, 0, 0, 0, 0, 0, 0],
        },
        topFoods: [{ label: 'banana', count: 8 }, { label: 'cheese', count: 6 }, { label: 'oats', count: 5 }],
        breastSessions: [], bottleSessions: [], bottleMlPerDay: [],
        feedTarget: 4, weekLabels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], hasData: true,
      },
      scores: { ...scores, nutrition: score({ value: 7, trend: 0, confidence: 0.9 }) },
      logs: [
        mkLog({
          date: '2026-07-03', type: 'food',
          value: JSON.stringify({ quality: 'ate_well', isNewFood: true, newFoodName: 'mango' }),
        }),
      ],
    })
    const insight = buildNutritionInsight(analytics, 26, 'Rio')
    expect(insight.lead).toMatch(/mostly eats the same few foods/)
    expect(insight.lead).toMatch(/banana, cheese, oats/)
    expect(insight.lead).toMatch(/1 new food tried this week/)
    // good=18, little=3, none=0 → rated total 21 → 18/21 ≈ 86%
    expect(insight.supporting.some((s) => /Eating well at 86% of rated meals/.test(s))).toBe(true)
  })

  it('milk phase leads with feed frequency, not variety/new-foods', () => {
    const analytics = makeAnalytics({
      nutrition: {
        mode: 'milk',
        mealFrequency: [6, 6, 6, 6, 6, 6, 6],
        eatQuality: { good: [], little: [], none: [] },
        topFoods: [],
        breastSessions: [3, 3, 3, 3, 3, 3, 3], bottleSessions: [3, 3, 3, 3, 3, 3, 3],
        bottleMlPerDay: [400, 400, 400, 400, 400, 400, 400],
        feedTarget: 6, weekLabels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], hasData: true,
      },
      scores: { ...scores, nutrition: score({ value: 8, trend: 0, confidence: 0.9 }) },
    })
    const insight = buildNutritionInsight(analytics, 3, 'Rio')
    expect(insight.lead).toBe('Feeding 6.0×/day on average this week — steady.')
  })

  it('never reports a false 0%/low% when most meals carry no quality rating (unrated ≠ not-eaten-well)', () => {
    const analytics = makeAnalytics({
      nutrition: {
        mode: 'solids',
        // 438 total meals logged, e.g. imported/legacy rows with no quality field.
        mealFrequency: [60, 60, 60, 60, 60, 60, 58],
        eatQuality: {
          good: [0, 0, 0, 0, 0, 0, 0], little: [0, 0, 0, 0, 0, 0, 0], none: [0, 0, 0, 0, 0, 0, 0],
        },
        topFoods: [{ label: 'rice', count: 10 }],
        breastSessions: [], bottleSessions: [], bottleMlPerDay: [],
        feedTarget: 4, weekLabels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], hasData: true,
      },
      scores: { ...scores, nutrition: score({ value: 6, trend: 0, confidence: 0.9 }) },
    })
    const insight = buildNutritionInsight(analytics, 26, 'Rio')
    expect(insight.supporting.some((s) => /Eating well/.test(s))).toBe(false)
    expect(insight.supporting.some((s) => /0%/.test(s))).toBe(false)
  })

  it('hedges when the pillar\'s own confidence is low', () => {
    const analytics = makeAnalytics({
      nutrition: {
        mode: 'solids',
        mealFrequency: [1, 0, 0, 0, 0, 0, 0],
        eatQuality: { good: [1, 0, 0, 0, 0, 0, 0], little: [0, 0, 0, 0, 0, 0, 0], none: [0, 0, 0, 0, 0, 0, 0] },
        topFoods: [{ label: 'banana', count: 1 }],
        breastSessions: [], bottleSessions: [], bottleMlPerDay: [],
        feedTarget: 4, weekLabels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], hasData: true,
      },
      scores: { ...scores, nutrition: score({ value: 6, trend: 0, confidence: 0.1 }) },
    })
    const insight = buildNutritionInsight(analytics, 26, 'Rio')
    expect(insight.lead).toMatch(/still early/i)
    expect(insight.supporting).toEqual([])
  })
})

// ─── buildMoodInsight ───────────────────────────────────────────────────────

describe('buildMoodInsight', () => {
  it('leads with dominant mood % and folds in the sleep→mood tie when the pattern engine finds one', () => {
    const logs: ChildLog[] = []
    for (const d of ['2026-07-01', '2026-07-02', '2026-07-03']) {
      logs.push(mkLog({ date: d, type: 'sleep', value: JSON.stringify({ duration: 5, quality: 'poor' }) }))
      const next = new Date(`${d}T00:00:00`)
      next.setDate(next.getDate() + 1)
      const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
      logs.push(mkLog({ date: nextStr, type: 'mood', value: 'cranky' }))
    }
    const analytics = makeAnalytics({
      mood: {
        dailyCounts: {},
        dominantMoods: [{ mood: 'happy', count: 5 }, { mood: 'calm', count: 2 }, { mood: 'fussy', count: 3 }],
        weekLabels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
        hasData: true,
      },
      scores: { ...scores, mood: score({ value: 7, trend: 0, confidence: 0.9 }) },
      logs,
    })
    const insight = buildMoodInsight(analytics, 26, 'Rio')
    expect(insight.lead).toMatch(/mostly happy and calm \(70%\) this week/)
    expect(insight.lead).toMatch(/clustering on short-sleep days/)
  })

  it('omits the cross-tie clause when the pattern engine finds no sleep→mood link', () => {
    const analytics = makeAnalytics({
      mood: {
        dailyCounts: {},
        dominantMoods: [{ mood: 'happy', count: 5 }, { mood: 'calm', count: 5 }],
        weekLabels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
        hasData: true,
      },
      scores: { ...scores, mood: score({ value: 9, trend: 0, confidence: 0.9 }) },
    })
    const insight = buildMoodInsight(analytics, 26, 'Rio')
    expect(insight.lead).toMatch(/mostly happy and calm \(100%\) this week\./)
    expect(insight.lead).not.toMatch(/clustering/)
  })

  it('hedges when the pillar\'s own confidence is low', () => {
    const analytics = makeAnalytics({
      mood: {
        dailyCounts: {},
        dominantMoods: [{ mood: 'happy', count: 1 }],
        weekLabels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
        hasData: true,
      },
      scores: { ...scores, mood: score({ value: 8, trend: 0, confidence: 0.1 }) },
    })
    const insight = buildMoodInsight(analytics, 26, 'Rio')
    expect(insight.lead).toMatch(/still early/i)
  })
})

// ─── buildGrowthInsight ─────────────────────────────────────────────────────

describe('buildGrowthInsight', () => {
  // Dates computed RELATIVE to today (mirrors kidsScoring.test.ts's
  // `daysAgo`) — `buildGrowthInsight`'s own `ageAt` uses `Date.now()` (same
  // as `scoreGrowth`'s `ageAtMeasurement`), so a hardcoded absolute date
  // would silently go stale as the age-at-measurement drifts over time.
  const daysAgo = (n: number): string => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  it('leads with the latest percentile + "a steady curve" when growth tracks one band', () => {
    // Same fixture as kidsScoring.test.ts's "stable curve" case — each value
    // lands on ~p85 for its own age-at-measurement.
    const analytics = makeAnalytics({
      growth: {
        weights: [
          { value: 13.65, date: daysAgo(55) },
          { value: 13.85, date: daysAgo(30) },
          { value: 14.07, date: daysAgo(2) },
        ],
        heights: [], heads: [], hasData: true,
      },
    })
    const insight = buildGrowthInsight(analytics, 26, 'Rio', 'male')
    expect(insight.lead).toMatch(/percentile for weight/)
    expect(insight.lead).toMatch(/steady curve/)
    expect(insight.lead).not.toMatch(/crossing/i)
  })

  it('flags a real crossing between the first and last measurement, informationally — never a verdict', () => {
    const analytics = makeAnalytics({
      growth: {
        weights: [
          { value: 15.5, date: daysAgo(55) },
          { value: 10.5, date: daysAgo(2) },
        ],
        heights: [], heads: [], hasData: true,
      },
    })
    const insight = buildGrowthInsight(analytics, 26, 'Rio', 'male')
    expect(insight.lead).toMatch(/crossing percentile bands/)
    expect(insight.supporting.some((s) => /worth mentioning at the next visit/.test(s))).toBe(true)
  })

  it('sparse case: a single measurement asks for another rather than guessing a curve', () => {
    const analytics = makeAnalytics({
      growth: { weights: [{ value: 9, date: daysAgo(2) }], heights: [], heads: [], hasData: true },
    })
    const insight = buildGrowthInsight(analytics, 12, 'Rio', 'male')
    expect(insight.lead).toBe('Only 1 measurement — log another to see a growth curve.')
  })

  it('unknown sex asks for one on file rather than silently guessing a curve', () => {
    const analytics = makeAnalytics({
      growth: {
        weights: [{ value: 9, date: daysAgo(30) }, { value: 9.5, date: daysAgo(2) }],
        heights: [], heads: [], hasData: true,
      },
    })
    const insight = buildGrowthInsight(analytics, 12, 'Rio', null)
    expect(insight.lead).toMatch(/sex on file/)
  })
})

// ─── buildActivityInsight ───────────────────────────────────────────────────

describe('buildActivityInsight', () => {
  it('leads with the active-day rate over the REAL window + top types, not a hardcoded "/7"', () => {
    const analytics = makeAnalytics({
      activity: {
        activeDays: 6, totalSessions: 8, totalMinutes: 240,
        uniqueTypes: ['playground', 'swimming'],
        dailySessions: [1, 1, 2, 1, 1, 1, 0],
        weekLabels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
        hasData: true,
      },
      scores: { ...scores, activity: score({ value: 7, trend: 0, confidence: 6 / 7 }) },
    })
    const insight = buildActivityInsight(analytics, 26, 'Rio')
    expect(insight.lead).toMatch(/active 6 of 7 days this week/)
    expect(insight.lead).toMatch(/playground and swimming/)
  })

  it('is honest about sparse logs instead of a harsh score narrative', () => {
    const dailySessions = new Array(30).fill(0)
    dailySessions[0] = 1
    const analytics = makeAnalytics({
      activity: {
        activeDays: 1, totalSessions: 1, totalMinutes: 20,
        uniqueTypes: ['playground'],
        dailySessions,
        weekLabels: new Array(30).fill(''),
        hasData: true,
      },
      scores: { ...scores, activity: score({ value: 1.9, trend: 0, confidence: 1 / 30 }) },
    })
    const insight = buildActivityInsight(analytics, 26, 'Rio')
    expect(insight.lead).toBe('Not enough activity logs yet to see a pattern.')
    expect(insight.lead).not.toMatch(/1\.9/)
  })
})
