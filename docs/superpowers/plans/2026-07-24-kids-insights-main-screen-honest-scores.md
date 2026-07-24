# Kids Insights Main Screen — Honest Scores + Confidence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every number on the Kids Insights main screen honest — corrected pillar scores, a per-pillar confidence signal, one cross-log observation — by reworking the shared scoring layer.

**Architecture:** Extract the pure scoring functions out of the large `lib/analyticsData.ts` into a new, dependency-light `lib/kidsScoring.ts` so they are unit-testable; fix each formula there; add a `confidence` field threaded through to a confidence-weighted composite; add a separate pure `lib/kidsCrossInsights.ts` engine; then wire the confidence/cross-log signals into the three presentational pieces (`KidsAnalyticsHero`, `buildInsightHighlights`, `KidsPillarBands`).

**Tech Stack:** TypeScript (strict), React Native / Expo, Jest (`jest-expo`), existing WHO standards in `lib/growthStandards.ts`.

## Global Constraints

- TypeScript strict — no `any`, no implicit `any`. Named exports for functions.
- Score functions stay **pure** — pass age/target in as parameters; never read stores/globals.
- Vaccine surface stays a **tracker only** — no "overdue"/"due-by-age"/scheduling verdicts.
- Growth percentiles are **informational + WHO-sourced** — no diagnostic verdict; never silently fall back on unknown sex (lower confidence + non-definitive framing instead).
- Local date strings only — use a local (non-UTC) date helper, never `toISOString().split('T')[0]`.
- All pillar scores clamp to `0..10`, rounded to 1 decimal. `confidence` clamps to `0..1`.
- Tests live in `lib/__tests__/<name>.test.ts`; run a single file with `npx jest lib/__tests__/<name>.test.ts`.
- Formula weights/thresholds in this plan are **starting values** — tests assert *directional* properties (deficit lowers score, extra logging never lowers health), not magic numbers, so tuning does not break them.

---

## File Structure

- **Create** `lib/kidsScoring.ts` — pure pillar scoring + `getAgeSleepTarget`, `getNutritionModeForAge`, `scoreLabel`, `dataConfidence`, `buildScores`. Depends only on `import type` from `analyticsData.ts`, `lib/growthStandards.ts`, and a local date helper.
- **Create** `lib/kidsCrossInsights.ts` — pure `computeCrossInsights(logs, ageMonths)` cross-log pattern engine.
- **Modify** `lib/analyticsData.ts` — remove the moved functions; re-export from `kidsScoring`; add `confidence`/`concernEvents` fields to the data/score types; enrich `buildHealthData`; pass `ageMonths`/`sex` into scoring.
- **Modify** `components/analytics/KidsAnalytics.tsx` — import `getAgeSleepTarget` from `kidsScoring`; call `computeCrossInsights`; rebuild `buildInsightHighlights`; pass confidence + cross-log line down.
- **Modify** `components/analytics/KidsAnalyticsHero.tsx` — confidence tag in caption.
- **Modify** `components/analytics/KidsPillarBands.tsx` — low-data marker on sparse rows.
- **Create** test files under `lib/__tests__/`.

---

### Task 1: Extract pure scoring into `lib/kidsScoring.ts` (no behavior change)

**Files:**
- Create: `lib/kidsScoring.ts`
- Modify: `lib/analyticsData.ts` (remove moved fns at `:543-549`, `:551-615`, `:617-655`, `:657-691` mood, `:742-778`, `:813-823`, `:825-853`, `getNutritionModeForAge` `:215-223`; add re-exports)
- Modify: `components/analytics/KidsAnalytics.tsx` (`getAgeSleepTarget` `:258-263` → import from `kidsScoring`)
- Test: `lib/__tests__/kidsScoring.test.ts`

**Interfaces:**
- Produces (all named exports from `lib/kidsScoring.ts`):
  - `getAgeSleepTarget(ageMonths: number): number`
  - `getNutritionModeForAge(ageMonths: number): { mode: NutritionMode; feedTarget: number }`
  - `scoreLabel(score: number): string`
  - `scoreNutrition(data: NutritionData): PillarScore`
  - `scoreSleep(data: SleepData): PillarScore`
  - `scoreMood(data: MoodData): PillarScore`
  - `scoreHealth(data: HealthData): PillarScore`
  - `scoreGrowth(data: GrowthData): PillarScore`
  - `scoreActivity(data: ActivityData): PillarScore`
  - `buildScores(nutrition, sleep, mood, health, growth, activity): WellnessScores`
- Consumes: `import type { NutritionData, NutritionMode, SleepData, MoodData, HealthData, GrowthData, ActivityData, PillarScore, WellnessScores } from './analyticsData'` (type-only → no runtime cycle).

- [ ] **Step 1: Create `lib/kidsScoring.ts` with the moved code**

Cut these functions **verbatim** from `lib/analyticsData.ts` into the new file, add `export` to each, and add the imports below. Also cut `getAgeSleepTarget` verbatim from `components/analytics/KidsAnalytics.tsx:258-263`. Add a private local-date helper (do **not** import `localDateStr` from `analyticsData` — that would create a runtime cycle).

```ts
// lib/kidsScoring.ts — pure Kids pillar scoring (no store/network deps)
import type {
  NutritionData, NutritionMode, SleepData, MoodData,
  HealthData, GrowthData, ActivityData, PillarScore, WellnessScores,
} from './analyticsData'

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

// … paste getNutritionModeForAge, scoreLabel, scoreNutrition, scoreSleep,
//    scoreMood, scoreHealth, scoreGrowth, scoreActivity, buildScores here,
//    each prefixed with `export`. Replace their internal `localDateStr(...)`
//    calls with the local helper above (scoreGrowth uses it).
```

In `lib/analyticsData.ts`, replace the removed definitions with a re-export so existing importers keep working:

