// lib/kidsPillarInsights.ts — pure, observation-led pillar pop-up copy (no
// supabase/react-query/zustand/RN deps). Mirrors `kidsCrossInsights.ts`:
// consumes already-built analytics + raw logs and returns human-readable
// copy, never a diagnostic verdict. One `build<Pillar>Insight` per pillar —
// Health is the first (the template the other five follow). See
// docs/superpowers/specs/2026-07-28-kids-insights-observation-led-content.md.

import type { AnalyticsData, ChildLog, HealthData } from './analyticsData'
import { getAgeSleepTarget } from './kidsScoring'
import { computeCrossInsights } from './kidsCrossInsights'
import { estimatePercentile, type Sex, type Metric } from './growthStandards'
import { t, translations } from './i18n'
import { useLanguageStore } from '../store/useLanguageStore'
import { dateLoc } from './kpLocale'

/**
 * Shared return shape every `build<Pillar>Insight` produces (spec §6): one
 * honest lead sentence, a couple of supporting lines, and whether there's a
 * raw log worth demoting behind a "show all" toggle.
 */
export interface PillarInsight {
  lead: string
  supporting: string[]
  demotedAvailable: boolean
}

type ConcernEvent = HealthData['concernTimeline'][number]
type ConcernKind = ConcernEvent['kind']

// ─── Local date helpers ─────────────────────────────────────────────────────
// No `toISOString()` — that converts through UTC and shifts `YYYY-MM-DD`
// dates by a day for users east of UTC (see CLAUDE.md's local-date rule).

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function daysBetween(fromStr: string, toStr: string): number {
  const from = parseLocalDate(fromStr)
  const to = parseLocalDate(toStr)
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

function formatMonthDay(dateStr: string): string {
  const d = parseLocalDate(dateStr)
  return d.toLocaleDateString(dateLoc(), { month: 'short', day: 'numeric' })
}

/** "1 week" / "6 weeks" — the honest window/gap phrasing cross-cutting rule
 * (spec §5): never a hardcoded "/7", always the real span, rounded to whole
 * weeks and clamped so a same-day cluster never reads as "0 weeks". */
function weeksPhrase(days: number): string {
  const weeks = Math.max(1, Math.round(days / 7))
  return weeks === 1 ? t('kp_pi_gapWeek') : t('kp_pi_gapWeeks', { n: weeks })
}

/** "the last week" / "the last 6 weeks" / "the last month" — a ready-to-use span phrase. */
function lastSpanPhrase(days: number): string {
  if (days <= 8) return t('kp_pi_spanWeek')
  if (days <= 31) return t('kp_pi_spanMonth')
  const weeks = Math.max(1, Math.round(days / 7))
  return weeks === 1 ? t('kp_pi_spanWeek') : t('kp_pi_spanWeeks', { n: weeks })
}

const CONCERN_KIND_NOUN: Record<ConcernKind, (n: number) => string> = {
  fever: (n) => t(n === 1 ? 'kp_pi_feverDay1' : 'kp_pi_feverDayN', { n }),
  injury: (n) => t(n === 1 ? 'kp_pi_injury1' : 'kp_pi_injuryN', { n }),
  doctor: (n) => t(n === 1 ? 'kp_pi_doctor1' : 'kp_pi_doctorN', { n }),
}

/**
 * Groups fever dates into consecutive-day runs and returns the most recent
 * run — the "episode" behind the best-effort recovery line. Returns null
 * when there's no fever entry at all, or when the most recent run hasn't
 * actually concluded yet (its last day is still within the visible window),
 * since we can't honestly claim it "settled" until at least a day has
 * passed with no further fever entry (spec §4: "infer … if determinable").
 */
function lastFeverEpisode(
  concernTimeline: ConcernEvent[],
  windowTo: string,
): { start: string; days: number } | null {
  const dates = [...new Set(concernTimeline.filter((c) => c.kind === 'fever').map((c) => c.date))].sort()
  if (dates.length === 0) return null

  const runs: string[][] = [[dates[0]]]
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(dates[i - 1], dates[i]) === 1) {
      runs[runs.length - 1].push(dates[i])
    } else {
      runs.push([dates[i]])
    }
  }

  const last = runs[runs.length - 1]
  const lastDay = last[last.length - 1]
  if (daysBetween(lastDay, windowTo) < 1) return null // still ongoing — not confirmed settled
  return { start: last[0], days: last.length }
}

