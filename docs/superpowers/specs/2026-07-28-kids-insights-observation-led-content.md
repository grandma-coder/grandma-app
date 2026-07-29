# Kids Insights — Observation-Led Content Map (all six pillars)

**Date:** 2026-07-28
**Status:** Design — awaiting approval before build
**Supersedes the pop-up content model.** Builds on the shipped scoring rework (honest per-pillar scores + confidence + `lib/kidsCrossInsights.ts`). This spec defines **what each pillar sheet should SAY** — not its charts or styling.

---

## 1. The problem this fixes

The pillar pop-ups currently **echo the logs back** — "Temperature · Jul 8 / Vitamin D · Jul 10", "0% eaten well, 6.3 meals/day", "active 36 of 365 days". That's a diary, not an insight. A parent learns nothing about how their child is actually doing. Mood reads "right" only because it's closest to a real read; the rest expose raw aggregates.

## 2. The principle — observation-led

Every pillar sheet leads with **the answer to "how is my child doing on X, and what should I know?"** — one plain-language pattern/trend — then a little supporting evidence, and the **raw log is demoted behind a "show all" tap.**

```
[ LEAD INSIGHT ]      one honest sentence: the pattern/trend that matters
[ 1–2 SUPPORTING ]    what backs it, incl. cross-log ties ("fever weeks = worse sleep")
[ one visual ]        a single supporting chart, not a wall of them
[ show all ▸ ]        the raw log dump, collapsed
```

The numeric score (where it still exists) becomes a small header chip, never the point. **Health has no score at all** (decided: reference, not graded).

## 3. Data we can build on (from the log inventory)

`child_logs` carry, per type: sleep `{duration, quality, startTime, endTime}`; food `{quality, isNewFood/newFoodName, hasReaction/reactionFood, matchedFoods, time}`; feeding `{feedType, amount(ml), duration, side, time}`; mood id; diaper `{type, color, consistency, time}`; activity `{activityType, duration, startTime}`; temperature (numeric °C), medicine (name), vaccine (name), note `{eventType: Doctor visit|Injury|Other, description}`; growth (weight/height/head). Plus `children.birthDate/sex`. Everything is date-stamped, enabling frequency, clustering, recency, time-of-day, and cross-log date-joins.

