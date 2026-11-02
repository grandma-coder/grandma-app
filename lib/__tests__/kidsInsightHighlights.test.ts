import { buildInsightHighlights, buildInsightActions } from '../kidsInsightHighlights'

// The light UI renders the NEUTRAL copy (counts, averages, steadier/less
// steady trends — never a `/10` value or a graded label; see
// docs/compliance/2026-11-02-regras-saude.md). The honesty gates below are
// mode-independent, so they run against the neutral output. The legacy
// (Diffuse) copy keeps its own block at the bottom.
const NEUTRAL = { neutral: true }

// Words the neutral copy must never use about a child.
const JUDGEMENT = /\/10|needs (some )?attention|needs care|excellent|is a strength|main area to work on|main focus|declining|improving|\bpoor\b|\bbad\b|critical/i

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
      NEUTRAL,
    )
    expect(h.strength).toBeNull()
    expect(h.message).not.toMatch(JUDGEMENT)
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
    const withLine = buildInsightHighlights(scores as any, emptyAnalytics, 'Mika', 30, 'A cross-log line.', NEUTRAL)
    expect(withLine.crossLine).toBe('A cross-log line.')

    const withoutLine = buildInsightHighlights(scores as any, emptyAnalytics, 'Mika', 30, null, NEUTRAL)
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
    const h = buildInsightHighlights(scores as any, emptyAnalytics, 'Kai', 30, null, NEUTRAL)
    expect(h.strength).toBeNull()
    expect(h.concern).toBeNull()
    expect(h.message).not.toMatch(JUDGEMENT)
    expect(h.message).toMatch(/log a few more days/i)
  })

  it('still asserts a confident strength when both the pillar and the overall read clear the bar', () => {
    // Uses activity (not health) as the highest scorer — health is a
    // reference pillar and excluded from strength/concern selection
    // regardless of its own value/confidence; see the dedicated
    // "excludes health" describe block below. Nutrition is given a second,
    // lower-value present pillar so `highest`/`lowest` differ (both would
    // otherwise collapse to the single present narrative pillar, which the
    // `highest !== lowest` guard treats as neither a strength nor a concern).
    const scores = {
      overall: 8,
      overallConfidence: 0.9,
      nutrition: { value: 3, label: 'needs attention', trend: 0, hasData: true, confidence: 0.9 },
      sleep: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      mood: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      health: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      growth: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      activity: { value: 9, label: 'excellent', trend: 0, hasData: true, confidence: 0.9 },
    }
    const h = buildInsightHighlights(scores as any, emptyAnalytics, 'Noa', 20, null, NEUTRAL)
    expect(h.strength).not.toBeNull()
    expect(h.strength?.pillar).toBe('activity')
    // Neutral: the steady pillar is described by a plain fact, not called a
    // "strength" — and no `/10` appears.
    expect(h.strength?.reason).not.toMatch(JUDGEMENT)
    expect(h.message).not.toMatch(JUDGEMENT)
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
    const h = buildInsightHighlights(scores as any, emptyAnalytics, 'Zoe', 24, null, NEUTRAL)
    expect(h.strength).toBeNull()
    expect(h.message).not.toMatch(JUDGEMENT)
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
    const h = buildInsightHighlights(scores as any, emptyAnalytics, 'Theo', 28, null, NEUTRAL)
    expect(h.concern).toBeNull()
    expect(h.message).not.toMatch(JUDGEMENT)
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
    const h = buildInsightHighlights(scores as any, emptyAnalytics, 'Milo', 24, null, NEUTRAL)
    expect(h.trend).toBeNull()
    expect(h.message).not.toMatch(/than last week/i)
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
    const h = buildInsightHighlights(scores as any, emptyAnalytics, 'Milo', 24, null, NEUTRAL)
    expect(h.trend).not.toBeNull()
    expect(h.trend?.pillar).toBe('sleep')
    expect(h.trend?.direction).toBe('declining')
    // Neutral trend: direction in plain words, no % of an internal score.
    expect(h.message).toMatch(/Sleep: less steady than last week\./)
    expect(h.message).not.toMatch(/%/)
    expect(h.message).not.toMatch(JUDGEMENT)
  })
})