/**
 * A medicine log only earns a supporting line while it reads as an
 * "active/recent course" (spec §4) — anything older is routine and gets
 * omitted rather than surfaced as a diary entry.
 */
function recentMedicineNote(logs: ChildLog[], windowTo: string): string | null {
  const medicineLogs = logs.filter((l) => l.type === 'medicine' && typeof l.value === 'string' && l.value.trim())
  if (medicineLogs.length === 0) return null

  const latest = [...medicineLogs].sort((a, b) => b.date.localeCompare(a.date))[0]
  const daysAgo = daysBetween(latest.date, windowTo)
  if (daysAgo < 0 || daysAgo > 7) return null

  const name = (latest.value ?? '').trim()
  return daysAgo <= 1 ? t('kp_pi_medToday', { name }) : t('kp_pi_medDaysAgo', { name, n: daysAgo })
}

/**
 * Health pop-up lead + supporting copy (spec §4 HEALTH). Health carries no
 * /10 score — it's a reference, not a graded pillar — so this function IS
 * the whole "how is my child doing on health" answer: well, or a real
 * pattern, backed by a vaccine-on-record count and (best-effort) a
 * recovery/medicine note. The full care-log diary lives behind
 * `demotedAvailable`; the caller renders it as a collapsed "show all".
 *
 * `ageMonths` is threaded through for signature parity with the other
 * `build<Pillar>Insight` functions (sleep/nutrition age-scale their
 * targets) — unused for Health today.
 */
export function buildHealthInsight(analytics: AnalyticsData, ageMonths: number, childName: string): PillarInsight {
  const { health, dateRange, logs } = analytics
  const timeline = health.concernTimeline // chronological, oldest first
  const windowDays = daysBetween(dateRange.from, dateRange.to) + 1
  const inWindow = timeline.filter((c) => c.date >= dateRange.from && c.date <= dateRange.to)

  const supporting: string[] = []
  let lead: string

  if (inWindow.length === 0) {
    // Well case — nothing within the selected window. Reach into the full
    // concern history (which spans more than the display window — see
    // `buildHealthData`'s wider fetch range) for a more generous, still
    // honest reassurance span: weeks since the most recent concern ever
    // logged, or since the window itself started if none ever happened.
    // Computed via max rather than trusting array order, so this holds even
    // if a future caller hands in an unsorted timeline.
    const mostRecent = timeline.length > 0
      ? timeline.reduce((latest, c) => (c.date > latest.date ? c : latest))
      : null
    const spanDays = mostRecent ? daysBetween(mostRecent.date, dateRange.to) : windowDays
    // Factual, not a health verdict: 'nothing logged' is true even when nothing was ever logged.
    lead = t('kp_pi_noConcerns', { name: childName, span: lastSpanPhrase(spanDays) })
  } else {
    const counts: Record<ConcernKind, number> = { fever: 0, injury: 0, doctor: 0 }
    for (const c of inWindow) counts[c.kind]++
    const kindsPresent = (Object.keys(counts) as ConcernKind[]).filter((k) => counts[k] > 0)

    const subject = kindsPresent.length === 1
      ? CONCERN_KIND_NOUN[kindsPresent[0]](counts[kindsPresent[0]])
      : t(inWindow.length === 1 ? 'kp_pi_concern1' : 'kp_pi_concernN', { n: inWindow.length })

    const windowPhrase = lastSpanPhrase(windowDays)

    if (inWindow.length >= 2) {
      const sorted = [...inWindow].sort((a, b) => a.date.localeCompare(b.date))
      const spreadDays = daysBetween(sorted[0].date, sorted[sorted.length - 1].date)
      const avgGapDays = spreadDays / (sorted.length - 1)
      lead = t('kp_pi_leadCluster', { subject, span: windowPhrase, gap: weeksPhrase(avgGapDays) })
    } else {
      lead = t('kp_pi_leadSingle', { subject, span: windowPhrase })
    }

    const episode = lastFeverEpisode(timeline, dateRange.to)
    if (episode) {
      supporting.push(
        t(episode.days === 1 ? 'kp_pi_feverEp1' : 'kp_pi_feverEpN', { name: childName, date: formatMonthDay(episode.start), n: episode.days }),
      )
    }
  }

  // Always-on reassurance reference — a count, never a completion % or
  // schedule-compliance verdict (spec §4 explicitly forbids that framing).
  const vaccineCount = health.vaccines.filter((v) => v.done).length
  supporting.push(t(vaccineCount === 1 ? 'kp_pi_vaccine1' : 'kp_pi_vaccineN', { n: vaccineCount }))

  const medNote = recentMedicineNote(logs, dateRange.to)
  if (medNote) supporting.push(medNote)

  return {
    lead,
    supporting,
    demotedAvailable: health.recentEvents.length > 0,
  }
}

