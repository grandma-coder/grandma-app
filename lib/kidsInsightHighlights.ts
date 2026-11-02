// lib/kidsInsightHighlights.ts — pure Kids Insights narrative builder (no RN/store deps)
//
// Extracted from components/analytics/KidsAnalytics.tsx so the narrative logic
// can be unit-tested without importing React Native / react-native-svg (see
// the honest-scores spec, Task 9). This module must stay pure — no
// supabase/react-query/zustand/React Native imports. Type-only imports from
// `analyticsData` are fine (erased at compile time, no runtime dependency).
import type { AnalyticsData, WellnessScores } from './analyticsData'
import { getAgeSleepTarget } from './kidsScoring'

export type PillarKey = 'nutrition' | 'sleep' | 'mood' | 'health' | 'growth' | 'activity'

export const PILLAR_ORDER: PillarKey[] = ['nutrition', 'sleep', 'mood', 'health', 'growth', 'activity']

// Health is a REFERENCE pillar (vaccines-on-record + concern flags), not a
// graded one — illness is episodic and vaccines aren't a score. It's scored
// internally (`scoreHealth`, still on `WellnessScores.health`) so the
// reference panel has data, but it must never be picked as the narrative's
// "main area to work on" / "strength" / trending pillar, and never dress up
// a `/10` value in a sentence. See the honest-scores spec.
const NARRATIVE_PILLAR_ORDER: PillarKey[] = PILLAR_ORDER.filter((k) => k !== 'health')

