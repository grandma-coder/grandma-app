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

// The 4 tests above never isolate the PER-PILLAR confidence gate from the
// OVERALL (master) gate — every low-confidence-pillar fixture also happened
// to have a low `overallConfidence`, so the master gate alone explains the
// suppressed output. A regression that deleted the individual
// `scores[highest].confidence >= LOW_CONF` / `scores[lowest].confidence >=
// LOW_CONF` checks (leaving only the overall gate) would still pass all 4 —
// exactly the "Nutrition is a strength off one meal while the rest of the
// week is well-logged" scenario the honest-scores spec cares about. These
// two tests hold `overallConfidence` >= LOW_CONF (computed from the actual
// confidence-weighted formula in `buildScores`, not guessed) while a single
// pillar's OWN confidence stays below LOW_CONF, so only the per-pillar gate
// can explain the suppression.
describe('buildInsightHighlights — per-pillar gate isolated from the overall gate', () => {
  it('does not call a high-value pillar a strength when only its OWN confidence is low (overallConfidence clears the bar)', () => {
    // Present pillars: nutrition (highest value, LOW confidence), sleep,
    // health. buildScores' confidence-weighted overallConfidence formula is
    // sum(confidence_i * weight_i) / sum(weight_i) over present pillars
    // (weights: nutrition .27, sleep .22, health .13):
    //   (0.2*0.27 + 0.9*0.22 + 0.9*0.13) / (0.27 + 0.22 + 0.13)
    //   = (0.054 + 0.198 + 0.117) / 0.62 = 0.369 / 0.62 = 0.59516...  → 0.60
    // 0.60 >= LOW_CONF (0.4), so the master/overall gate does NOT suppress —
    // only nutrition's own 0.2 confidence can explain it being withheld.
    const scores = {
      overall: 7,
      overallConfidence: 0.6,
      nutrition: { value: 10, label: 'excellent', trend: 0, hasData: true, confidence: 0.2 },
      sleep: { value: 5, label: 'needs attention', trend: 0, hasData: true, confidence: 0.9 },
      mood: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      health: { value: 6, label: 'fair', trend: 0, hasData: true, confidence: 0.9 },
      growth: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      activity: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    }
    const h = buildInsightHighlights(scores as any, emptyAnalytics, 'Zoe', 24, null)
    expect(h.strength).toBeNull()
    expect(h.message).not.toMatch(/strength/i)
  })

  it('does not call a low-value pillar a concern when only its OWN confidence is low (overallConfidence clears the bar)', () => {
    // Present pillars: nutrition, health (both confident), sleep (lowest
    // value, LOW confidence). Same formula (weights: nutrition .27,
    // health .13, sleep .22):
    //   (0.9*0.27 + 0.9*0.13 + 0.2*0.22) / (0.27 + 0.13 + 0.22)
    //   = (0.243 + 0.117 + 0.044) / 0.62 = 0.404 / 0.62 = 0.65161...  → 0.65
    // 0.65 >= LOW_CONF, so the master gate does NOT suppress — only sleep's
    // own 0.2 confidence can explain the concern being withheld. Nutrition's
    // strength (confidence 0.9) firing alongside proves this isn't a global
    // misfire — only the concern branch is gated.
    const scores = {
      overall: 6,
      overallConfidence: 0.65,
      nutrition: { value: 9, label: 'excellent', trend: 0, hasData: true, confidence: 0.9 },
      sleep: { value: 2, label: 'low', trend: 0, hasData: true, confidence: 0.2 },
      mood: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      health: { value: 8, label: 'good', trend: 0, hasData: true, confidence: 0.9 },
      growth: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      activity: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    }
    const h = buildInsightHighlights(scores as any, emptyAnalytics, 'Theo', 28, null)
    expect(h.concern).toBeNull()
    expect(h.message).not.toMatch(/main area to work on|main focus/i)
    expect(h.strength).not.toBeNull()
    expect(h.strength?.pillar).toBe('nutrition')
  })
})

// The trend sentence ("X declining/improving N% this week") went through the
// same honesty gap as strength/concern: a noisy trend off a low-confidence
// pillar (e.g. "Sleep declining 53%" computed from a handful of logs spread
// across a long sparse window) must be suppressed even when it's the
// largest |trend| in PILLAR_ORDER. These two tests isolate the per-pillar
// trend gate from the overall gate the same way the block above does.
describe('buildInsightHighlights — trend confidence gate isolated from the overall gate', () => {
  it('suppresses the trend sentence when the trending pillar\'s OWN confidence is below LOW_CONF (overallConfidence clears the bar)', () => {
    // Present pillars: nutrition, sleep (trending, LOW confidence), health.
    // Weighted overallConfidence (weights: nutrition .27, sleep .22, health .13):
    //   (0.9*0.27 + 0.2*0.22 + 0.9*0.13) / (0.27 + 0.22 + 0.13)
    //   = (0.243 + 0.044 + 0.117) / 0.62 = 0.404 / 0.62 = 0.65161...  → 0.65
    // 0.65 >= LOW_CONF, so the master/overall gate does NOT suppress — only
    // sleep's own 0.2 confidence can explain the trend sentence being
    // withheld, even though its |trend| (53%) easily clears the 10% floor
    // and is the largest in PILLAR_ORDER.
    const scores = {
      overall: 6,
      overallConfidence: 0.65,
      nutrition: { value: 6, label: 'fair', trend: 0, hasData: true, confidence: 0.9 },
      sleep: { value: 5, label: 'needs attention', trend: -53, hasData: true, confidence: 0.2 },
      mood: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      health: { value: 6, label: 'fair', trend: 0, hasData: true, confidence: 0.9 },
      growth: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      activity: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    }
    const h = buildInsightHighlights(scores as any, emptyAnalytics, 'Milo', 24, null)
    expect(h.trend).toBeNull()
    expect(h.message).not.toMatch(/declining|improving/i)
  })

  it('still surfaces the trend sentence once the trending pillar\'s own confidence clears the bar', () => {
    const scores = {
      overall: 6,
      overallConfidence: 0.9,
      nutrition: { value: 6, label: 'fair', trend: 0, hasData: true, confidence: 0.9 },
      sleep: { value: 5, label: 'needs attention', trend: -53, hasData: true, confidence: 0.9 },
      mood: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      health: { value: 6, label: 'fair', trend: 0, hasData: true, confidence: 0.9 },
      growth: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      activity: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    }
    const h = buildInsightHighlights(scores as any, emptyAnalytics, 'Milo', 24, null)
    expect(h.trend).not.toBeNull()
    expect(h.trend?.pillar).toBe('sleep')
    expect(h.message).toMatch(/declining/i)
  })
})