// ─── Confidence hedge (spec §5) ─────────────────────────────────────────────
// A pillar's score confidence below this floor means too little data backs
// it to assert a specific number/trend with a straight face — the builder
// falls back to an honest "still early" line instead of a stat that would
// otherwise read confidently off a couple of logs. Kept as its own local
// constant (not a cross-file import of kidsInsightHighlights' LOW_CONF) so
// this module has no new dependency and stays independently testable — same
// value (0.4), same intent.
const LOW_CONFIDENCE = 0.4

/**
 * Names a builder's real display window in plain language — "this week" for
 * the default 7-day window, else the literal day count. Every NEW pillar
 * builder below threads its copy through this (spec §5: never a hardcoded
 * "this week" once the window is longer than a week). Health predates this
 * helper and keeps its own richer `describeWindowSpan`/`weeksPhrase` pair.
 */
export function windowLabel(windowDays: number): string {
  return windowDays === 7 ? t('kp_pi_winWeek') : t('kp_pi_winDays', { n: windowDays })
}

/** "1st" / "2nd" / "3rd" / "4th" — for percentile copy ("55th percentile"). */
function ordinalNum(n: number): string {
  // English reads "55th percentile"; other languages use the bare number.
  return useLanguageStore.getState().language === 'en' ? `${n}${ordinalSuffix(n)}` : String(n)
}

