import { buildKidsNote } from '../grandmaNotes/kids'
import { BANNED, letterText, tEn } from '../grandmaNotes/testing'
import type { AnalyticsData } from '../analyticsData'

const pillar = (value: number, trend = 0, hasData = true, confidence = 0.8) => ({ value, label: 'band-3', trend, hasData, confidence })
const none = () => pillar(0, 0, false, 0)

function analytics(over: Partial<Record<string, unknown>> = {}): AnalyticsData {
  return {
    nutrition: { mode: 'solids', mealFrequency: [3, 3, 2, 3, 3, 3, 3], eatQuality: { good: [2, 2, 1, 2, 2, 2, 3], little: [], none: [] }, topFoods: [], breastSessions: [], bottleSessions: [], bottleMlPerDay: [], feedTarget: 0, weekLabels: [], hasData: true },
    sleep: { dailyHours: [11, 11.5, 10.5, 11, 12, 11, 11], qualityCounts: { great: 0, good: 0, restless: 0, poor: 0 }, weekLabels: [], avgHours: 11.1, hasData: true },
    mood: { dailyCounts: {}, dominantMoods: [{ mood: 'happy', count: 4 }, { mood: 'tired', count: 2 }], weekLabels: [], hasData: true },
    health: { recentEvents: [], weeklyFrequency: [], concernEvents: 0, concernTimeline: [], vaccines: [], weekLabels: [], hasData: false },
    diaper: { dailyCounts: [0, 0, 0, 0, 0, 0, 0], typeCounts: { pee: 0, poop: 0, mixed: 0 }, colorCounts: {}, weekLabels: [], hasData: false },
    routineCompliance: { weeklySkips: [], totalSkips: 0, skipRate: 0, mostSkipped: [], weekLabels: [], hasData: false },
    growth: { weights: [], heights: [], heads: [], hasData: false },
    activity: { activeDays: 5, totalSessions: 6, totalMinutes: 120, uniqueTypes: [], dailySessions: [1, 1, 0, 1, 1, 0, 2], weekLabels: [], hasData: true },
    scores: {
      overall: 7.5, overallConfidence: 0.8,
      nutrition: pillar(7.5), sleep: pillar(8, 25), mood: pillar(7), health: none(), growth: none(), activity: pillar(6.5),
    },
    totalLogs: 60,
    dateRange: { from: '2026-10-27', to: '2026-11-02' },
    logs: [],
    ...over,
  } as unknown as AnalyticsData
}

describe('buildKidsNote', () => {
  it('writes about the child, leading with the pillar that changed most', () => {
    const l = buildKidsNote({ analytics: analytics(), childName: 'Kenji', ageMonths: 30 }, tEn)
    expect(l.intro).toBe("Here's what I noticed about Kenji.")
    expect(l.notes).toHaveLength(3)
    expect(l.notes[0]).toMatchObject({ id: 'sleep', area: 'sleep', body: 'Kenji slept about 11.1 h a day — steadier than last week.' })
    expect(l.notes.find((n) => n.id === 'food')?.body).toBe('20 meals logged, 70% marked “ate well”.')
    expect(l.suggestion?.text).toBe('Let Kenji help with one small job — setting out spoons counts.')
  })

  it('puts a fever / injury / doctor note first and points to the pediatrician', () => {
    const a = analytics({ health: { recentEvents: [], weeklyFrequency: [], concernEvents: 2, concernTimeline: [], vaccines: [], weekLabels: [], hasData: true } })
    const l = buildKidsNote({ analytics: a, childName: 'Kenji', ageMonths: 30 }, tEn)
    expect(l.notes[0]).toMatchObject({ id: 'health', area: 'health' })
    expect(l.notes[0].body).toMatch(/talk to your pediatrician/)
  })

  it('milk phase counts feeds and suggests by age band', () => {
    const a = analytics({
      nutrition: { mode: 'milk', mealFrequency: [8, 7, 8, 8, 9, 8, 8], eatQuality: { good: [], little: [], none: [] }, topFoods: [], breastSessions: [], bottleSessions: [], bottleMlPerDay: [], feedTarget: 8, weekLabels: [], hasData: true },
    })
    const l = buildKidsNote({ analytics: a, childName: 'Ada', ageMonths: 2 }, tEn)
    expect(l.notes.find((n) => n.id === 'food')?.body).toBe('56 feeds logged.')
    expect(l.suggestion?.text).toBe(tEn('gn_sug_kids_0'))
  })

  it('too little data → one encouraging note and a specific thing to log', () => {
    for (const a of [undefined, analytics({ totalLogs: 0 })]) {
      const l = buildKidsNote({ analytics: a, childName: 'Kenji', ageMonths: 30 }, tEn)
      expect(l.notes).toHaveLength(1)
      expect(l.notes[0].body).toBe('Log one thing for Kenji today and I\'ll start keeping count.')
      expect(l.suggestion?.text).toBe("Log Kenji's next nap or night's sleep — one entry is enough to start.")
    }
  })

  it('never uses banned words (even when scores are low) and fills every placeholder', () => {
    const low = analytics({
      scores: { overall: 3, overallConfidence: 0.8, nutrition: pillar(2, -40), sleep: pillar(3, -30), mood: pillar(4), health: pillar(2), growth: none(), activity: pillar(3) },
    })
    for (const a of [analytics(), low, undefined]) {
      for (const age of [1, 4, 8, 18, 30, 60]) {
        const text = letterText(buildKidsNote({ analytics: a, childName: 'Kenji', ageMonths: age }, tEn))
        expect(text).not.toMatch(BANNED)
        expect(text).not.toMatch(/\{\{\w+\}\}/)
      }
    }
  })
})
