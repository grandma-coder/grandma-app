// lib/kidsScoring.ts — pure Kids pillar scoring (no store/network deps)
import type {
  NutritionData, NutritionMode, SleepData, MoodData,
  HealthData, GrowthData, ActivityData, PillarScore, WellnessScores,
} from './analyticsData'
// Type-only import: `sex` is threaded through `buildScores` now so the
// signature is stable, but it's unused until Task 6 wires `scoreGrowth` to
// resolve percentiles — don't import `estimatePercentile`/`resolveSex` yet.
import type { Sex } from './growthStandards'

// Local (non-UTC) YYYY-MM-DD — kept private so this module has no runtime
// dependency back on analyticsData (avoids an import cycle).
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getAgeSleepTarget(ageMonths: number): number {
  if (ageMonths < 4) return 15
  if (ageMonths < 12) return 13
  if (ageMonths < 36) return 12
  return 10.5
}

/**
 * Pick the right nutrition mode + feed-target for an age (in months).
 * - Milk phase: 0-1mo ~10 feeds, 1-3mo ~8, 3-6mo ~6.
 * - Mixed phase (6-12mo): ~5 feeds + solid intro.
 * - Solids (12+mo): treat as meals (target 4 incl. snacks).
 */
export function getNutritionModeForAge(ageMonths: number): { mode: NutritionMode; feedTarget: number } {
  if (ageMonths < 6) {
    if (ageMonths < 1) return { mode: 'milk', feedTarget: 10 }
    if (ageMonths < 3) return { mode: 'milk', feedTarget: 8 }
    return { mode: 'milk', feedTarget: 6 }
  }
  if (ageMonths < 12) return { mode: 'mixed', feedTarget: 5 }
  return { mode: 'solids', feedTarget: 4 }
}

export function scoreLabel(score: number): string {
  if (score >= 8.5) return 'excellent'
  if (score >= 7) return 'good'
  if (score >= 5) return 'fair'
  if (score >= 3) return 'needs attention'
  return 'low'
}

/**
 * Coverage of a scoring window — how much data backs a score, 0..1.
 * `loggedUnits` / `expectedUnits`, clamped. `expectedUnits <= 0` → 0
 * (no window to measure against means no confidence, not full confidence).
 */
export function dataConfidence(loggedUnits: number, expectedUnits: number): number {
  if (expectedUnits <= 0) return 0
  return Math.max(0, Math.min(loggedUnits / expectedUnits, 1))
}