function ordinalSuffix(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return 'th'
  switch (n % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

/** Parses a log's `value` column into a plain object, defensively — the same
 * guard used across analyticsData.ts / kidsCrossInsights.ts. Never throws. */
function parseRecord(value: string | null): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** Counts food/feeding logs flagged as a new food within the display window
 * (spec §4 NUTRITION: "1 new food tried this month"). Reads the raw log
 * value directly since `NutritionData` doesn't surface a new-food count. */
function countNewFoods(logs: ChildLog[], dateRange: { from: string; to: string }): number {
  let count = 0
  for (const log of logs) {
    if (log.type !== 'food' && log.type !== 'feeding') continue
    if (log.date < dateRange.from || log.date > dateRange.to) continue
    const val = parseRecord(log.value)
    if (!val) continue
    const hasNewFoodName = typeof val.newFoodName === 'string' && val.newFoodName.trim().length > 0
    if (val.isNewFood === true || hasNewFoodName) count++
  }
  return count
}

// ─── Sleep ──────────────────────────────────────────────────────────────────

/**
 * Sleep pop-up lead + supporting copy (spec §4 SLEEP). The avg-vs-target
 * deficit + trend read IS the lead — but it only fires once the pillar's own
 * confidence clears the floor (spec: "a noisy % off thin data must NOT
 * appear"), since `avgHours` off a couple of logs swings wildly.
 */
export function buildSleepInsight(analytics: AnalyticsData, ageMonths: number, childName: string): PillarInsight {
  const { sleep, scores, logs } = analytics
  const windowDays = Math.max(1, sleep.dailyHours.length)
  const window = windowLabel(windowDays)
  const supporting: string[] = []

  if (!sleep.hasData || scores.sleep.confidence < LOW_CONFIDENCE) {
    return {
      lead: t('kp_pi_early', { name: childName, pillar: t('kp_pi_pSleep') }),
      supporting,
      demotedAvailable: sleep.hasData,
    }
  }

  const target = getAgeSleepTarget(ageMonths)
  const deficit = target - sleep.avgHours
  const trend = scores.sleep.trend
  const TREND_FLAT = 10 // percentage points — below this reads as "held steady"
  const trendPhrase = Math.abs(trend) < TREND_FLAT
    ? t('kp_pi_slTrendSteady', { window })
    : t(trend > 0 ? 'kp_pi_slTrendUp' : 'kp_pi_slTrendDown', { window })

  let lead: string
  if (deficit > 0.25) {
    lead = t('kp_pi_slUnder', { name: childName, avg: sleep.avgHours.toFixed(1), gap: deficit.toFixed(1), target, trend: trendPhrase })
  } else if (deficit < -0.25) {
    lead = t('kp_pi_slAbove', { name: childName, avg: sleep.avgHours.toFixed(1), target, trend: trendPhrase })
  } else {
    lead = t('kp_pi_slAt', { name: childName, avg: sleep.avgHours.toFixed(1), target, trend: trendPhrase })
  }

  const sleepMood = computeCrossInsights(logs, ageMonths).find((c) => c.kind === 'sleep_mood')
  if (sleepMood) supporting.push(sleepMood.line)

  // Nights-on-target: of the nights with a duration actually logged, how
  // many met/beat the age target (same 1h tolerance `scoreSleep` uses) —
  // cheap and honest with data we already have. Bedtime-consistency (spread
  // of `startTime`) needs raw start/end-of-sleep parsing the spec marks 🔶
  // (light data-layer work) — deferred, not built here.
  const loggedNights = sleep.dailyHours.filter((h) => h > 0)
  if (loggedNights.length > 0) {
    const onTarget = loggedNights.filter((h) => h >= target - 1).length
    supporting.push(t('kp_pi_slNights', { n: onTarget, total: loggedNights.length, window }))
  }

  return { lead, supporting, demotedAvailable: sleep.hasData }
}

// ─── Nutrition ──────────────────────────────────────────────────────────────

/**
 * Nutrition pop-up lead + supporting copy (spec §4 NUTRITION). Milk-phase
 * children get a frequency read; mixed/solids get a variety + new-foods
 * read. The eating-well % is computed over RATED meals only — a meal with
 * no quality logged is neither good nor bad, and must not silently count
 * toward the denominator (the "0% of 438 meals" bug this replaces).
 */
export function buildNutritionInsight(analytics: AnalyticsData, ageMonths: number, childName: string): PillarInsight {
  const { nutrition, scores, dateRange, logs } = analytics
  const windowDays = Math.max(1, nutrition.mealFrequency.length)
  const window = windowLabel(windowDays)
  const supporting: string[] = []

  if (!nutrition.hasData || scores.nutrition.confidence < LOW_CONFIDENCE) {
    return {
      lead: t('kp_pi_early', { name: childName, pillar: t('kp_pi_pNutrition') }),
      supporting,
      demotedAvailable: nutrition.hasData,
    }
  }

  let lead: string
  if (nutrition.mode === 'milk') {
    const totalFeeds = nutrition.mealFrequency.reduce((a, b) => a + b, 0)
    const loggedDays = nutrition.mealFrequency.filter((m) => m > 0).length
    const avgPerDay = loggedDays > 0 ? totalFeeds / loggedDays : 0
    lead = t('kp_pi_nuMilk', { avg: avgPerDay.toFixed(1), window })
  } else {
    const newFoodsCount = countNewFoods(logs, dateRange)
    const newFoodsPhrase = t(newFoodsCount === 1 ? 'kp_pi_nuNew1' : 'kp_pi_nuNewN', { n: newFoodsCount, window })
    const topNames = nutrition.topFoods.slice(0, 3).map((f) => f.label)
    lead = topNames.length > 0
      ? t('kp_pi_nuSame', { name: childName, foods: topNames.join(', '), newFoods: newFoodsPhrase })
      : t('kp_pi_nuLogMore', { newFoods: newFoodsPhrase })
  }

  const reaction = computeCrossInsights(logs, ageMonths).find((c) => c.kind === 'food_reaction')
  if (reaction) supporting.push(reaction.line)

  // Rated-meal denominator: only meals with a logged quality value count —
  // milk-phase feeds and any un-rated solids meal are excluded, never
  // silently read as "not eaten well".
  const totalGood = nutrition.eatQuality.good.reduce((a, b) => a + b, 0)
  const totalLittle = nutrition.eatQuality.little.reduce((a, b) => a + b, 0)
  const totalNone = nutrition.eatQuality.none.reduce((a, b) => a + b, 0)
  const ratedTotal = totalGood + totalLittle + totalNone
  if (ratedTotal > 0) {
    const pct = Math.round((totalGood / ratedTotal) * 100)
    const trend = scores.nutrition.trend
    const trendPhrase = trend > 10 ? t('kp_pi_nuTrendUp', { window }) : trend < -10 ? t('kp_pi_nuTrendDown', { window }) : ''
    supporting.push(t('kp_pi_nuGood', { pct, trend: trendPhrase }))
  }

  return { lead, supporting, demotedAvailable: nutrition.hasData }
}

// ─── Mood ───────────────────────────────────────────────────────────────────

const POSITIVE_MOODS = new Set(['happy', 'calm', 'energetic'])

const MOOD_NAME_KEYS = {
  happy: 'kids_logForm_moodHappy',
  calm: 'kids_logForm_moodCalm',
  energetic: 'kids_logForm_moodEnergetic',
  fussy: 'kids_logForm_moodFussy',
  cranky: 'kids_logForm_moodCranky',
} as const

/** Lowercase display name for a stored mood value (falls back to the raw value). */
function moodName(raw: string): string {
  const key = (MOOD_NAME_KEYS as Record<string, (typeof MOOD_NAME_KEYS)[keyof typeof MOOD_NAME_KEYS]>)[raw]
  return key ? t(key).toLocaleLowerCase(dateLoc()) : raw
}

/** Display name for a stored activity type (falls back to the raw value). */
function activityName(raw: string): string {
  const key = `kids_logForm_activity${raw.charAt(0).toUpperCase()}${raw.slice(1).toLowerCase()}`
  return key in translations.en ? t(key as Parameters<typeof t>[0]).toLocaleLowerCase(dateLoc()) : raw
}

/**
 * Mood pop-up lead + supporting copy (spec §4 MOOD). The lead folds the
 * sleep→mood cross-log tie straight in when the pattern engine found one —
 * that's the "why", not just the "what", per the spec's own example
 * ("...with fussy spells clustering on short-sleep days").
 */
export function buildMoodInsight(analytics: AnalyticsData, ageMonths: number, childName: string): PillarInsight {
  const { mood, scores, logs } = analytics
  const windowDays = Math.max(1, mood.weekLabels.length)
  const window = windowLabel(windowDays)
  const supporting: string[] = []

  if (!mood.hasData || scores.mood.confidence < LOW_CONFIDENCE) {
    return {
      lead: t('kp_pi_early', { name: childName, pillar: t('kp_pi_pMood') }),
      supporting,
      demotedAvailable: mood.hasData,
    }
  }

  const total = mood.dominantMoods.reduce((a, m) => a + m.count, 0)
  const positiveCount = mood.dominantMoods.filter((m) => POSITIVE_MOODS.has(m.mood)).reduce((a, m) => a + m.count, 0)
  const pct = total > 0 ? Math.round((positiveCount / total) * 100) : 0
  const topPositive = mood.dominantMoods.filter((m) => POSITIVE_MOODS.has(m.mood)).slice(0, 2).map((m) => moodName(m.mood))
  const moodDesc = topPositive.length > 1
    ? t('kp_pi_moAnd', { a: topPositive[0], b: topPositive[1] })
    : topPositive.length === 1
      ? topPositive[0]
      : (mood.dominantMoods[0] ? moodName(mood.dominantMoods[0].mood) : t('kp_pi_moMixed'))

  const sleepMood = computeCrossInsights(logs, ageMonths).find((c) => c.kind === 'sleep_mood')
  const clusterClause = sleepMood ? t('kp_pi_moCluster') : ''

  const lead = t('kp_pi_moLead', { name: childName, mood: moodDesc, pct, window, cluster: clusterClause })

  const trend = scores.mood.trend
  if (Math.abs(trend) >= 10) {
    supporting.push(t(trend > 0 ? 'kp_pi_moHappier' : 'kp_pi_moFussier', { window }))
  }

  return { lead, supporting, demotedAvailable: mood.hasData }
}

// ─── Growth ─────────────────────────────────────────────────────────────────

/**
 * Growth pop-up lead + supporting copy (spec §4 GROWTH). Unlike the other
 * four builders, placing a measurement on a WHO curve at all needs the
 * child's `sex` (mirrors `scoreGrowth`'s own signature) — `AnalyticsData`
 * doesn't carry it, so it's threaded as an explicit 4th argument rather than
 * giving every other builder an unused parameter just for shape parity.
 *
 * Never a diagnostic verdict: a percentile read, and — for a real crossing
 * between the first and last measurement — an informational "worth
 * mentioning at the next visit" line. Nothing here is a clinical call.
 */
export function buildGrowthInsight(
  analytics: AnalyticsData,
  ageMonths: number,
  childName: string,
  sex: Sex | null,
): PillarInsight {
  const { growth } = analytics
  const supporting: string[] = []

  const useWeight = growth.weights.length >= growth.heights.length
  const series = useWeight ? growth.weights : growth.heights
  const metric: Metric = useWeight ? 'weight' : 'height'

  if (!growth.hasData || series.length === 0) {
    return {
      lead: t('kp_pi_grNone', { name: childName }),
      supporting,
      demotedAvailable: growth.hasData,
    }
  }
  if (series.length < 2) {
    return {
      lead: t('kp_pi_grOne'),
      supporting,
      demotedAvailable: true,
    }
  }
  if (!sex) {
    return {
      lead: t('kp_pi_grNoSex', { name: childName, n: series.length }),
      supporting,
      demotedAvailable: true,
    }
  }

  // Each measurement's own age at the time it was taken (not today's age) —
  // mirrors `scoreGrowth`'s `ageAtMeasurement`, for the same reason: scoring
  // an older measurement against today's percentile band would read ordinary
  // age-appropriate gain as a false "crossing".
  const ageAt = (dateStr: string): number => {
    const [y, m, d] = dateStr.split('-').map(Number)
    if (!y || !m || !d) return ageMonths
    const measuredAt = new Date(y, m - 1, d)
    const daysElapsed = (Date.now() - measuredAt.getTime()) / 86_400_000
    return ageMonths - daysElapsed / 30.44
  }

  const first = series[0]
  const last = series[series.length - 1]
  const firstPct = estimatePercentile(metric, sex, ageAt(first.date), first.value)
  const lastPct = estimatePercentile(metric, sex, ageAt(last.date), last.value)

  const CROSSING_POINTS = 20 // percentile points — roughly a full band jump
  const isCrossing = firstPct != null && lastPct != null && Math.abs(lastPct - firstPct) >= CROSSING_POINTS

  let lead: string
  if (lastPct == null) {
    lead = t('kp_pi_grNoRef', { name: childName, n: series.length })
  } else {
    const curveRead = isCrossing ? t('kp_pi_grCrossing') : t('kp_pi_grSteady')
    lead = t('kp_pi_grLead', { name: childName, p: ordinalNum(lastPct), metric: t(metric === 'weight' ? 'kp_pi_grWeight' : 'kp_pi_grHeight'), curve: curveRead })
  }

  if (isCrossing && firstPct != null && lastPct != null) {
    supporting.push(
      t('kp_pi_grMoved', { metric: t(metric === 'weight' ? 'kp_pi_grWeightCap' : 'kp_pi_grHeightCap'), a: ordinalNum(firstPct), b: ordinalNum(lastPct) }),
    )
  }

  const otherSeries = useWeight ? growth.heights : growth.weights
  if (otherSeries.length > 0) {
    const otherMetric: Metric = useWeight ? 'height' : 'weight'
    const otherLast = otherSeries[otherSeries.length - 1]
    const otherPct = estimatePercentile(otherMetric, sex, ageAt(otherLast.date), otherLast.value)
    if (otherPct != null) {
      supporting.push(t('kp_pi_grAround', { metric: t(otherMetric === 'weight' ? 'kp_pi_grWeightCap' : 'kp_pi_grHeightCap'), p: ordinalNum(otherPct) }))
    }
  }

  return { lead, supporting, demotedAvailable: growth.hasData }
}

// ─── Activity ───────────────────────────────────────────────────────────────

/**
 * Activity pop-up lead + supporting copy (spec §4 ACTIVITY). The common case
 * is thin data — a handful of logs in a 30/90-day window scoring a harsh
 * 1.9/10 that reads as an indictment rather than "we don't know yet". Gated
 * on the pillar's own confidence, which for activity IS the active-day
 * coverage ratio (`scoreActivity`), so this lines up exactly with "too few
 * logs to see a pattern" — never a harsh score narrative off near-nothing.
 */
export function buildActivityInsight(analytics: AnalyticsData, ageMonths: number, childName: string): PillarInsight {
  const { activity, scores } = analytics
  const windowDays = Math.max(1, activity.dailySessions.length)
  const window = windowLabel(windowDays)
  const supporting: string[] = []

  if (!activity.hasData || scores.activity.confidence < LOW_CONFIDENCE) {
    return {
      lead: t('kp_pi_acEarly'),
      supporting,
      demotedAvailable: activity.hasData,
    }
  }

  const topTypes = activity.uniqueTypes.slice(0, 2).map(activityName)
  const typesPhrase = topTypes.length > 0
    ? t('kp_pi_acTypes', { types: topTypes.length > 1 ? t('kp_pi_moAnd', { a: topTypes[0], b: topTypes[1] }) : topTypes[0] })
    : ''
  const lead = t('kp_pi_acLead', { name: childName, days: activity.activeDays, total: windowDays, window, types: typesPhrase })

  if (activity.uniqueTypes.length > 1) {
    supporting.push(t('kp_pi_acKinds', { n: activity.uniqueTypes.length, window }))
  }

  return { lead, supporting, demotedAvailable: activity.hasData }
}
