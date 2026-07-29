import { buildHealthInsight } from '../kidsPillarInsights'
import { buildHealthData } from '../analyticsData'
import type {
  AnalyticsData, ChildLog, HealthData, NutritionData, SleepData, MoodData,
  DiaperData, RoutineComplianceData, GrowthData, ActivityData, WellnessScores,
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

function makeAnalytics(over: {
  dateRange: { from: string; to: string }
  health: HealthData
  logs?: ChildLog[]
}): AnalyticsData {
  return {
    nutrition, sleep, mood, diaper, routineCompliance, growth, activity, scores,
    totalLogs: 0,
    logs: over.logs ?? [],
    health: over.health,
    dateRange: over.dateRange,
  }
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
  it('leads with "well" and no concern when concernTimeline is entirely empty', () => {
    const analytics = makeAnalytics({
      dateRange: { from: '2026-07-01', to: '2026-07-07' },
      health: health({ concernTimeline: [] }),
    })
    const insight = buildHealthInsight(analytics, 26, 'Rio')
    expect(insight.lead).toMatch(/well/i)
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
    expect(insight.lead).toMatch(/well/i)
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

  it('adds a best-effort recovery line once a fever episode has actually concluded', () => {
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
    expect(insight.supporting.some((s) => /last fever \(Jul 2\) settled within ~2 days/.test(s))).toBe(true)
  })

  it('omits the recovery line when the most recent fever hasn\'t actually concluded yet', () => {
    const analytics = makeAnalytics({
      dateRange: { from: '2026-07-01', to: '2026-07-03' },
      health: health({
        concernTimeline: [{ date: '2026-07-03', kind: 'fever', label: 'Fever 38.5°C' }],
      }),
    })
    const insight = buildHealthInsight(analytics, 26, 'Rio')
    expect(insight.supporting.some((s) => /settled within/.test(s))).toBe(false)
  })

  it('surfaces a recent medicine note only when it is within the last week, else omits it', () => {
    const recent = makeAnalytics({
      dateRange: { from: '2026-07-01', to: '2026-07-07' },
      health: health({ concernTimeline: [] }),
      logs: [mkLog({ date: '2026-07-06', type: 'medicine', value: 'Amoxicillin' })],
    })
    expect(buildHealthInsight(recent, 26, 'Rio').supporting.some((s) => /Amoxicillin/.test(s))).toBe(true)

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