export function scoreNutrition(data: NutritionData): PillarScore {
  if (!data.hasData) return { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 }

  const totalMeals = data.mealFrequency.reduce((a, b) => a + b, 0)
  if (totalMeals === 0) return { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 }

  const windowDays = Math.max(1, data.mealFrequency.length)
  const daysWithData = data.mealFrequency.filter((m) => m > 0).length
  const confidence = dataConfidence(daysWithData, windowDays)

  // ── MILK phase: score purely on feeding frequency vs age-appropriate target.
  // Quality/variety don't apply to breast/bottle feeds.
  if (data.mode === 'milk') {
    const avgFeedsPerLoggedDay = daysWithData > 0 ? totalMeals / daysWithData : 0
    // Frequency score: reach target → 8pts, exceed target (up to 1.2×) → 9pts.
    const freqRatio = Math.min(avgFeedsPerLoggedDay / Math.max(1, data.feedTarget), 1.2)
    const freqScore = Math.min(freqRatio / 1.2, 1) * 8
    // Consistency bonus: logging rate across the window (max 2 pts).
    const consistencyBonus = Math.min(daysWithData / windowDays, 1) * 2
    const raw = Math.min(freqScore + consistencyBonus, 10)
    const value = Math.round(raw * 10) / 10
    // Trend: compare first vs second half of the window.
    const half = Math.floor(windowDays / 2)
    const first = data.mealFrequency.slice(0, half).reduce((a, b) => a + b, 0)
    const second = data.mealFrequency.slice(half).reduce((a, b) => a + b, 0)
    const trend = first > 0 ? Math.round(((second - first) / first) * 100) : 0
    return { value, label: scoreLabel(value), trend, hasData: true, confidence }
  }

  // ── MIXED phase (6–12mo): milk frequency (60%) + solid introduction variety (40%).
  if (data.mode === 'mixed') {
    const avgFeedsPerLoggedDay = daysWithData > 0 ? totalMeals / daysWithData : 0
    const freqRatio = Math.min(avgFeedsPerLoggedDay / Math.max(1, data.feedTarget), 1)
    const freqScore = freqRatio * 10  // 10 pts max, weighted below

    // Variety: target is 3+ distinct foods introduced this window (lower than toddler).
    const varietyScore = Math.min(data.topFoods.length / 3, 1) * 10

    const raw = Math.min(freqScore * 0.6 + varietyScore * 0.4, 10)
    const value = Math.round(raw * 10) / 10

    const half = Math.floor(windowDays / 2)
    const first = data.mealFrequency.slice(0, half).reduce((a, b) => a + b, 0)
    const second = data.mealFrequency.slice(half).reduce((a, b) => a + b, 0)
    const trend = first > 0 ? Math.round(((second - first) / first) * 100) : 0
    return { value, label: scoreLabel(value), trend, hasData: true, confidence }
  }

  // ── SOLIDS phase (12+mo): current quality + frequency + variety logic.
  const totalGood = data.eatQuality.good.reduce((a, b) => a + b, 0)
  const totalLittle = data.eatQuality.little.reduce((a, b) => a + b, 0)

  const qualityScore = ((totalGood * 10 + totalLittle * 5) / totalMeals)
  const freqBonus = Math.min(daysWithData / windowDays, 1) * 1.5
  const varietyBonus = Math.min(data.topFoods.length / 5, 1) * 1.0

  const raw = Math.min(qualityScore + freqBonus + varietyBonus, 10)
  const value = Math.round(raw * 10) / 10

  const half = Math.floor(windowDays / 2)
  const firstHalf = data.eatQuality.good.slice(0, half).reduce((a, b) => a + b, 0)
  const secondHalf = data.eatQuality.good.slice(half).reduce((a, b) => a + b, 0)
  const trend = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0

  return { value, label: scoreLabel(value), trend, hasData: true, confidence }
}

export function scoreSleep(data: SleepData, ageMonths: number): PillarScore {
  if (!data.hasData) return { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 }

  const total = data.qualityCounts.great + data.qualityCounts.good + data.qualityCounts.restless + data.qualityCounts.poor
  if (total === 0) return { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 }

  // Quality score: great=10, good=7.5, restless=4, poor=1
  const qualityScore = (
    data.qualityCounts.great * 10 +
    data.qualityCounts.good * 7.5 +
    data.qualityCounts.restless * 4 +
    data.qualityCounts.poor * 1
  ) / total

  // Hours vs age target: full credit within a small band below target, ramps
  // down with the deficit; mild over-target stays near full (not penalized to 0).
  const target = getAgeSleepTarget(ageMonths)
  const tolerance = 1.0 // hours below target still considered fine
  const deficit = Math.max(0, target - tolerance - data.avgHours)
  const hoursScore = Math.max(0, 10 - (deficit / target) * 12) // steep enough that a 6.6h/12h gap is severe

  // Consistency: days-with-sleep rate scaled to the window size
  const windowDays = Math.max(1, data.dailyHours.length)
  const daysWithSleep = data.dailyHours.filter((h) => h > 0).length
  const consistencyScore = Math.min(daysWithSleep / windowDays, 1) * 10

  // Hours-vs-target is now the dominant term: 50% hours, 30% quality, 20% consistency.
  const raw = Math.min(hoursScore * 0.5 + qualityScore * 0.3 + consistencyScore * 0.2, 10)
  const value = Math.round(raw * 10) / 10

  // Trend: average of the second half vs the first half of the window.
  // Previously this read `slice(0, 3)` vs `slice(4)` and divided by a
  // hardcoded 3 — two bugs in the same line:
  //   1. `slice(4)` skipped day 3 entirely (off-by-one with `slice(0, 3)`).
  //   2. The fixed `/ 3` denominator gave wildly wrong averages on the
  //      30-day and 90-day windows (e.g. dividing a 26-day sum by 3).
  // Now splits the actual window at its midpoint.
  const len = data.dailyHours.length
  const mid = Math.floor(len / 2)
  const firstHalf = data.dailyHours.slice(0, mid)
  const secondHalf = data.dailyHours.slice(mid)
  const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0
  const lastAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0
  const trend = firstAvg > 0 ? Math.round(((lastAvg - firstAvg) / firstAvg) * 100) : 0
  const confidence = dataConfidence(daysWithSleep, windowDays)

  return { value, label: scoreLabel(value), trend, hasData: true, confidence }
}