// Label-only lookup for narrative sentences. Kept in sync by hand with
// PILLAR_CONFIG in components/analytics/KidsAnalytics.tsx (which also carries
// icon/color — UI concerns this pure module intentionally does not import).
const PILLAR_LABELS: Record<PillarKey, string> = {
  nutrition: 'Nutrition',
  sleep: 'Sleep',
  mood: 'Mood',
  health: 'Health',
  growth: 'Growth',
  activity: 'Activity',
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

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
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
        return `Sleep averaged ${a.sleep.avgHours.toFixed(1)} h a day on logged days — about ${target} h is the usual guide at this age.`
      }
      break
    }
    case 'nutrition': {
      const n = a?.nutrition
      if (n?.hasData) {
        const total = n.mealFrequency.reduce((x, y) => x + y, 0)
        if (n.mode === 'milk') return `Logged ${plural(total, 'feed', 'feeds')}.`
        const good = (n.eatQuality?.good ?? []).reduce((x, y) => x + y, 0)
        const pct = total > 0 ? Math.round((good / total) * 100) : 0
        // 0% usually means the quality field was skipped, not that nothing was eaten — leave it out.
        return pct > 0
          ? `Logged ${plural(total, 'meal', 'meals')}, ${pct}% marked "ate well".`
          : `Logged ${plural(total, 'meal', 'meals')}.`
      }
      break
    }
    case 'mood': {
      const moods = a?.mood?.dominantMoods ?? []
      const total = moods.reduce((x, m) => x + m.count, 0)
      if (a?.mood?.hasData && total > 0) {
        return `Logged ${plural(total, 'mood', 'moods')} — ${moods[0].mood} came up most.`
      }
      break
    }
    case 'activity': {
      const act = a?.activity
      if (act?.hasData) {
        return `Active on ${act.activeDays} of the last ${act.dailySessions.length} days.`
      }
      break
    }
    case 'growth': {
      const g = a?.growth
      if (g?.hasData) {
        return `${plural(g.weights.length + g.heights.length, 'growth measurement', 'growth measurements')} on record.`
      }
      break
    }
    case 'health':
      break
  }
  return `Grandma noticed a pattern in ${PILLAR_LABELS[key].toLowerCase()} — tap to see the week.`
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
  const overallPhrase =
    scores.overall >= 8.5 ? 'is doing excellently' :
    scores.overall >= 7 ? 'is on track' :
    scores.overall >= 5 ? 'is developing' :
    'needs some attention'

  const parts: string[] = neutral
    ? (logCount > 0 ? [`Grandma looked at ${plural(logCount, 'log', 'logs')} for ${childName}.`] : [])
    : [`${childName} ${overallPhrase} — ${scores.overall.toFixed(1)}/10 overall.`]

  // When the overall read itself is too thin (few logged days across
  // pillars), don't dress up any single pillar's value as a confident
  // strength/concern claim — nudge toward more logging instead.
  const lowOverallConf = scores.overallConfidence < LOW_CONF

  let concern: InsightHighlight | null = null
  if (!lowOverallConf && lowest && scores[lowest].value < 7 && scores[lowest].confidence >= LOW_CONF) {
    let reason = `${PILLAR_LABELS[lowest]} is the main area to work on at ${scores[lowest].value.toFixed(1)}/10.`
    if (lowest === 'sleep' && analytics.sleep.hasData) {
      const target = getAgeSleepTarget(ageMonths)
      const deficit = (target - analytics.sleep.avgHours).toFixed(1)
      reason = `Sleep is the main focus — averaging ${analytics.sleep.avgHours.toFixed(1)}h vs ${target}h target (${deficit}h short).`
    } else if (lowest === 'nutrition' && analytics.nutrition.hasData) {
      const total = analytics.nutrition.mealFrequency.reduce((a, b) => a + b, 0)
      const good = analytics.nutrition.eatQuality.good.reduce((a, b) => a + b, 0)
      const pct = total > 0 ? Math.round((good / total) * 100) : 0
      reason = `Nutrition needs attention — ${pct}% of meals eaten well this week (score: ${scores.nutrition.value.toFixed(1)}/10).`
    }
    if (neutral) reason = neutralPillarFact(lowest, analytics, ageMonths)
    parts.push(reason)
    concern = { pillar: lowest, score: scores[lowest].value, reason }
  }

  let strength: InsightHighlight | null = null
  if (!lowOverallConf && highest && scores[highest].value >= 8 && scores[highest].confidence >= LOW_CONF && highest !== lowest) {
    let reason = `${PILLAR_LABELS[highest]} is a strength at ${scores[highest].value.toFixed(1)}/10.`
    if (highest === 'sleep' && analytics.sleep.hasData) {
      reason = `Sleep is a strength — ${analytics.sleep.avgHours.toFixed(1)}h avg with great consistency!`
    } else if (highest === 'nutrition' && analytics.nutrition.hasData) {
      const total = analytics.nutrition.mealFrequency.reduce((a, b) => a + b, 0)
      const good = analytics.nutrition.eatQuality.good.reduce((a, b) => a + b, 0)
      const pct = total > 0 ? Math.round((good / total) * 100) : 0
      reason = `Nutrition is a strength — ${pct}% of meals eaten well (${scores.nutrition.value.toFixed(1)}/10).`
    }
    if (neutral) reason = neutralPillarFact(highest, analytics, ageMonths)
    parts.push(reason)
    strength = { pillar: highest, score: scores[highest].value, reason }
  }

  if (lowOverallConf) {
    parts.push(`Log a few more days for a clearer read on ${childName}'s week.`)
  }

  // Health is reference-only (no score in the narrative above), but a
  // genuine concern flag (fever-range temp, injury/doctor/sick note — see
  // `concernEvents` in buildHealthData) is still worth a mention. Optional
  // chaining because some callers pass partial analytics fixtures.
  const healthConcerns = analytics.health?.concernEvents ?? 0
  if (healthConcerns > 0) {
    parts.push(neutral
      ? `${plural(healthConcerns, 'fever, injury or doctor note', 'fever, injury or doctor notes')} logged this week.`
      : `${healthConcerns} health concern${healthConcerns === 1 ? '' : 's'} flagged this week — worth a look.`)
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
    parts.push(neutral
      ? `${PILLAR_LABELS[trendPillar]}: ${direction === 'improving' ? 'steadier' : 'less steady'} than last week.`
      : `${PILLAR_LABELS[trendPillar]} ${direction} ${delta}% this week.`)
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
        actions.push(`Aim for ${target}h tonight — try bringing bedtime 30 min earlier.`)
        actions.push('Keep the last hour calm: dim lights, wind-down routine, no screens.')
        break
      }
      case 'nutrition':
        actions.push('Offer a protein + veg combo at the next meal — small portions, no pressure.')
        actions.push('Plan 2 snack windows between meals so appetite is stronger at mealtime.')
        break
      case 'activity':
        actions.push('Fit in 30 min of outdoor play — even a short walk counts.')
        actions.push('Break up screen time with active bursts: dancing, stretches, chase games.')
        break
      case 'mood':
        actions.push('Look for patterns — tired, hungry, overstimulated? Address the trigger first.')
        actions.push('Carve out 15 min of one-on-one connection time today.')
        break
      case 'health':
        actions.push('Log any symptoms in the calendar so the pattern is easy to spot.')
        actions.push('If anything persists beyond 48h, book a pediatrician check-in.')
        break
      case 'growth':
        actions.push('Keep logging weight + height weekly — trend matters more than a single point.')
        break
    }
  }
  if (trend && trend.direction === 'declining' && (!concern || trend.pillar !== concern.pillar)) {
    actions.push(neutral
      ? `${PILLAR_LABELS[trend.pillar]} looks less steady than last week — worth a closer look.`
      : `${PILLAR_LABELS[trend.pillar]} dropped ${trend.delta}% this week — worth a closer look.`)
  }
  return actions.slice(0, 2)
}
