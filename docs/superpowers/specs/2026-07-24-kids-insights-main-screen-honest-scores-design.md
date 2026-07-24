# Kids Insights — Main Screen: Honest Scores + Confidence

**Date:** 2026-07-24
**Status:** Design — awaiting review
**Scope:** The Kids Analytics landing screen (Diffuse variant) and the shared scoring layer it is built from. **Not** the pillar detail pop-ups — those are a follow-up spec that inherits this scoring work for free.

---

## 1. Problem

The Kids Insights main screen (`components/analytics/KidsAnalytics.tsx` → `KidsAnalyticsHero` + narrative paragraph + `KidsPillarBands`) is visually on-system, but everything it displays is generated from **shallow or misleading pillar scores** computed in `lib/analyticsData.ts`. The result is a confident-looking screen that tells the parent things that are not true:

- **Nutrition = 10.0/10** off a single logged meal / single food. Small samples inflate to perfect, and the narrative then calls it "a strength."
- **Health = 4.8/10** because logging a temperature or medicine is treated as a "concerning event" that *subtracts* points. Logging more health data lowers the score — a perverse incentive.
- **Sleep = 5.9/10** while the child is 6.6h under the age target. The score ignores hours-vs-target entirely; it only looks at quality + consistency. The one number that matters is excluded.
- **Growth** score is purely "did you log a measurement recently" — a logging-diligence proxy dressed as a wellness score. No percentile, despite `lib/growthStandards.ts` already providing WHO standards.
- The whole screen reads **confident on near-empty data** ("0 logged days" everywhere) because no score carries a notion of how much data backs it.
- Rich captured data is never used: cross-log patterns (short sleep → cranky next day), food-reaction allergy signals, night-waking from sleep start/end times.

## 2. Goals

1. Make every number on the main screen **honest** — scores reflect reality, and a small/empty sample never reads as a confident verdict.
2. Introduce a **confidence** signal per pillar (and overall) driven by how much data backs the score, surfaced in the UI so provisional scores look provisional.
3. Surface **one** genuine higher-level cross-log observation on the main screen when a real pattern exists ("Grandma noticed…"), with the deep breakdown deferred to the pop-up phase.
4. Keep the existing editorial layout; changes are content/trust + light UI affordances, not a visual redesign.

## 3. Non-Goals

- The pillar **detail pop-ups** (chart migration to `MiniCharts`, retiring `FullScreenChart`, replacing the dead `ScoreMathCard` with a real explanation card, `StatRow`→shared tiles). Separate follow-up spec.
- Any change to the **legacy (current-variant)** analytics rendering beyond what falls out of the shared scoring change. This spec targets the Diffuse main screen; the scoring layer is shared, so legacy numbers improve too, but no legacy-specific UI work.
- Vaccine **scheduling / due-by-age verdicts**. Per the standing compliance rule, the vaccine surface stays a *tracker + sourced reference*, never a clinical scheduler. No "overdue"/"due soon" logic is introduced.

## 4. Design

### 4.1 `PillarScore` gains a `confidence` field

`PillarScore` (currently `{ value, label, trend, hasData }`) gains:

```ts
confidence: number   // 0..1 — how much data backs this score
```

Each `score*` function returns a `confidence` computed from its own data density. A shared helper keeps it consistent:

```ts
// coverage = loggedUnits / expectedUnits, clamped 0..1
// e.g. days-with-data / windowDays, or measurements / expectedForWindow
function dataConfidence(loggedUnits: number, expectedUnits: number): number
```

Confidence is **separate** from `value`. A pillar can be a genuine 9.0 with 0.3 confidence (few logs) — the UI treats that as "9.0, but we're not sure yet."

### 4.2 Per-pillar formula fixes (`lib/analyticsData.ts`)

All scores remain pure functions of their `*Data` input — trivially unit-testable. Proposed weights are starting points to tune against real sample data.

**Sleep** (`scoreSleep`) — fold hours-vs-age-target in as the dominant term:

```
target      = getAgeSleepTarget(ageMonths)          // already exists
hoursScore  = tolerance-band closeness of avgHours to target
              (full credit within a small band below target; ramps down with deficit;
               mild over-target is fine, not penalized to zero)
raw         = hoursScore*0.5 + qualityScore*0.3 + consistencyScore*0.2
confidence  = dataConfidence(daysWithSleep, windowDays)
```

`scoreSleep` must therefore receive `ageMonths` (or the resolved target) — a signature change threaded from `buildScores`.

**Health** (`scoreHealth`) — stop penalizing routine logging. Redefine "concern":

```
vaccineScore  = doneVaccines / totalVaccines * 10     // tracker, unchanged intent
wellnessScore = starts at 10; reduced ONLY by genuine concern signals:
                  - fever-range temperature events
                  - injury / doctor-visit notes (note.eventType)
                routine vitamins / normal-temp / medicine logs are NEUTRAL
raw           = vaccineScore*0.5 + wellnessScore*0.5
confidence    = based on window coverage; a child with only vaccine data and no
                recent logs has moderate confidence, not false precision
```

Logging more never lowers the score. Requires classifying health events (fever threshold, note types) — encapsulated in a helper, not inline.

**Nutrition** (`scoreNutrition`) — small-sample guard across all three modes (milk/mixed/solids). Regress the raw quality/frequency score toward a neutral baseline when few meals/days are logged, so 1 perfect meal ≠ 10.0:

```
rawScore    = (existing per-mode formula)
coverage    = dataConfidence(daysWithData, windowDays)   // also folds in meal count
value       = neutralBaseline + (rawScore - neutralBaseline) * shrink(coverage)
confidence  = coverage
```

`shrink()` pulls sparse samples toward the baseline; full data → `value == rawScore`. The narrative layer additionally suppresses "strength" claims below a confidence threshold (see 4.4).

**Growth** (`scoreGrowth`) — use real WHO percentiles via `lib/growthStandards.ts` (`estimatePercentile`, `resolveSex`):

```
Resolve child sex via resolveSex(child.sex); if isFallback, LOWER confidence and
never present the percentile as definitive (compliance: no silent fallback verdicts).
For the latest weight/height: percentile = estimatePercentile(metric, sex, ageMonths, value)
Score rewards: (a) having recent measurements, and (b) tracking ALONG a curve.
  - A healthy, stable curve at ANY percentile scores well.
  - A large percentile CROSSING between measurements flags attention (lowers score).
  - A single measurement → can show percentile but scores mostly on "has data",
    confidence low (can't assess a trend from one point).
Framing: informational, WHO-sourced. No diagnosis, no "underweight/overweight" verdict.
confidence = based on measurement count + recency + sex-resolution certainty.
```

**Mood / Activity** — formulas unchanged this phase; both gain a `confidence` value for consistency and to feed the confidence-weighted composite.

### 4.3 Composite (`buildScores`) — confidence-weighted overall

Currently the overall re-normalizes pillar weights over `hasData` pillars only. Change: weight each pillar by **`weight × confidence`** so thin-data pillars pull the overall less, and expose an aggregate confidence:

```
effectiveWeight(p) = p.weight * p.score.confidence
overall            = Σ(value * effectiveWeight / Σ effectiveWeight)
overallConfidence  = data-weighted mean of pillar confidences
```

`WellnessScores` gains `overallConfidence: number`.

### 4.4 Hero (`KidsAnalyticsHero`)

- Keep the big serif `/10`, caption, and read-line.
- Add a **confidence tag** in the mono caption row when `overallConfidence` is low, e.g. caption reads `THIS WEEK · LOW DATA` or a small `BASED ON N LOGS` mono chip. Threshold to tune (e.g. `< 0.4`).
- Band word ("on track" etc.) derives from the corrected overall.

### 4.5 Narrative (`buildInsightHighlights`, `KidsAnalytics.tsx`)

- Rebuild all sentences from corrected scores. The existing pillar-specific reasons (sleep deficit line, nutrition %) stay but now read off honest numbers.
- **Suppress confident claims when confidence is low.** Below the threshold, a strength/concern sentence is replaced by a "log a few more days for a clearer read" nudge. No more "Nutrition is a strength — 100% (10.0/10)" off one meal.
- **Add one cross-log line** when a real pattern exists, sourced from the new engine (4.6): e.g. `Grandma noticed: on the 3 shortest-sleep nights, Rio was cranky the next day.` Exactly one, only when the pattern clears its threshold; otherwise omitted.