export function scoreMood(data: MoodData): PillarScore {
  if (!data.hasData) return { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 }

  const totalMoods = data.dominantMoods.reduce((a, m) => a + m.count, 0)
  if (totalMoods === 0) return { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 }

  // Mood weights: happy=10, calm=9, energetic=8, fussy=3, cranky=1
  const moodWeights: Record<string, number> = { happy: 10, calm: 9, energetic: 8, fussy: 3, cranky: 1 }
  let weightedSum = 0
  for (const m of data.dominantMoods) {
    weightedSum += (moodWeights[m.mood] || 5) * m.count
  }
  const raw = Math.min(weightedSum / totalMoods, 10)
  const value = Math.round(raw * 10) / 10

  // Trend: compare first half vs second half of week using daily counts
  const moodKeys = Object.keys(data.dailyCounts)
  let firstHalfScore = 0, firstHalfCount = 0
  let secondHalfScore = 0, secondHalfCount = 0
  for (const mood of moodKeys) {
    const weight = moodWeights[mood] || 5
    const days = data.dailyCounts[mood]
    for (let i = 0; i < days.length; i++) {
      const count = days[i]
      if (count === 0) continue
      if (i < 3) { firstHalfScore += weight * count; firstHalfCount += count }
      else if (i > 3) { secondHalfScore += weight * count; secondHalfCount += count }
    }
  }
  const firstAvg = firstHalfCount > 0 ? firstHalfScore / firstHalfCount : 0
  const secondAvg = secondHalfCount > 0 ? secondHalfScore / secondHalfCount : 0
  const trend = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0

  // Confidence: fraction of the window with at least one logged mood entry.
  const windowDays = Math.max(1, data.weekLabels.length)
  let daysWithMood = 0
  for (let i = 0; i < windowDays; i++) {
    const hasAnyMood = Object.values(data.dailyCounts).some((counts) => (counts[i] ?? 0) > 0)
    if (hasAnyMood) daysWithMood++
  }
  const confidence = dataConfidence(daysWithMood, windowDays)

  return { value, label: scoreLabel(value), trend, hasData: true, confidence }
}

export function scoreHealth(data: HealthData): PillarScore {
  const doneVaccines = data.vaccines.filter((v) => v.done).length
  if (!data.hasData && doneVaccines === 0) {
    return { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 }
  }

  // Vaccine completion score (0-10)
  const vaccineScore = data.vaccines.length > 0 ? (doneVaccines / data.vaccines.length) * 10 : 5

  // Wellness starts high; only genuine concern signals (fever-range temp,
  // injury/doctor/sick notes — see `concernEvents` in buildHealthData) reduce
  // it. Routine logging (a normal temp reading, a medicine dose, a vaccine
  // shot) is neutral and must NOT lower the score — logging more should never
  // read as "less healthy."
  const wellnessScore = Math.max(10 - data.concernEvents * 1.5, 3)

  const value = Math.round(Math.min(vaccineScore * 0.5 + wellnessScore * 0.5, 10) * 10) / 10

  // Confidence: window-coverage from logged days, with a floor so having any
  // vaccine on record never reads as zero-confidence (it's real data, just
  // not this-week data).
  const windowDays = Math.max(1, data.weeklyFrequency.length)
  const loggedDays = data.weeklyFrequency.filter((n) => n > 0).length
  const vaccineFloor = doneVaccines > 0 ? 0.5 : 0
  const confidence = Math.max(vaccineFloor, dataConfidence(loggedDays, windowDays))

  return { value, label: scoreLabel(value), trend: 0, hasData: data.hasData || doneVaccines > 0, confidence }
}