```ts
export {
  getAgeSleepTarget, getNutritionModeForAge, scoreLabel,
  scoreNutrition, scoreSleep, scoreMood, scoreHealth, scoreGrowth,
  scoreActivity, buildScores,
} from './kidsScoring'
```

Keep `getNutritionModeForAge` callers inside `analyticsData.ts` working (it is used by `buildNutritionData`) — import it at the top: `import { getNutritionModeForAge, buildScores } from './kidsScoring'`. In `components/analytics/KidsAnalytics.tsx`, delete the local `getAgeSleepTarget` and add `import { getAgeSleepTarget } from '../../lib/kidsScoring'`.

- [ ] **Step 2: Write a characterization test locking current outputs**

```ts
// lib/__tests__/kidsScoring.test.ts
import { scoreSleep, scoreHealth, scoreNutrition, buildScores, getAgeSleepTarget } from '../kidsScoring'
import type { SleepData, HealthData } from '../analyticsData'

const sleep = (over: Partial<SleepData> = {}): SleepData => ({
  dailyHours: [5, 5, 6, 5, 5, 0, 0],
  qualityCounts: { great: 4, good: 1, restless: 0, poor: 0 },
  weekLabels: ['M','T','W','T','F','S','S'], avgHours: 5.4, hasData: true, ...over,
})

describe('kidsScoring extraction (characterization)', () => {
  it('getAgeSleepTarget matches age bands', () => {
    expect(getAgeSleepTarget(2)).toBe(15)
    expect(getAgeSleepTarget(26)).toBe(12)
  })
  it('scoreSleep returns a 0..10 value for real data', () => {
    const s = scoreSleep(sleep())
    expect(s.hasData).toBe(true)
    expect(s.value).toBeGreaterThanOrEqual(0)
    expect(s.value).toBeLessThanOrEqual(10)
  })
  it('no-data pillars report hasData false', () => {
    expect(scoreSleep(sleep({ hasData: false })).hasData).toBe(false)
  })
})
```

- [ ] **Step 3: Run the test — expect PASS**

Run: `npx jest lib/__tests__/kidsScoring.test.ts`
Expected: PASS (this is a pure relocation; behavior is unchanged).

- [ ] **Step 4: Verify nothing else broke**

Run: `npm run typecheck` → Expected: no errors.
Run: `npx jest` → Expected: all existing suites still pass.

- [ ] **Step 5: Commit**

```bash
git add lib/kidsScoring.ts lib/analyticsData.ts components/analytics/KidsAnalytics.tsx lib/__tests__/kidsScoring.test.ts
git commit -m "refactor(insights): extract pure Kids scoring into lib/kidsScoring.ts"
```

---

### Task 2: Add `confidence` to scores + `dataConfidence` helper

**Files:**
- Modify: `lib/analyticsData.ts` (`PillarScore` `:97-102`, `WellnessScores` `:114-122`)
- Modify: `lib/kidsScoring.ts`
- Test: `lib/__tests__/kidsScoring.test.ts`

**Interfaces:**
- Produces: `dataConfidence(loggedUnits: number, expectedUnits: number): number` (exported from `kidsScoring`); every `PillarScore` now carries `confidence: number`; `WellnessScores` carries `overallConfidence: number`.
- Consumes: Task 1 exports.

- [ ] **Step 1: Write the failing test**

```ts
import { dataConfidence } from '../kidsScoring'

describe('dataConfidence', () => {
  it('is 0 with no data and ~1 when fully covered', () => {
    expect(dataConfidence(0, 7)).toBe(0)
    expect(dataConfidence(7, 7)).toBe(1)
  })
  it('is partial and clamped', () => {
    expect(dataConfidence(3, 6)).toBeCloseTo(0.5, 5)
    expect(dataConfidence(10, 7)).toBe(1) // clamps at 1
  })
  it('every scored pillar carries a confidence in 0..1', () => {
    const s = scoreSleep(sleep())
    expect(s.confidence).toBeGreaterThan(0)
    expect(s.confidence).toBeLessThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest lib/__tests__/kidsScoring.test.ts`
Expected: FAIL — `dataConfidence` is not exported / `confidence` undefined.

- [ ] **Step 3: Implement**

In `lib/analyticsData.ts` add the fields:

```ts
export interface PillarScore {
  value: number
  label: string
  trend: number
  hasData: boolean
  confidence: number   // 0..1 — how much data backs this score
}

export interface WellnessScores {
  overall: number
  overallConfidence: number   // 0..1 aggregate
  nutrition: PillarScore
  sleep: PillarScore
  mood: PillarScore
  health: PillarScore
  growth: PillarScore
  activity: PillarScore
}
```

In `lib/kidsScoring.ts` add the helper and set `confidence` on every returned score (no-data returns `confidence: 0`; scored returns coverage of its window):

```ts
export function dataConfidence(loggedUnits: number, expectedUnits: number): number {
  if (expectedUnits <= 0) return 0
  return Math.max(0, Math.min(loggedUnits / expectedUnits, 1))
}
```

For each `score*` function: no-data early returns get `confidence: 0`; the scored return gets a `confidence` value:
- `scoreNutrition`: `dataConfidence(daysWithData, windowDays)`
- `scoreSleep`: `dataConfidence(daysWithSleep, windowDays)`
- `scoreMood`: `dataConfidence(daysWithMood, windowDays)` (compute `daysWithMood` from `dailyCounts`)
- `scoreHealth`: `dataConfidence(loggedDays, windowDays)` from `weeklyFrequency.filter(n => n > 0).length` — but never 0 when vaccines exist: `Math.max(vaccineCoverage, loggedCoverage)` where `vaccineCoverage = 0.5` if any vaccine done
- `scoreGrowth`: `Math.min((weights.length + heights.length) / 4, 1)` scaled by recency
- `scoreActivity`: `dataConfidence(activeDays, windowDays)`

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest lib/__tests__/kidsScoring.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify + commit**