// Health is a REFERENCE pillar (vaccines-on-record + concern flags) — illness
// is episodic and vaccines aren't a score. It must never be picked as the
// narrative's strength / concern / trending pillar, regardless of its own
// value, confidence, or trend — even when it would otherwise "win" outright.
describe('buildInsightHighlights excludes health from strength/concern/trend', () => {
  it('never calls health a strength, even as the highest-value, high-confidence pillar', () => {
    const scores = {
      overall: 8,
      overallConfidence: 0.9,
      nutrition: { value: 6, label: 'fair', trend: 0, hasData: true, confidence: 0.9 },
      sleep: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      mood: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      health: { value: 10, label: 'excellent', trend: 0, hasData: true, confidence: 0.9 },
      growth: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      activity: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    }
    const h = buildInsightHighlights(scores as any, emptyAnalytics, 'Sam', 24, null, NEUTRAL)
    // Health (10) would win the highest-value pick over nutrition (6) if it
    // weren't excluded. Nutrition alone doesn't clear the strength bar
    // (>= 8), so no strength should fire at all — never a fallback to health.
    expect(h.strength).toBeNull()
    expect(h.message).not.toMatch(JUDGEMENT)
  })

  it('never calls health "the main area to work on", even as the lowest-value, high-confidence pillar', () => {
    const scores = {
      overall: 6,
      overallConfidence: 0.9,
      nutrition: { value: 9, label: 'excellent', trend: 0, hasData: true, confidence: 0.9 },
      sleep: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      mood: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      health: { value: 1, label: 'low', trend: 0, hasData: true, confidence: 0.9 },
      growth: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      activity: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    }
    const h = buildInsightHighlights(scores as any, emptyAnalytics, 'Sam', 24, null, NEUTRAL)
    // Health (1) would win the lowest-value pick over nutrition (9) if it
    // weren't excluded. With no other pillar below 7, no concern should fire.
    expect(h.concern).toBeNull()
    expect(h.message).not.toMatch(JUDGEMENT)
  })

  it('never surfaces a health trend sentence, even with the single largest |trend|', () => {
    const scores = {
      overall: 7,
      overallConfidence: 0.9,
      nutrition: { value: 6, label: 'fair', trend: 5, hasData: true, confidence: 0.9 }, // below the 10% floor anyway
      sleep: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      mood: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      health: { value: 7, label: 'good', trend: -60, hasData: true, confidence: 0.9 },
      growth: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      activity: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    }
    const h = buildInsightHighlights(scores as any, emptyAnalytics, 'Sam', 24, null, NEUTRAL)
    expect(h.trend).toBeNull()
    expect(h.message).not.toMatch(/than last week/i)
  })
})

// Optional per the honest-scores spec: Health has no shown score, but a
// genuine concern flag (fever-range temp, injury/doctor/sick note) is still
// worth a mention in the narrative.
describe('buildInsightHighlights — optional health concern note', () => {
  const scores = {
    overall: 8,
    overallConfidence: 0.9,
    nutrition: { value: 8, label: 'good', trend: 0, hasData: true, confidence: 0.9 },
    sleep: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    mood: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    health: { value: 5, label: 'fair', trend: 0, hasData: true, confidence: 0.9 },
    growth: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    activity: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
  }

  it('mentions health concerns when concernEvents > 0', () => {
    const analytics = { ...emptyAnalytics, health: { concernEvents: 2 } }
    const h = buildInsightHighlights(scores as any, analytics, 'Rio', 24, null, NEUTRAL)
    expect(h.message).toMatch(/2 fever, injury or doctor notes logged this week\./)
    expect(h.message).not.toMatch(/concern/i)
  })

  it('says nothing about health when concernEvents is 0', () => {
    const analytics = { ...emptyAnalytics, health: { concernEvents: 0 } }
    const h = buildInsightHighlights(scores as any, analytics, 'Rio', 24, null, NEUTRAL)
    expect(h.message).not.toMatch(/fever, injury or doctor/i)
  })

  it('does not crash when analytics.health is missing from a partial fixture', () => {
    const h = buildInsightHighlights(scores as any, emptyAnalytics, 'Rio', 24, null, NEUTRAL)
    expect(h.message).not.toMatch(/fever, injury or doctor/i)
  })
})