export function scoreGrowth(data: GrowthData): PillarScore {
  if (!data.hasData) return { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 }

  // Growth is tracked by having measurements — more regular = higher score
  const totalMeasurements = data.weights.length + data.heights.length
  const measureScore = Math.min(totalMeasurements / 4, 1) * 7 // up to 7 for having data

  // Bonus for recent measurements (within last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentDate = localDateStr(sevenDaysAgo)
  const hasRecent = data.weights.some((w) => w.date >= recentDate) || data.heights.some((h) => h.date >= recentDate)
  const recencyBonus = hasRecent ? 3 : 1

  const value = Math.round(Math.min(measureScore + recencyBonus, 10) * 10) / 10

  // Confidence: measurement density, halved when nothing is recent — a
  // handful of old measurements shouldn't read as a confident current score.
  const measurementCoverage = Math.min(totalMeasurements / 4, 1)
  const confidence = hasRecent ? measurementCoverage : measurementCoverage * 0.5

  return { value, label: scoreLabel(value), trend: 0, hasData: true, confidence }
}

export function scoreActivity(data: ActivityData): PillarScore {
  if (!data.hasData) return { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 }

  // Base: active-day rate → 0–9 pts. dailySessions.length is the window size.
  const windowDays = Math.max(1, data.dailySessions.length)
  const base = (data.activeDays / windowDays) * 9
  // Variety bonus: up to +1 for logging 3+ different activity types
  const varietyBonus = Math.min(data.uniqueTypes.length / 3, 1)
  const value = Math.round(Math.min(base + varietyBonus, 10) * 10) / 10
  const confidence = dataConfidence(data.activeDays, windowDays)
  return { value, label: scoreLabel(value), trend: 0, hasData: true, confidence }
}

export function buildScores(
  nutrition: NutritionData, sleep: SleepData, mood: MoodData,
  health: HealthData, growth: GrowthData, activity: ActivityData,
  ageMonths: number, sex: Sex | null,
): WellnessScores {
  const ns = scoreNutrition(nutrition)
  const ss = scoreSleep(sleep, ageMonths)
  const ms = scoreMood(mood)
  const hs = scoreHealth(health)
  const gs = scoreGrowth(growth) // sex/ageMonths wired in Task 6

  const as = scoreActivity(activity)

  // Weighted overall: nutrition 27%, sleep 22%, mood 18%, health 13%, growth 9%, activity 11%
  const pillars = [
    { score: ns, weight: 0.27 },
    { score: ss, weight: 0.22 },
    { score: ms, weight: 0.18 },
    { score: hs, weight: 0.13 },
    { score: gs, weight: 0.09 },
    { score: as, weight: 0.11 },
  ]

  const withData = pillars.filter((p) => p.score.hasData)
  let overall = 0
  if (withData.length > 0) {
    const totalWeight = withData.reduce((a, p) => a + p.weight, 0)
    overall = withData.reduce((a, p) => a + p.score.value * (p.weight / totalWeight), 0)
  }
  overall = Math.round(overall * 10) / 10

  // overallConfidence: data-weighted mean of pillar confidences, using the
  // same pillar weights as `overall` (they sum to 1, so no renormalizing).
  const overallConfidence = Math.max(0, Math.min(
    pillars.reduce((a, p) => a + p.score.confidence * p.weight, 0),
    1,
  ))

  return { overall, overallConfidence, nutrition: ns, sleep: ss, mood: ms, health: hs, growth: gs, activity: as }
}