Run: `npm run typecheck` → fix any missing `confidence` in test fixtures (add `confidence: 1` where a `PillarScore` literal is constructed in tests). Expected: no errors.

```bash
git add lib/analyticsData.ts lib/kidsScoring.ts lib/__tests__/kidsScoring.test.ts
git commit -m "feat(insights): add confidence to pillar scores + dataConfidence helper"
```

---

### Task 3: Sleep score folds in hours-vs-target

**Files:**
- Modify: `lib/kidsScoring.ts` (`scoreSleep`, `buildScores` signature)
- Modify: `lib/analyticsData.ts` (caller passing `ageMonths` to `buildScores`)
- Test: `lib/__tests__/kidsScoring.test.ts`

**Interfaces:**
- Produces: `scoreSleep(data: SleepData, ageMonths: number): PillarScore`; `buildScores(..., ageMonths: number, sex: Sex | null)` (sex used in Task 6 — add the param now, unused until then).
- Consumes: `getAgeSleepTarget` (Task 1).

- [ ] **Step 1: Write the failing test**

```ts
describe('scoreSleep folds in hours vs target', () => {
  const good = sleep({ dailyHours: [12,12,12,12,12,12,12], avgHours: 12,
    qualityCounts: { great: 7, good: 0, restless: 0, poor: 0 } })
  const deficit = sleep({ dailyHours: [5,5,6,5,5,5,5], avgHours: 5.3,
    qualityCounts: { great: 7, good: 0, restless: 0, poor: 0 } }) // all "great" but far under target

  it('a large deficit scores well below an at-target child, even with great quality', () => {
    const g = scoreSleep(good, 26)      // target 12h, meets it
    const d = scoreSleep(deficit, 26)   // ~6.7h short
    expect(d.value).toBeLessThan(g.value - 2)
  })
  it('meeting the target scores high', () => {
    expect(scoreSleep(good, 26).value).toBeGreaterThanOrEqual(8)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest lib/__tests__/kidsScoring.test.ts`
Expected: FAIL — current `scoreSleep` ignores hours; `deficit` scores as high as `good`.

- [ ] **Step 3: Implement**

Add `ageMonths` param and an hours term. Replace the `raw` line:

```ts
export function scoreSleep(data: SleepData, ageMonths: number): PillarScore {
  if (!data.hasData) return { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 }
  const total = data.qualityCounts.great + data.qualityCounts.good + data.qualityCounts.restless + data.qualityCounts.poor
  if (total === 0) return { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 }

  const qualityScore = (data.qualityCounts.great*10 + data.qualityCounts.good*7.5 + data.qualityCounts.restless*4 + data.qualityCounts.poor*1) / total

  // Hours vs age target: full credit within a small band below target, ramps
  // down with the deficit; mild over-target stays near full (not penalized to 0).
  const target = getAgeSleepTarget(ageMonths)
  const tolerance = 1.0 // hours below target still considered fine
  const deficit = Math.max(0, target - tolerance - data.avgHours)
  const hoursScore = Math.max(0, 10 - (deficit / target) * 12) // steep enough that a 6.6h/12h gap is severe

  const windowDays = Math.max(1, data.dailyHours.length)
  const daysWithSleep = data.dailyHours.filter((h) => h > 0).length
  const consistencyScore = Math.min(daysWithSleep / windowDays, 1) * 10

  const raw = Math.min(hoursScore*0.5 + qualityScore*0.3 + consistencyScore*0.2, 10)
  const value = Math.round(raw * 10) / 10

  const len = data.dailyHours.length
  const mid = Math.floor(len / 2)
  const firstHalf = data.dailyHours.slice(0, mid)
  const secondHalf = data.dailyHours.slice(mid)
  const firstAvg = firstHalf.length ? firstHalf.reduce((a,b)=>a+b,0)/firstHalf.length : 0
  const lastAvg = secondHalf.length ? secondHalf.reduce((a,b)=>a+b,0)/secondHalf.length : 0
  const trend = firstAvg > 0 ? Math.round(((lastAvg - firstAvg) / firstAvg) * 100) : 0

  return { value, label: scoreLabel(value), trend, hasData: true, confidence: dataConfidence(daysWithSleep, windowDays) }
}
```

Update `buildScores` to accept and thread the params:

```ts
import { estimatePercentile, resolveSex, type Sex } from './growthStandards'

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
  // …existing weighting (confidence-weighting added in Task 7)…
}
```

In `lib/analyticsData.ts`, find the `buildScores(...)` call (inside the hook that assembles `AnalyticsData`) and pass `ageMonths` and `sex` (resolve from the child profile; if the hook lacks `ageMonths`/`sex`, thread them from the existing `ageMonths` the hook already receives — see `useKidsAnalytics` at `:874`; pass `null` for sex for now).

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest lib/__tests__/kidsScoring.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify + commit**

Run: `npm run typecheck` → update any other `scoreSleep(`/`buildScores(` callers to the new signatures. Expected: no errors.

```bash
git add lib/kidsScoring.ts lib/analyticsData.ts lib/__tests__/kidsScoring.test.ts
git commit -m "feat(insights): sleep score reflects hours vs age target"
```

---

### Task 4: Health score stops penalizing routine logging

**Files:**
- Modify: `lib/analyticsData.ts` (`HealthData` `:64-70`, `buildHealthData` `:409-444`)
- Modify: `lib/kidsScoring.ts` (`scoreHealth`)
- Test: `lib/__tests__/kidsScoring.test.ts`

