// lib/kidsInsightHighlights.ts — pure Kids Insights narrative builder (no RN/store deps)
//
// Extracted from components/analytics/KidsAnalytics.tsx so the narrative logic
// can be unit-tested without importing React Native / react-native-svg (see
// the honest-scores spec, Task 9). This module must stay pure — no
// supabase/react-query/zustand/React Native imports. Type-only imports from
// `analyticsData` are fine (erased at compile time, no runtime dependency).
import type { AnalyticsData, WellnessScores } from './analyticsData'
import { getAgeSleepTarget } from './kidsScoring'
import { t as tNow, translations, type TranslationKey } from './i18n'
import { numLoc } from './kpLocale'

export type PillarKey = 'nutrition' | 'sleep' | 'mood' | 'health' | 'growth' | 'activity'

export const PILLAR_ORDER: PillarKey[] = ['nutrition', 'sleep', 'mood', 'health', 'growth', 'activity']

// Health is a REFERENCE pillar (vaccines-on-record + concern flags), not a
// graded one — illness is episodic and vaccines aren't a score. It's scored
// internally (`scoreHealth`, still on `WellnessScores.health`) so the
// reference panel has data, but it must never be picked as the narrative's
// "main area to work on" / "strength" / trending pillar, and never dress up
// a `/10` value in a sentence. See the honest-scores spec.
const NARRATIVE_PILLAR_ORDER: PillarKey[] = PILLAR_ORDER.filter((k) => k !== 'health')

// Label-only lookup for narrative sentences. A function (not a constant) so
// the label follows the app language at call time.
function pillarLabel(key: PillarKey): string {
  return tNow(`kih_pillar_${key}` as TranslationKey)
}

/** Lowercase display name for a stored mood value (falls back to the raw value). */
function moodLabel(raw: string): string {
  const key = `kids_logForm_mood${raw.charAt(0).toUpperCase()}${raw.slice(1).toLowerCase()}`
  return key in translations.en ? tNow(key as TranslationKey).toLowerCase() : raw
}

export type InsightHighlight = { pillar: PillarKey; score: number; reason: string }
export type InsightTrend = { pillar: PillarKey; direction: 'improving' | 'declining'; delta: number }

export interface InsightHighlights {
  message: string
  overallLabel: string
  overallScore: number
  strength: InsightHighlight | null
  concern: InsightHighlight | null
  trend: InsightTrend | null
  actions: string[]
  /** Top cross-log observation line from `computeCrossInsights` (Task 8), or null when none fired. */
  crossLine: string | null
  /** How many logs back this read (`analytics.totalLogs`, 0 when unknown). */
  logCount: number
}

export interface InsightOptions {
  /**
   * Neutral wording (light UI). No `/10` value, no graded label
   * ("excellent", "needs attention", "strength", "main area to work on") —
   * only counts, averages and steadier/less-steady trends, in Grandma's
   * voice. Scores still decide WHICH pillar is mentioned first; they are just
   * never printed. See docs/compliance/2026-11-02-regras-saude.md.
   * Default false keeps the legacy (Diffuse) copy unchanged.
   */
  neutral?: boolean
}

/** Picks the `_one` / `_other` key by count and fills `{{count}}`. */
function pl(base: string, n: number, params: Record<string, string | number> = {}): string {
  return tNow(`${base}${n === 1 ? '_one' : '_other'}` as TranslationKey, { count: n, ...params })
}

/**
 * One neutral, factual sentence about a pillar — a count or an average from
 * the logs, never a grade. Optional chaining throughout: some callers (and
 * tests) pass partial analytics fixtures.
 */
export function neutralPillarFact(key: PillarKey, analytics: AnalyticsData, ageMonths: number): string {
  const a = analytics as Partial<AnalyticsData> | undefined
  switch (key) {
    case 'sleep': {
      if (a?.sleep?.hasData) {
        const target = getAgeSleepTarget(ageMonths)
        return tNow('kih_fact_sleep', { avg: numLoc(a.sleep.avgHours, 1, 1), target })
      }
      break
    }
    case 'nutrition': {
      const n = a?.nutrition
      if (n?.hasData) {
        const total = n.mealFrequency.reduce((x, y) => x + y, 0)
        if (n.mode === 'milk') return pl('kih_fact_feeds', total)
        const good = (n.eatQuality?.good ?? []).reduce((x, y) => x + y, 0)
        const pct = total > 0 ? Math.round((good / total) * 100) : 0
        // 0% usually means the quality field was skipped, not that nothing was eaten — leave it out.
        return pct > 0 ? pl('kih_fact_mealsPct', total, { pct }) : pl('kih_fact_meals', total)
      }
      break
    }
    case 'mood': {
      const moods = a?.mood?.dominantMoods ?? []
      const total = moods.reduce((x, m) => x + m.count, 0)
      if (a?.mood?.hasData && total > 0) {
        return pl('kih_fact_moods', total, { mood: moodLabel(moods[0].mood) })
      }
      break
    }
    case 'activity': {
      const act = a?.activity
      if (act?.hasData) {
        return tNow('kih_fact_active', { days: act.activeDays, total: act.dailySessions.length })
      }
      break
    }
    case 'growth': {
      const g = a?.growth
      if (g?.hasData) {
        return pl('kih_fact_growth', g.weights.length + g.heights.length)
      }
      break
    }
    case 'health':
      break
  }
  return tNow('kih_fact_generic', { pillar: pillarLabel(key).toLowerCase() })
}