**Readiness key:** ✅ data already available · 🔶 needs light data-layer work · ❌ not feasible now (say so in UI, don't fake it).

---

## 4. Per-pillar content map

### HEALTH — reference, no /10 (reassurance + illness pattern)

The whole point: surface **whether the child is well and any real pattern**, not the care diary.

- **Lead insight**
  - Well case: *"Rio's been well — no fever, injury, or doctor visit in the last 6 weeks."* ✅ (concern events = fever ≥38°C temps + injury/doctor notes; compute weeks-since-last)
  - Concern case: *"3 fever days in the last month — about one every 2 weeks."* ✅ (count + spacing of fever-range temps)
- **Supporting**
  - Recovery: *"Rio's last fever (Jul 8) settled within ~2 days."* 🔶 (infer from consecutive-day elevated temps around an episode)
  - Cross-log: *"Fever days fell in the week Rio slept worst."* 🔶 (join concern dates to sleep/mood — extend `kidsCrossInsights`)
  - Vaccines: *"6 vaccines on record."* ✅ (count of logged vaccine entries — reassurance reference, **not** a completion % or schedule; compliance)
  - Meds: surface only an **active/recent course** worth noting, else omit. ✅
- **Demoted:** the full care log (all temps, vitamins, saline) behind "show all care log ▸".
- **Removed:** the /10 score, "completion %", the all-logs "events this week", red-coloring of routine temps (slice 1 already de-alarmed).
- **Data-layer need (🔶):** `buildHealthData` must expose a **concern timeline** — the dated fever/injury/doctor events with enough to compute frequency + recovery — not just a `concernEvents` count.

### SLEEP — /10 (hours-vs-target), lead with the gap + its cost

- **Lead:** *"Rio's averaging 5.5h — about 6.5h under the 12h target for their age, and it's held steady this month."* ✅ (avg vs `getAgeSleepTarget`, deficit, half-window trend)
- **Supporting**
  - Cross-log (already built): *"On the shortest-sleep nights, the next day ran crankier."* ✅
  - Bedtime consistency: *"Bedtime swings between 7pm and 10pm."* 🔶 (spread of `startTime`)
  - Night-waking / fragmentation: *"~2 wake-ups a night this week."* 🔶 (gaps within `startTime`/`endTime` — the deferred `night_waking` pattern)
- **Demoted:** daily-hours bars + quality breakdown.

### NUTRITION — /10 (small-sample guarded), lead with variety + reactions

- **Lead** (solids): *"Rio mostly eats the same few foods — cheese, banana, oats. 1 new food tried this month."* ✅ (`topFoods`, `isNewFood`/`newFoodName` counts over window)
  - Milk phase: *"Feeding 6×/day on average — steady."* ✅
- **Supporting**
  - Reaction watch: *"A possible reaction to strawberry was logged twice — worth watching."* ✅ (`hasReaction`/`reactionFood` clustering)
  - Appetite trend over **rated** meals only (fixes the false "0% eaten well"): *"Eating well at 78% of rated meals, up from last week."* ✅
- **Demoted:** meal-quality rows, meals/day chart.

### MOOD — /10 (your benchmark), add the "why"

- **Lead:** *"Rio's mostly calm and happy (70%), with fussy spells clustering on short-sleep days."* ✅ (dominant moods % + the sleep→mood tie)
- **Supporting:** trend vs prior window (*"a bit fussier than last week"*) ✅; the mood bubble cluster stays (it's the liked visual).
- **Demoted:** daily mood tracking.

### GROWTH — informational (WHO curve), lead with the trajectory

- **Lead:** *"Rio's tracking around the 55th percentile for weight, on a steady curve."* ✅ (`estimatePercentile` at each measurement's age — already curve-aware)
  - Sparse case: *"Only 1 measurement — log another to see a growth curve."* ✅
- **Supporting:** crossing flag (*"weight dipped across two percentile bands — worth mentioning at the next visit"*, informational, no verdict) ✅; height alongside weight.
- **Demoted:** weight/height charts.

### ACTIVITY — /10, lead with what kind + how much (honest about sparse logs)

- **Lead:** *"Rio's active most days, mostly playground and swimming."* ✅ (active-day rate + top `activityType`s over the **selected window**, not "/7")
  - Sparse case (the common one): *"Not enough activity logs yet to see a pattern."* ✅ (don't score a harsh 1.9 off near-nothing — lean on confidence)
- **Supporting:** variety of types; vs age guide (kept as reference, de-emphasized).
- **Demoted:** sessions chart + full age-guide split.

---

## 5. Cross-cutting (fold in, since we're here)

- **Window/period honesty:** every insight names its real window ("this week" / "last 30 days"), never a hardcoded "/7" or "this week" when the period is longer. Default the period to **week**. ✅
- **Confidence surfaced:** thin-data pillars say so in the lead ("still early — a few more logs sharpen this"), consistent with the main-screen LOW-DATA tag. ✅
- **Remove the dead `ScoreMathCard`** (8 latent old-formula call sites). ✅

## 6. Where the insights live (architecture)

A new pure module **`lib/kidsPillarInsights.ts`** — one `build<Pillar>Insight(analytics, ageMonths, ...)` per pillar returning `{ lead: string, supporting: string[], demotedAvailable: boolean }` — mirroring `kidsCrossInsights.ts` (pure, unit-testable, no RN). The cross-log ties reuse/extend `kidsCrossInsights`. The pop-up components render these instead of composing copy inline. Health also needs the `buildHealthData` concern-timeline enrichment (🔶).

## 7. Explicitly NOT in this spec

- The visual/chart redesign (migrate to shared `MiniCharts`, retire `FullScreenChart`) — separate, later.
- Any new clinical logic (vaccine scheduling, growth verdicts) — compliance forbids.
- Insights needing data we don't collect (e.g. "fevers after daycare" — we don't reliably have daycare context) — omitted, not faked.

## 8. Readiness summary (what building this needs)

| Pillar | Ships on current data | Needs light data work |
|---|---|---|
| Health | wellness status, vaccine count, med note | 🔶 concern **timeline** in `buildHealthData`; 🔶 recovery inference; 🔶 fever↔sleep join |
| Sleep | gap+trend, sleep→mood | 🔶 bedtime spread + night-waking from start/end |
| Nutrition | variety, new foods, reactions, rated-meal % | — |
| Mood | dominant %+trend, sleep tie | — |
| Growth | percentile + curve + crossing | — |
| Activity | active-day rate, types, sparse-state | — |

The 🔶 items are small, isolated additions to the analytics/insight layer — none require new logging or schema.