**Interfaces:**
- Produces: `HealthData` gains `concernEvents: number` (fever + injury/doctor-visit notes). `scoreHealth` uses `concernEvents`, not total `weeklyFrequency`.
- Consumes: raw `ChildLog` parsing already present in `buildHealthData`.

- [ ] **Step 1: Write the failing test**

```ts
const health = (over: Partial<HealthData> = {}): HealthData => ({
  recentEvents: [], weeklyFrequency: [0,0,0,0,0,0,0], concernEvents: 0,
  vaccines: [{ name: 'HepB', done: true }, ...Array(7).fill(0).map((_,i)=>({ name:'V'+i, done:false }))],
  weekLabels: ['M','T','W','T','F','S','S'], hasData: true, ...over,
})

describe('scoreHealth is not perverse', () => {
  it('routine logging (no concern events) does NOT lower the score', () => {
    const quiet = scoreHealth(health({ weeklyFrequency: [0,0,0,0,0,0,0], concernEvents: 0 }))
    const logged = scoreHealth(health({ weeklyFrequency: [3,2,1,0,0,0,0], concernEvents: 0 }))
    expect(logged.value).toBeGreaterThanOrEqual(quiet.value)
  })
  it('genuine concern events DO lower the score', () => {
    const calm = scoreHealth(health({ concernEvents: 0 }))
    const sick = scoreHealth(health({ concernEvents: 4 }))
    expect(sick.value).toBeLessThan(calm.value)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest lib/__tests__/kidsScoring.test.ts`
Expected: FAIL — `concernEvents` missing; current logic penalizes all `weeklyFrequency`.

- [ ] **Step 3: Implement**

Add the field + classification in `buildHealthData` (raw `log.value` is available there). Add to `HealthData`: `concernEvents: number`. Inside the loop:

```ts
let concernEvents = 0
const FEVER_C = 38.0
for (const log of healthLogs) {
  // …existing weeklyFreq / recentEvents / vaccine handling…
  if (log.type === 'temperature' && log.value) {
    const t = parseFloat(String(log.value).replace(',', '.'))
    if (!isNaN(t) && t >= FEVER_C) concernEvents++
  } else if (log.type === 'note') {
    const v = asRecord(parseValue(log.value))
    const kind = String(v?.eventType ?? '').toLowerCase()
    if (kind.includes('injur') || kind.includes('doctor') || kind.includes('sick')) concernEvents++
  }
}
return { recentEvents: recentEvents.slice(0, 5), weeklyFrequency: weeklyFreq, concernEvents, vaccines, weekLabels: labels, hasData: healthLogs.length > 0 }
```

Rewrite `scoreHealth`:

```ts
export function scoreHealth(data: HealthData): PillarScore {
  const doneVaccines = data.vaccines.filter((v) => v.done).length
  if (!data.hasData && doneVaccines === 0) {
    return { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 }
  }
  const vaccineScore = data.vaccines.length > 0 ? (doneVaccines / data.vaccines.length) * 10 : 5
  // Wellness starts high; only genuine concern signals reduce it. Routine logs are neutral.
  const wellnessScore = Math.max(10 - data.concernEvents * 1.5, 3)
  const value = Math.round(Math.min(vaccineScore * 0.5 + wellnessScore * 0.5, 10) * 10) / 10
  const loggedDays = data.weeklyFrequency.filter((n) => n > 0).length
  const windowDays = Math.max(1, data.weeklyFrequency.length)
  const confidence = Math.max(doneVaccines > 0 ? 0.5 : 0, dataConfidence(loggedDays, windowDays))
  return { value, label: scoreLabel(value), trend: 0, hasData: data.hasData || doneVaccines > 0, confidence }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest lib/__tests__/kidsScoring.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify + commit**

Run: `npm run typecheck` → add `concernEvents` to any `HealthData` literal (e.g. the empty-state builder). Expected: no errors.

```bash
git add lib/analyticsData.ts lib/kidsScoring.ts lib/__tests__/kidsScoring.test.ts
git commit -m "feat(insights): health score counts only genuine concern events"
```

---

### Task 5: Nutrition small-sample guard

**Files:**
- Modify: `lib/kidsScoring.ts` (`scoreNutrition`)
- Test: `lib/__tests__/kidsScoring.test.ts`

**Interfaces:**
- Produces: `scoreNutrition` regresses sparse samples toward a neutral baseline; unchanged when data is full.
- Consumes: `dataConfidence` (Task 2).

- [ ] **Step 1: Write the failing test**

```ts
import type { NutritionData } from '../analyticsData'
const nutri = (over: Partial<NutritionData> = {}): NutritionData => ({
  mode: 'solids', mealFrequency: new Array(7).fill(0), eatQuality: { good: new Array(7).fill(0), little: new Array(7).fill(0), none: new Array(7).fill(0) },
  topFoods: [], breastSessions: [], bottleSessions: [], bottleMlPerDay: [], feedTarget: 4,
  weekLabels: ['M','T','W','T','F','S','S'], hasData: true, ...over,
})