// Confidence floor below which a pillar's score is too thin (too few logged
// days) to be asserted as a confident "strength" or "concern" — e.g. a
// single logged meal scoring 10/10 must never read as "Nutrition is a
// strength". See the honest-scores spec.
export const LOW_CONF = 0.4

export function buildInsightHighlights(
  scores: WellnessScores,
  analytics: AnalyticsData,
  childName: string,
  ageMonths: number,
  crossLine: string | null,
  opts: InsightOptions = {},
): InsightHighlights {
  const neutral = !!opts.neutral
  const logCount = (analytics as Partial<AnalyticsData> | undefined)?.totalLogs ?? 0
  const lowest = NARRATIVE_PILLAR_ORDER.reduce<PillarKey | null>((min, key) => {
    if (!scores[key].hasData) return min
    if (!min || scores[key].value < scores[min].value) return key
    return min
  }, null)

  const highest = NARRATIVE_PILLAR_ORDER.reduce<PillarKey | null>((max, key) => {
    if (!scores[key].hasData) return max
    if (!max || scores[key].value > scores[max].value) return key
    return max
  }, null)

  // Full predicates so the sentence always reads right ("Kenji needs attention…",
  // not "Kenji is needs attention…").
  const overallLabel =
    scores.overall >= 8.5 ? 'excellent' :
    scores.overall >= 7 ? 'on track' :
    scores.overall >= 5 ? 'developing' :
    'needs attention'
  const overallPhrase = tNow((
    scores.overall >= 8.5 ? 'kih_phrase_excellent' :
    scores.overall >= 7 ? 'kih_phrase_onTrack' :
    scores.overall >= 5 ? 'kih_phrase_developing' :
    'kih_phrase_attention') as TranslationKey)

  const parts: string[] = neutral
    ? (logCount > 0 ? [pl('kih_looked', logCount, { name: childName })] : [])
    : [tNow('kih_overall', { name: childName, phrase: overallPhrase, score: numLoc(scores.overall, 1, 1) })]

  // When the overall read itself is too thin (few logged days across
  // pillars), don't dress up any single pillar's value as a confident
  // strength/concern claim — nudge toward more logging instead.
  const lowOverallConf = scores.overallConfidence < LOW_CONF

  let concern: InsightHighlight | null = null
  if (!lowOverallConf && lowest && scores[lowest].value < 7 && scores[lowest].confidence >= LOW_CONF) {
    let reason = tNow('kih_concern_generic', { pillar: pillarLabel(lowest), score: numLoc(scores[lowest].value, 1, 1) })
    if (lowest === 'sleep' && analytics.sleep.hasData) {
      const target = getAgeSleepTarget(ageMonths)
      const deficit = numLoc(target - analytics.sleep.avgHours, 1, 1)
      reason = tNow('kih_concern_sleep', { avg: numLoc(analytics.sleep.avgHours, 1, 1), target, deficit })
    } else if (lowest === 'nutrition' && analytics.nutrition.hasData) {
      const total = analytics.nutrition.mealFrequency.reduce((a, b) => a + b, 0)
      const good = analytics.nutrition.eatQuality.good.reduce((a, b) => a + b, 0)
      const pct = total > 0 ? Math.round((good / total) * 100) : 0
      reason = tNow('kih_concern_nutrition', { pct, score: numLoc(scores.nutrition.value, 1, 1) })
    }
    if (neutral) reason = neutralPillarFact(lowest, analytics, ageMonths)
    parts.push(reason)
    concern = { pillar: lowest, score: scores[lowest].value, reason }
  }

  let strength: InsightHighlight | null = null
  if (!lowOverallConf && highest && scores[highest].value >= 8 && scores[highest].confidence >= LOW_CONF && highest !== lowest) {
    let reason = tNow('kih_strength_generic', { pillar: pillarLabel(highest), score: numLoc(scores[highest].value, 1, 1) })
    if (highest === 'sleep' && analytics.sleep.hasData) {
      reason = tNow('kih_strength_sleep', { avg: numLoc(analytics.sleep.avgHours, 1, 1) })
    } else if (highest === 'nutrition' && analytics.nutrition.hasData) {
      const total = analytics.nutrition.mealFrequency.reduce((a, b) => a + b, 0)
      const good = analytics.nutrition.eatQuality.good.reduce((a, b) => a + b, 0)
      const pct = total > 0 ? Math.round((good / total) * 100) : 0
      reason = tNow('kih_strength_nutrition', { pct, score: numLoc(scores.nutrition.value, 1, 1) })
    }
    if (neutral) reason = neutralPillarFact(highest, analytics, ageMonths)
    parts.push(reason)
    strength = { pillar: highest, score: scores[highest].value, reason }
  }

  if (lowOverallConf) {
    parts.push(tNow('kih_logMore', { name: childName }))
  }

  // Health is reference-only (no score in the narrative above), but a
  // genuine concern flag (fever-range temp, injury/doctor/sick note — see
  // `concernEvents` in buildHealthData) is still worth a mention. Optional
  // chaining because some callers pass partial analytics fixtures.
  const healthConcerns = analytics.health?.concernEvents ?? 0
  if (healthConcerns > 0) {
    parts.push(pl(neutral ? 'kih_health_neutral' : 'kih_health_flagged', healthConcerns))
  }

  let trend: InsightTrend | null = null
  // Pick the pillar with the largest absolute trend (≥10%), not the first
  // one that crosses 10% in PILLAR_ORDER. The old find() hid a 40% activity
  // decline behind a 12% nutrition wobble simply because nutrition came
  // earlier in the array. Also requires the trending pillar's OWN confidence
  // to clear LOW_CONF — a noisy trend off a sparse window (e.g. "Sleep
  // declining 53%" computed from a handful of logs spread across 90 days)
  // must be suppressed, the same honesty gate already applied to strength/
  // concern below.
  const trendPillar = NARRATIVE_PILLAR_ORDER
    .filter((k) => scores[k].hasData && scores[k].confidence >= LOW_CONF && Math.abs(scores[k].trend) >= 10)
    .reduce<PillarKey | null>(
      (best, k) => (best === null || Math.abs(scores[k].trend) > Math.abs(scores[best].trend) ? k : best),
      null,
    )
  if (trendPillar) {
    const direction: 'improving' | 'declining' = scores[trendPillar].trend > 0 ? 'improving' : 'declining'
    const delta = Math.abs(scores[trendPillar].trend)
    const pillar = pillarLabel(trendPillar)
    parts.push(neutral
      ? tNow(direction === 'improving' ? 'kih_trend_steadier' : 'kih_trend_lessSteady', { pillar })
      : tNow(direction === 'improving' ? 'kih_trend_improving' : 'kih_trend_declining', { pillar, delta }))
    trend = { pillar: trendPillar, direction, delta }
  }

  return {
    message: parts.join(' '),
    overallLabel,
    overallScore: scores.overall,
    strength,
    concern,
    trend,
    actions: buildInsightActions(concern, trend, analytics, ageMonths, neutral),
    crossLine,
    logCount,
  }
}