// Light UI: what the neutral copy DOES say — counts and averages from the
// logs, in Grandma's voice, never a grade.
describe('buildInsightHighlights — neutral copy (light UI)', () => {
  const scores = {
    overall: 4.5,
    overallConfidence: 0.9,
    nutrition: { value: 9, label: 'band-5', trend: 0, hasData: true, confidence: 0.9 },
    sleep: { value: 3, label: 'band-2', trend: 0, hasData: true, confidence: 0.9 },
    mood: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    health: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    growth: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    activity: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
  }
  const analytics = {
    totalLogs: 24,
    sleep: { hasData: true, avgHours: 9.25 },
    nutrition: {
      hasData: true,
      mode: 'solids',
      mealFrequency: [3, 3, 2, 2, 2],
      eatQuality: { good: [3, 2, 2, 1, 1], little: [0, 1, 0, 1, 1], none: [0, 0, 0, 0, 0] },
    },
  } as any

  it('opens with the log count instead of a score, and states facts for the pillars it picks', () => {
    const h = buildInsightHighlights(scores as any, analytics, 'Kenji', 26, null, NEUTRAL)
    expect(h.logCount).toBe(24)
    expect(h.message).toMatch(/^Grandma looked at 24 logs for Kenji\./)
    // Lowest-scoring pillar is still mentioned first — as an average, not a grade.
    expect(h.concern?.pillar).toBe('sleep')
    expect(h.concern?.reason).toBe('Sleep averaged 9.3 h a day on logged days — about 12 h is the usual guide at this age.')
    expect(h.strength?.pillar).toBe('nutrition')
    expect(h.strength?.reason).toBe('Logged 12 meals, 75% marked "ate well".')
    expect(h.message).not.toMatch(JUDGEMENT)
    expect(h.message).not.toMatch(/4\.5/)
  })

  it('counts feeds (not meals or "ate well") for a milk-phase baby', () => {
    const milk = {
      ...analytics,
      nutrition: { hasData: true, mode: 'milk', mealFrequency: [8, 7], eatQuality: { good: [], little: [], none: [] } },
    }
    const h = buildInsightHighlights(scores as any, milk, 'Ana', 2, null, NEUTRAL)
    expect(h.strength?.reason).toBe('Logged 15 feeds.')
  })

  it('falls back to a gentle "Grandma noticed" line when the pillar data is not in the fixture', () => {
    const h = buildInsightHighlights(scores as any, { ...emptyAnalytics, totalLogs: 1 }, 'Kai', 26, null, NEUTRAL)
    expect(h.concern?.reason).toBe('Grandma noticed a pattern in sleep — tap to see the week.')
    expect(h.message).toMatch(/^Grandma looked at 1 log for Kai\./)
  })

  it('omits the opening line when the log count is unknown', () => {
    const h = buildInsightHighlights(scores as any, emptyAnalytics, 'Kai', 26, null, NEUTRAL)
    expect(h.logCount).toBe(0)
    expect(h.message).not.toMatch(/Grandma looked at/)
  })

  it('says "steadier than last week" for an upward trend', () => {
    const up = { ...scores, nutrition: { ...scores.nutrition, trend: 25 } }
    const h = buildInsightHighlights(up as any, analytics, 'Kenji', 26, null, NEUTRAL)
    expect(h.message).toMatch(/Nutrition: steadier than last week\./)
    expect(h.message).not.toMatch(/25%/)
  })

  it('neutral next-step for a declining trend never prints a percentage', () => {
    const actions = buildInsightActions(null, { pillar: 'activity', direction: 'declining', delta: 40 }, analytics, 26, true)
    expect(actions).toEqual(['Activity looks less steady than last week — worth a closer look.'])
  })
})

// The Diffuse UI still renders the legacy copy (out of scope for the light
// compliance pass). Keep it covered so it doesn't change by accident.
describe('buildInsightHighlights — legacy (Diffuse) copy', () => {
  const base = {
    overallConfidence: 0.9,
    mood: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    health: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    growth: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
  }

  it('keeps the overall score sentence, strength and concern wording', () => {
    const scores = {
      ...base,
      overall: 8,
      nutrition: { value: 3, label: 'band-2', trend: 0, hasData: true, confidence: 0.9 },
      sleep: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      activity: { value: 9, label: 'band-5', trend: 0, hasData: true, confidence: 0.9 },
    }
    const h = buildInsightHighlights(scores as any, emptyAnalytics, 'Noa', 20, null)
    expect(h.message).toMatch(/^Noa is on track — 8\.0\/10 overall\./)
    expect(h.message).toMatch(/Activity is a strength at 9\.0\/10\./)
    expect(h.message).toMatch(/Nutrition is the main area to work on at 3\.0\/10\./)
  })

  it('keeps the % trend sentence and the "health concerns flagged" note', () => {
    const scores = {
      ...base,
      overall: 6,
      nutrition: { value: 6, label: 'band-3', trend: 0, hasData: true, confidence: 0.9 },
      sleep: { value: 5, label: 'band-3', trend: -53, hasData: true, confidence: 0.9 },
      activity: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
    }
    const h = buildInsightHighlights(scores as any, { ...emptyAnalytics, health: { concernEvents: 2 } }, 'Milo', 24, null)
    expect(h.message).toMatch(/Sleep declining 53% this week\./)
    expect(h.message).toMatch(/2 health concerns flagged/i)
  })
})