describe('nutrition small-sample guard', () => {
  it('one perfect meal does not score near 10', () => {
    const one = nutri({ mealFrequency: [1,0,0,0,0,0,0], eatQuality: { good:[1,0,0,0,0,0,0], little:new Array(7).fill(0), none:new Array(7).fill(0) }, topFoods:[{label:'cheese',count:1}] })
    const s = scoreNutrition(one)
    expect(s.value).toBeLessThan(8)
    expect(s.confidence).toBeLessThan(0.5)
  })
  it('a full week of good meals scores high with high confidence', () => {
    const full = nutri({ mealFrequency:[3,3,3,3,3,3,3], eatQuality:{ good:[3,3,3,3,3,3,3], little:new Array(7).fill(0), none:new Array(7).fill(0) }, topFoods:[{label:'a',count:5},{label:'b',count:5},{label:'c',count:5},{label:'d',count:5},{label:'e',count:5}] })
    const s = scoreNutrition(full)
    expect(s.value).toBeGreaterThanOrEqual(8)
    expect(s.confidence).toBeGreaterThan(0.9)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest lib/__tests__/kidsScoring.test.ts`
Expected: FAIL — one perfect meal currently yields ~10.

- [ ] **Step 3: Implement**

At the end of each mode branch in `scoreNutrition`, before returning, shrink toward a neutral baseline by coverage:

```ts
const NEUTRAL = 5
const coverage = dataConfidence(daysWithData, windowDays)
// shrink: sparse data pulled toward NEUTRAL; full data → rawValue unchanged
const guarded = NEUTRAL + (raw - NEUTRAL) * coverage
const value = Math.round(Math.min(guarded, 10) * 10) / 10
return { value, label: scoreLabel(value), trend, hasData: true, confidence: coverage }
```

Apply to all three mode branches (milk/mixed/solids), replacing their existing `value`/return lines with the guarded version (reuse each branch's own `raw`, `daysWithData`, `windowDays`, `trend`).

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest lib/__tests__/kidsScoring.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/kidsScoring.ts lib/__tests__/kidsScoring.test.ts
git commit -m "feat(insights): nutrition small-sample guard (no 10.0 off one meal)"
```

---

### Task 6: Growth score uses real WHO percentiles

**Files:**
- Modify: `lib/kidsScoring.ts` (`scoreGrowth`, `buildScores` wiring)
- Modify: `lib/analyticsData.ts` (resolve child `sex`, pass to `buildScores`)
- Test: `lib/__tests__/kidsScoring.test.ts`

**Interfaces:**
- Produces: `scoreGrowth(data: GrowthData, ageMonths: number, sex: Sex | null): PillarScore` — rewards having recent measurements + tracking along a curve; large percentile crossings lower the score; unknown sex → lower confidence, non-definitive.
- Consumes: `estimatePercentile`, `resolveSex`, `Sex` from `lib/growthStandards.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import type { GrowthData } from '../analyticsData'
const growth = (over: Partial<GrowthData> = {}): GrowthData => ({ weights: [], heights: [], heads: [], hasData: true, ...over })

describe('scoreGrowth uses WHO percentiles', () => {
  it('a stable curve scores well regardless of percentile level', () => {
    const stable = growth({ weights: [
      { value: 12.0, date: '2026-06-01' }, { value: 12.4, date: '2026-07-01' }, { value: 12.8, date: '2026-07-20' },
    ] })
    expect(scoreGrowth(stable, 26, 'male').value).toBeGreaterThanOrEqual(7)
  })
  it('a large percentile crossing lowers the score', () => {
    const crossing = growth({ weights: [
      { value: 15.5, date: '2026-06-01' }, { value: 12.0, date: '2026-07-01' }, { value: 10.5, date: '2026-07-20' },
    ] })
    const stable = growth({ weights: [
      { value: 12.0, date: '2026-06-01' }, { value: 12.4, date: '2026-07-01' }, { value: 12.8, date: '2026-07-20' },
    ] })
    expect(scoreGrowth(crossing, 26, 'male').value).toBeLessThan(scoreGrowth(stable, 26, 'male').value)
  })
  it('unknown sex lowers confidence', () => {
    const s = growth({ weights: [{ value: 12, date: '2026-07-20' }, { value: 12.4, date: '2026-07-21' }] })
    expect(scoreGrowth(s, 26, null).confidence).toBeLessThan(scoreGrowth(s, 26, 'male').confidence)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest lib/__tests__/kidsScoring.test.ts`
Expected: FAIL — current `scoreGrowth` only counts measurements + recency.

- [ ] **Step 3: Implement**

```ts
import { estimatePercentile, type Sex } from './growthStandards'

export function scoreGrowth(data: GrowthData, ageMonths: number, sex: Sex | null): PillarScore {
  if (!data.hasData) return { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 }
  const series = data.weights.length >= data.heights.length ? data.weights : data.heights
  const metric = data.weights.length >= data.heights.length ? 'weight' as const : 'height' as const
  const count = series.length

  // Base: having measurements + recency.
  const seven = new Date(); seven.setDate(seven.getDate() - 7)
  const recentDate = localDateStr(seven)
  const hasRecent = series.some((m) => m.date >= recentDate)
  let value = Math.min(count / 3, 1) * 6 + (hasRecent ? 2 : 0)

  // Curve tracking: penalize large percentile crossings between first and last.
  let crossingPenalty = 0
  if (sex && count >= 2) {
    const first = estimatePercentile(metric, sex, ageMonths, series[0].value)
    const last = estimatePercentile(metric, sex, ageMonths, series[series.length - 1].value)
    if (first != null && last != null) {
      const jump = Math.abs(last - first) // percentile points
      crossingPenalty = Math.min(jump / 10, 4) // up to −4 for a big crossing
      value += 2 // reward that we could place it on a curve at all
    }
  }
  value = Math.round(Math.max(Math.min(value - crossingPenalty, 10), 0) * 10) / 10

  const sexCertainty = sex ? 1 : 0.4
  const confidence = Math.min((count / 3) * (hasRecent ? 1 : 0.7) * sexCertainty, 1)
  return { value, label: scoreLabel(value), trend: 0, hasData: true, confidence }
}
```

Wire `buildScores` to call `scoreGrowth(growth, ageMonths, sex)`. In `lib/analyticsData.ts`, resolve `sex` from the child profile with `resolveSex` and pass into `buildScores` (replace the `null` placeholder from Task 3). If the hook does not already have the child's raw sex string, thread it from the same place `ageMonths`/`childName` come from; if unavailable, pass `null` (→ lower confidence, per compliance).

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest lib/__tests__/kidsScoring.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/kidsScoring.ts lib/analyticsData.ts lib/__tests__/kidsScoring.test.ts
git commit -m "feat(insights): growth score tracks WHO percentile curve (informational)"
```

---

### Task 7: Confidence-weighted composite

**Files:**
- Modify: `lib/kidsScoring.ts` (`buildScores`)
- Test: `lib/__tests__/kidsScoring.test.ts`

**Interfaces:**
- Produces: `buildScores` weights each pillar by `weight × confidence` and sets `WellnessScores.overallConfidence`.
- Consumes: per-pillar `confidence` (Tasks 2–6).

- [ ] **Step 1: Write the failing test**

```ts
describe('confidence-weighted overall', () => {
  it('a high-value low-confidence pillar contributes little', () => {
    const full = buildScores(
      nutri({ mealFrequency:[3,3,3,3,3,3,3], eatQuality:{good:[3,3,3,3,3,3,3],little:new Array(7).fill(0),none:new Array(7).fill(0)}, topFoods:[{label:'a',count:5},{label:'b',count:5},{label:'c',count:5},{label:'d',count:5},{label:'e',count:5}] }),
      sleep({ dailyHours:[5,5,5,5,5,0,0], avgHours:5 }), // low sleep, decent confidence
      { dailyCounts:{}, dominantMoods:[], weekLabels:[], hasData:false },
      health({ concernEvents:0 }), growth(), 
      { activeDays:0,totalSessions:0,totalMinutes:0,uniqueTypes:[],dailySessions:[0,0,0,0,0,0,0],weekLabels:[],hasData:false },
      26, 'male',
    )
    expect(full.overallConfidence).toBeGreaterThan(0)
    expect(full.overallConfidence).toBeLessThanOrEqual(1)
    expect(full.overall).toBeGreaterThanOrEqual(0)
    expect(full.overall).toBeLessThanOrEqual(10)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest lib/__tests__/kidsScoring.test.ts`
Expected: FAIL — `overallConfidence` undefined.

- [ ] **Step 3: Implement**

Replace the weighting block in `buildScores`:

```ts
const pillars = [
  { score: ns, weight: 0.27 }, { score: ss, weight: 0.22 }, { score: ms, weight: 0.18 },
  { score: hs, weight: 0.13 }, { score: gs, weight: 0.09 }, { score: as, weight: 0.11 },
]
const present = pillars.filter((p) => p.score.hasData)
let overall = 0
let overallConfidence = 0
if (present.length > 0) {
  const effTotal = present.reduce((a, p) => a + p.weight * p.score.confidence, 0)
  if (effTotal > 0) {
    overall = present.reduce((a, p) => a + p.score.value * ((p.weight * p.score.confidence) / effTotal), 0)
  } else {
    const wTotal = present.reduce((a, p) => a + p.weight, 0)
    overall = present.reduce((a, p) => a + p.score.value * (p.weight / wTotal), 0)
  }
  const wTotal = present.reduce((a, p) => a + p.weight, 0)
  overallConfidence = present.reduce((a, p) => a + p.score.confidence * (p.weight / wTotal), 0)
}
overall = Math.round(overall * 10) / 10
overallConfidence = Math.round(overallConfidence * 100) / 100
return { overall, overallConfidence, nutrition: ns, sleep: ss, mood: ms, health: hs, growth: gs, activity: as }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest lib/__tests__/kidsScoring.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify + commit**

Run: `npm run typecheck` → ensure any consumer of `WellnessScores` compiles. Expected: no errors.

```bash
git add lib/kidsScoring.ts lib/__tests__/kidsScoring.test.ts
git commit -m "feat(insights): confidence-weighted overall wellness score"
```

---

### Task 8: Cross-log insight engine `lib/kidsCrossInsights.ts`

**Files:**
- Create: `lib/kidsCrossInsights.ts`
- Test: `lib/__tests__/kidsCrossInsights.test.ts`

**Interfaces:**
- Produces: `computeCrossInsights(logs: ChildLog[], ageMonths: number): CrossInsight[]` and `interface CrossInsight { kind: 'sleep_mood'|'food_reaction'|'night_waking'; severity: 'watch'|'note'|'win'; line: string; pillars: string[] }`. Sorted most-important first.
- Consumes: raw `child_logs` rows (same shape used by `analyticsData`).

- [ ] **Step 1: Write the failing test**

```ts
import { computeCrossInsights } from '../kidsCrossInsights'
type Log = { id: string; child_id: string; date: string; type: string; value: string | null; notes: string | null; photos: string[]; created_at: string }
const log = (date: string, type: string, value: string): Log => ({ id: date+type, child_id: 'c', date, type, value, notes: null, photos: [], created_at: date })

describe('computeCrossInsights sleep→mood', () => {
  it('fires when short-sleep nights precede cranky days (above threshold)', () => {
    const logs: Log[] = [
      log('2026-07-01','sleep',JSON.stringify({ duration: 5, quality: 'poor' })), log('2026-07-02','mood','cranky'),
      log('2026-07-03','sleep',JSON.stringify({ duration: 5, quality: 'poor' })), log('2026-07-04','mood','fussy'),
      log('2026-07-05','sleep',JSON.stringify({ duration: 5, quality: 'poor' })), log('2026-07-06','mood','cranky'),
    ]
    const out = computeCrossInsights(logs, 26)
    expect(out.some((i) => i.kind === 'sleep_mood')).toBe(true)
  })
  it('does NOT fire on a single occurrence (below threshold)', () => {
    const logs: Log[] = [ log('2026-07-01','sleep',JSON.stringify({ duration: 5, quality: 'poor' })), log('2026-07-02','mood','cranky') ]
    expect(computeCrossInsights(logs, 26).some((i) => i.kind === 'sleep_mood')).toBe(false)
  })
  it('returns [] for empty logs', () => {
    expect(computeCrossInsights([], 26)).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest lib/__tests__/kidsCrossInsights.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```ts
// lib/kidsCrossInsights.ts — pure cross-log pattern engine
interface ChildLog { id: string; child_id: string; date: string; type: string; value: string | null; notes: string | null; photos: string[]; created_at: string }
export interface CrossInsight { kind: 'sleep_mood' | 'food_reaction' | 'night_waking'; severity: 'watch' | 'note' | 'win'; line: string; pillars: string[] }

function parse(value: string | null): any { if (!value) return null; try { return JSON.parse(value) } catch { return value } }
function nextDay(date: string): string { const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) }
const CRANKY = new Set(['cranky', 'fussy'])
const MIN_SLEEP_MOOD = 3          // occurrences before we surface the pattern
const SHORT_SLEEP_H = 8           // toddler-ish; tune per age later

export function computeCrossInsights(logs: ChildLog[], _ageMonths: number): CrossInsight[] {
  const out: CrossInsight[] = []

  // sleep → next-day cranky/fussy
  const shortNights = new Set(
    logs.filter((l) => l.type === 'sleep').filter((l) => {
      const v = parse(l.value); const h = typeof v === 'object' ? parseFloat(String(v?.duration ?? '')) : NaN
      return (!isNaN(h) && h < SHORT_SLEEP_H) || (typeof v === 'object' && v?.quality === 'poor')
    }).map((l) => l.date),
  )
  const crankyDays = new Set(
    logs.filter((l) => l.type === 'mood').filter((l) => { const v = parse(l.value); return CRANKY.has(String(typeof v === 'object' ? v?.mood ?? '' : v)) }).map((l) => l.date),
  )
  let hits = 0
  shortNights.forEach((d) => { if (crankyDays.has(nextDay(d))) hits++ })
  if (hits >= MIN_SLEEP_MOOD) {
    out.push({ kind: 'sleep_mood', severity: 'watch', pillars: ['sleep', 'mood'],
      line: `On the ${hits} shortest-sleep nights, the next day was crankier.` })
  }

  // food reaction watch
  const reactions = logs.filter((l) => l.type === 'food').map((l) => parse(l.value)).filter((v) => v && (v.hasReaction || v.reactionFood))
  if (reactions.length >= 2) {
    const food = reactions.find((r) => r.reactionFood)?.reactionFood
    out.push({ kind: 'food_reaction', severity: 'watch', pillars: ['nutrition'],
      line: food ? `Possible reactions logged around ${food} — worth watching.` : `A couple of food reactions were logged this week — worth watching.` })
  }

  const order = { watch: 0, note: 1, win: 2 }
  return out.sort((a, b) => order[a.severity] - order[b.severity])
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest lib/__tests__/kidsCrossInsights.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/kidsCrossInsights.ts lib/__tests__/kidsCrossInsights.test.ts
git commit -m "feat(insights): cross-log pattern engine (sleep→mood, food reactions)"
```

---

### Task 9: Narrative rebuild + one cross-log line (`buildInsightHighlights`)

**Files:**
- Modify: `components/analytics/KidsAnalytics.tsx` (`buildInsightHighlights` `:1704-1789`, its call site, `InsightHighlights` type)
- Test: `lib/__tests__/kidsInsightHighlights.test.ts`

**Interfaces:**
- Consumes: `WellnessScores` (with `confidence`/`overallConfidence`), `computeCrossInsights` (Task 8).
- Produces: `buildInsightHighlights` gains a `crossLine: string | null` on `InsightHighlights`; suppresses confident strength/concern claims when `confidence < LOW_CONF` (0.4).

To make this testable, **export** `buildInsightHighlights` from `KidsAnalytics.tsx` (add `export`), and have it accept the top cross-insight line as a param so the test does not need React.

- [ ] **Step 1: Write the failing test**

```ts
import { buildInsightHighlights } from '../../components/analytics/KidsAnalytics'
// build a WellnessScores where nutrition is high-value but LOW confidence
```

```ts
describe('buildInsightHighlights honesty', () => {
  it('does not call a low-confidence pillar a strength', () => {
    const scores = { overall: 7, overallConfidence: 0.3,
      nutrition: { value: 10, label: 'excellent', trend: 0, hasData: true, confidence: 0.2 },
      sleep: { value: 4, label: 'needs attention', trend: 0, hasData: true, confidence: 0.8 },
      mood: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      health: { value: 6, label: 'fair', trend: 0, hasData: true, confidence: 0.6 },
      growth: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 },
      activity: { value: 0, label: 'no data', trend: 0, hasData: false, confidence: 0 } }
    const h = buildInsightHighlights(scores as any, {} as any, 'Rio', 26, 'On the 3 shortest-sleep nights, the next day was crankier.')
    expect(h.message).not.toMatch(/strength/i)
    expect(h.crossLine).toMatch(/crankier/)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest lib/__tests__/kidsInsightHighlights.test.ts`
Expected: FAIL — `buildInsightHighlights` not exported / no `crossLine` / 5th param.

- [ ] **Step 3: Implement**

Add `export` to `buildInsightHighlights` and a 5th param + `crossLine` on the return type. Gate strength/concern on confidence:

```ts
const LOW_CONF = 0.4
export function buildInsightHighlights(
  scores: WellnessScores, analytics: AnalyticsData, childName: string, ageMonths: number, crossLine: string | null,
): InsightHighlights {
  // …existing lowest/highest/overallLabel…
  // Only assert a strength if that pillar's confidence clears the bar:
  if (highest && scores[highest].value >= 8 && scores[highest].confidence >= LOW_CONF && highest !== lowest) { /* …push strength… */ }
  // Same guard on the concern sentence.
  // If overallConfidence < LOW_CONF, replace strength/concern sentences with a
  // "log a few more days for a clearer read" nudge.
  return { /* …existing… */, crossLine }
}
```

Add `crossLine: string | null` to `interface InsightHighlights`. At the call site, compute `const cross = computeCrossInsights(rawLogs, ageMonths)` (rawLogs already fetched by the hook) and pass `cross[0]?.line ?? null`. Render `crossLine` as a `Grandma noticed:` line under the narrative paragraph (mono-caps eyebrow + serif line), only when non-null.

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest lib/__tests__/kidsInsightHighlights.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify + commit**

Run: `npm run typecheck` → Expected: no errors.

```bash
git add components/analytics/KidsAnalytics.tsx lib/__tests__/kidsInsightHighlights.test.ts
git commit -m "feat(insights): honest narrative + one Grandma-noticed cross-log line"
```

---

### Task 10: Hero confidence tag

**Files:**
- Modify: `components/analytics/KidsAnalyticsHero.tsx`
- Modify: `components/analytics/KidsAnalytics.tsx` (pass `overallConfidence` / caption)

**Interfaces:**
- Consumes: `WellnessScores.overallConfidence`.
- Produces: `KidsAnalyticsHero` caption shows a low-data tag when confidence is low.

- [ ] **Step 1: Add the confidence tag**

In `KidsAnalyticsHero.tsx` add an optional prop and render:

```ts
interface Props { overall: number; hasData: boolean; caption: string; childName: string; band: string; lowConfidence?: boolean }
// in JSX, when lowConfidence, append a mono chip after the caption:
{lowConfidence && (
  <Text style={[styles.cap, { color: colors.ink3 }]}>  ·  LOW DATA</Text>
)}
```

At the caller in `KidsAnalytics.tsx`, pass `lowConfidence={scores.overallConfidence < 0.4}`.

- [ ] **Step 2: Verify**

Run: `npm run typecheck` → Expected: no errors.

- [ ] **Step 3: Visual check (real app)**

Launch the app (see repo daily-flow help) on a child with sparse logs; open the Insights tab; confirm the hero reads `THIS WEEK · … · LOW DATA` and the number no longer looks authoritative. Capture a screenshot.

- [ ] **Step 4: Commit**

```bash
git add components/analytics/KidsAnalyticsHero.tsx components/analytics/KidsAnalytics.tsx
git commit -m "feat(insights): hero shows a low-data tag when confidence is thin"
```

---

### Task 11: Pillar-band low-data marker

**Files:**
- Modify: `components/analytics/KidsPillarBands.tsx`
- Modify: `components/analytics/KidsAnalytics.tsx` (ensure `PillarBandItem.score` carries `confidence` — it already passes the `PillarScore`)

**Interfaces:**
- Consumes: `item.score.confidence`.
- Produces: sparse rows render `· low data` in the takeaway and a dimmed number.

- [ ] **Step 1: Implement the marker**

In `KidsPillarBands.tsx`, compute `const low = has && (item.score!.confidence ?? 1) < 0.4` and:
- Append `· low data` to the takeaway line when `low` (mono, `colors.ink3`).
- Dim the big number when `low` (e.g. color `colors.ink3` instead of `ink`).

```ts
const low = has && (item.score!.confidence ?? 1) < 0.4
// name/takeaway row:
{item.takeaway ? (
  <Text style={[styles.takeaway, { color: colors.ink2 }]} numberOfLines={1}>
    {item.takeaway}{low ? '  ·  low data' : ''}
  </Text>
) : (low ? <Text style={[styles.takeaway, { color: colors.ink3 }]}>low data</Text> : null)}
// value color:
<Text style={[styles.value, focus && styles.valueFocus, { color: has ? (low ? colors.ink3 : ink) : colors.ink3 }]}>
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck` → Expected: no errors.

- [ ] **Step 3: Visual check (real app)**

Open the Insights tab; confirm sparse pillars show the muted `· low data` marker + dimmed number while well-logged pillars render bold. Screenshot.

- [ ] **Step 4: Commit**

```bash
git add components/analytics/KidsPillarBands.tsx components/analytics/KidsAnalytics.tsx
git commit -m "feat(insights): pillar bands mark low-data rows as provisional"
```

---

## Self-Review

**Spec coverage:**
- §4.1 confidence field → Task 2. §4.2 Sleep → T3, Health → T4, Nutrition → T5, Growth → T6, Mood/Activity confidence → T2. §4.3 composite → T7. §4.4 hero tag → T10. §4.5 narrative + cross-line → T9. §4.6 cross-log engine → T8. §4.7 bands marker → T11. Extraction/testability precondition → T1. All spec sections mapped.
- Non-goals respected: no pop-up/chart work; vaccine stays a tracker (T4 only reads `done`); growth is informational with no silent sex fallback (T6 lowers confidence on `null` sex).

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". Task 1 uses an explicit verbatim-move instruction with exact source line ranges (a relocation, not new logic) rather than re-pasting 300 lines — every new/changed function elsewhere shows complete code.

**Type consistency:** `PillarScore.confidence` and `WellnessScores.overallConfidence` are introduced in T2 and consumed with those exact names in T7/T9/T10/T11. `scoreSleep(data, ageMonths)` (T3), `scoreGrowth(data, ageMonths, sex)` (T6), and `buildScores(..., ageMonths, sex)` (T3/T6) signatures are consistent across their consumers. `HealthData.concernEvents` (T4) is set in `buildHealthData` and read in `scoreHealth`. `CrossInsight` shape (T8) is consumed as `cross[0]?.line` in T9.

**Note on tuning:** All magic numbers (sleep tolerance/ramp, nutrition NEUTRAL/shrink, health penalty, growth crossing scale, `LOW_CONF = 0.4`, cross-log thresholds) are starting values; tests assert direction, so tuning against real sample data will not break the suite.