export function buildInsightActions(
  concern: InsightHighlight | null,
  trend: InsightTrend | null,
  analytics: AnalyticsData,
  ageMonths: number,
  neutral = false,
): string[] {
  const actions: string[] = []
  if (concern) {
    switch (concern.pillar) {
      case 'sleep': {
        const target = getAgeSleepTarget(ageMonths)
        actions.push(tNow('kih_act_sleep1', { target }))
        actions.push(tNow('kih_act_sleep2'))
        break
      }
      case 'nutrition':
        actions.push(tNow('kih_act_nutrition1'))
        actions.push(tNow('kih_act_nutrition2'))
        break
      case 'activity':
        actions.push(tNow('kih_act_activity1'))
        actions.push(tNow('kih_act_activity2'))
        break
      case 'mood':
        actions.push(tNow('kih_act_mood1'))
        actions.push(tNow('kih_act_mood2'))
        break
      case 'health':
        actions.push(tNow('kih_act_health1'))
        actions.push(tNow('kih_act_health2'))
        break
      case 'growth':
        actions.push(tNow('kih_act_growth1'))
        break
    }
  }
  if (trend && trend.direction === 'declining' && (!concern || trend.pillar !== concern.pillar)) {
    const pillar = pillarLabel(trend.pillar)
    actions.push(neutral
      ? tNow('kih_act_lessSteady', { pillar })
      : tNow('kih_act_dropped', { pillar, delta: trend.delta }))
  }
  return actions.slice(0, 2)
}