### 4.6 Cross-log engine — `lib/kidsCrossInsights.ts` (new)

Isolated, pure, testable module that takes the already-fetched `ChildLog[]` (or the assembled `AnalyticsData`) and returns zero or more ranked observations:

```ts
interface CrossInsight {
  kind: 'sleep_mood' | 'food_reaction' | 'night_waking'
  severity: 'watch' | 'note' | 'win'
  line: string          // ready-to-render human sentence
  pillars: PillarKey[]  // for future deep-link into pop-ups
}
export function computeCrossInsights(logs: ChildLog[], ageMonths: number): CrossInsight[]
```

Phase-1 patterns (each date-joined, each with an explicit min-sample threshold so noise never fires):
- **sleep → mood**: short-sleep nights vs next-day cranky/fussy mood.
- **food reaction watch**: `food` logs with `hasReaction` / `reactionFood` clustered → an allergy-watch note (surface only; not medical advice).
- **night-waking**: fragmentation inferred from sleep `startTime`/`endTime` where available.

The main screen consumes only the top-ranked observation (4.5). The full set is retained for the pop-up phase. No new data fetching — reuses the existing `child_logs` query + realtime subscription.

### 4.7 Pillar bands (`KidsPillarBands`)

- Keep worst-first sort and the focus (top) row treatment.
- Thin-data rows (`confidence` below threshold): render a subtle `· low data` marker in the takeaway line and dim the big number, so a sparse score doesn't read as an authoritative verdict.
- Takeaways become data-specific one-liners derived from corrected scores instead of generic tips.

## 5. Data sources (reference)

`child_logs` types feeding each pillar (all `date`-indexed, `value` per-type JSON):
`food`/`feeding` → nutrition · `sleep` (duration, quality, start/end) → sleep · `mood` → mood · `temperature`/`vaccine`/`medicine`/`note` → health · `growth` (weight/height/head strings) → growth · `activity` → activity. Child profile (`children`) provides `birthDate` (→ ageMonths) and `sex` (→ WHO percentile).

## 6. Testing

Scoring is pure functions → TDD is the natural fit. Per `score*` function and for `computeCrossInsights`:
- No-data / single-log → correct `hasData=false` or low `confidence`, no inflated `value`.
- Sleep: large deficit pulls `value` down even with all-"great" quality.
- Health: adding routine logs does **not** lower `value`; fever/injury does.
- Nutrition: 1 good meal → not near 10.0; full week of good meals → high with high confidence.
- Growth: healthy stable curve at low percentile scores well; a big crossing lowers it; `isFallback` sex lowers confidence.
- Composite: a high-value low-confidence pillar contributes little to `overall`.
- Cross-log: patterns fire only above their min-sample thresholds; below → empty.

## 7. Risks / notes

- **Numbers will visibly shift** — Nutrition 10.0↓, Sleep 5.9↓, Health 4.8↑. Intended (honesty), but expect the demo screen to look different immediately.
- **Formula weights are proposals** — tune against real sample data before finalizing thresholds (confidence cutoff, sleep tolerance band, nutrition shrink curve, cross-log min-samples).
- **Growth percentile framing** must stay informational + WHO-sourced with no diagnostic verdict and no silent sex fallback — aligns with the tracker-not-scheduler compliance stance.
- Threading `ageMonths` into `scoreSleep`/`buildScores` is a small signature change; keep the score functions pure (pass the resolved target/age in, don't read globals).

## 8. Out of scope → next spec (pop-ups)

Chart migration onto the shared Diffuse `MiniCharts` vocabulary, retiring the Kids-only `FullScreenChart`, replacing the no-op `ScoreMathCard` with a real "how this works" explanation card (Pregnancy's pattern), `StatRow`/`ChartCard`→shared tiles, and rendering the full `CrossInsight[]` set inside the relevant pillar sheets.
