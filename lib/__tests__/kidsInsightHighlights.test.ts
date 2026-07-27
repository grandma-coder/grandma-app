import { buildInsightHighlights } from '../kidsInsightHighlights'

// Safe analytics stub — has `.hasData: false` on the two pillars whose
// narrative branches touch `analytics` directly (sleep/nutrition), so no
// fixture in this file needs to fully shape AnalyticsData.
const emptyAnalytics = {
  sleep: { hasData: false, avgHours: 0 },
  nutrition: { hasData: false, mealFrequency: [], eatQuality: { good: [], little: [] } },
} as any

describe('buildInsightHighlights honesty', () => {
  it('does not call a low-confidence pillar a strength', () => {
    const scores = {
      overall: 7,
      overallConfidence: 0.3,
      nutrition: { value: 10, label: 'excellent', trend: 0, hasData: true, confidence: 0.2 },
      sleep: { value: 4, label: 'needs attention', trend: 0, hasData: true, confidence: 0.8 },
      mood: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      health: { value: 6, label: 'fair', trend: 0, hasData: true, confidence: 0.6 },
      growth: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      activity: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    }
    const h = buildInsightHighlights(
      scores as any,
      {} as any,
      'Rio',
      26,
      'On the 3 shortest-sleep nights, the next day was crankier.',
    )
    expect(h.message).not.toMatch(/strength/i)
    expect(h.crossLine).toMatch(/crankier/)
  })

  it('passes crossLine through unchanged, including null', () => {
    const scores = {
      overall: 8.5,
      overallConfidence: 0.9,
      nutrition: { value: 9, label: 'excellent', trend: 0, hasData: true, confidence: 0.9 },
      sleep: { value: 8.5, label: 'excellent', trend: 0, hasData: true, confidence: 0.9 },
      mood: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      health: { value: 8, label: 'good', trend: 0, hasData: true, confidence: 0.9 },
      growth: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      activity: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    }
    const withLine = buildInsightHighlights(scores as any, emptyAnalytics, 'Mika', 30, 'A cross-log line.')
    expect(withLine.crossLine).toBe('A cross-log line.')

    const withoutLine = buildInsightHighlights(scores as any, emptyAnalytics, 'Mika', 30, null)
    expect(withoutLine.crossLine).toBeNull()
  })

  it('replaces confident strength/concern claims with a nudge when overallConfidence is low', () => {
    // Individually each pillar clears LOW_CONF (0.9 >= 0.4) — this isolates
    // the *overall* confidence gate from the per-pillar gate covered above.
    const scores = {
      overall: 6,
      overallConfidence: 0.2,
      nutrition: { value: 9, label: 'excellent', trend: 0, hasData: true, confidence: 0.9 },
      sleep: { value: 3, label: 'needs attention', trend: 0, hasData: true, confidence: 0.9 },
      mood: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      health: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      growth: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      activity: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    }
    const h = buildInsightHighlights(scores as any, emptyAnalytics, 'Kai', 30, null)
    expect(h.strength).toBeNull()
    expect(h.concern).toBeNull()
    expect(h.message).not.toMatch(/strength/i)
    expect(h.message).not.toMatch(/main area to work on|main focus/i)
    expect(h.message).toMatch(/log a few more days/i)
  })

  it('still asserts a confident strength when both the pillar and the overall read clear the bar', () => {
    const scores = {
      overall: 8,
      overallConfidence: 0.9,
      nutrition: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      sleep: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      mood: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      health: { value: 9, label: 'excellent', trend: 0, hasData: true, confidence: 0.9 },
      growth: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      activity: { value: 5, label: 'fair', trend: 0, hasData: true, confidence: 0.9 },
    }
    const h = buildInsightHighlights(scores as any, emptyAnalytics, 'Noa', 20, null)
    expect(h.strength).not.toBeNull()
    expect(h.strength?.pillar).toBe('health')
    expect(h.message).toMatch(/strength/i)
  })
})
