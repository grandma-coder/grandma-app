# Daily-rotating, cycle-phase-aware content — design

**Date:** 2026-05-30
**Mode scope:** Pre-pregnancy only (cycle phase is a pre-preg concept)
**Surfaces:** Today's Nudge card (`DailyNudgeCard`) + Pillar "For you right now" (`app/pillar/[id].tsx` via `usePillarTipBuckets`)

## Problem

Both the home-screen "Today's Nudge" card and the pillar "For you right now" section are
phase-aware but **static within a phase**. On luteal day 18, 19, 20, 21 a daily user sees the
identical nudge ("PMS is hormonal, not personal") and the identical "For you" tips. The content
is phase-correct but feels frozen for the ~14 days a phase lasts.

**Goal:** content should change day-to-day *within* a phase, not only when the phase changes —
keyed to the user's **cycle day**, so the same cycle day next month shows the same item (coherent
with the cycle-tracking story).

## Decisions (from brainstorm)

- **Scope:** both surfaces (nudge + pillar). Pre-pregnancy only.
- **Rotation key:** cycle day. Deterministic — same cycle day → same content (no flicker on reopen).
- **Content supply:** expand the banks (more phase-tagged tips per pillar, more nudge templates
  per phase) so rotation feels genuinely fresh, then rotate over them.
- **Voice/design:** follow existing house style — nudge headline = one italic phrase wrapped in
  `*…*` (Fraunces serif + Instrument Serif italic accent), body = physiological "why" + one
  actionable nudge; pillar tips = `{ label, text, phases }` in Grandma's affectionate register
  (`dear`/`love`). All visuals via tokens (`stickers.coral`, `font.*`, `PaperCard`, `Heart`).
  No new hex. Per `DESIGN_SYSTEM.md`.

## Architecture

### 1. Rotation engine — `lib/cyclePhaseRotation.ts` (new, pure)

```ts
// Deterministic pick from a per-phase pool, keyed to cycle day.
// Same cycleDay → same item. No Math.random() / Date.now() (harness-safe, testable).
export function pickForCycleDay<T>(pool: T[], cycleDay: number): T | undefined
// pool.length === 0 → undefined (caller falls back)
// index = ((cycleDay - 1) % pool.length + pool.length) % pool.length   (1-based cycleDay, guards negatives)

// Pick a deterministic SLICE (for the pillar "For you" section).
export function sliceForCycleDay<T>(pool: T[], cycleDay: number, count: number): T[]
```

Both consumers filter their content to the current phase, then call the engine.

### 2. Nudge consumer — `lib/cycleNudges.ts` + `DailyNudgeCard`

- Predicates still gate **eligibility** (phase + log conditions).
- Log-driven templates (`late`, `ovulation-confirmed`, `luteal-pms`) remain **priority overrides** —
  if a relevant signal is logged today, it wins regardless of cycle day.
- When multiple *general phase* templates are eligible and no override fires, `pickForCycleDay`
  selects among them by cycle day → daily rotation within the phase.
- `pickCycleNudge(ctx)` signature gains `cycleDay` (already present on `NudgeContext`).
- **Bank expansion:** each phase's general pool grows to ~4–6 templates
  (luteal 2→~5, follicular/ovulation/menstruation filled to ~4–5). New `cycle_nudge_*` keys in
  `lib/i18n/en.ts` (other locales fall back to en until translated — consistent with current i18n wave plan).

### 3. Pillar consumer — `lib/pillarAdaptive.ts` + `app/pillar/[id].tsx`

- `usePillarTipBuckets` unchanged in shape, but `forYou` becomes a **daily slice** of the
  phase-matching pool via `sliceForCycleDay(pool, cycleDay, 1–2)` instead of the full set.
- Remaining tips stay under "All tips" (full library always browsable — nothing hidden).
- `contextLabel` ("Luteal phase · day 20") untouched.
- **Bank expansion:** `phases`-tagged tips across the 6 pre-preg pillars grow to ~4+ per phase
  where the pillar has phase-relevant guidance, on-voice.

## Edge cases

- **No cycle history** → no phase context → nudge uses phase fallback; pillar "For you" hides.
  (Current behavior preserved.)
- **Hydration:** cycle config comes from `useCycleHistory` (React Query, not a persisted store),
  so existing loading handling covers it — no week-1→week-40-style flash risk.
- **Phase boundary:** pool switches on the flip day — correct; content *should* change there.
- **Pool < phase length:** luteal ~14 days, pool ~5 → rotation repeats every ~5 days within the
  phase. Acceptable, far better than static. Documented, not silently truncated.
- **Empty pool:** engine returns `undefined`/`[]`; callers fall back to prior behavior.

## Testing

Pure-function tests (engine is the testable core):
- `pickForCycleDay`: determinism, advancement (pool>1), wraparound, single-item, empty.
- `sliceForCycleDay`: count respected, stable per day, advances across days, no out-of-bounds.
- `pickCycleNudge`: log override beats rotation; two cycle days in same phase (no override) differ.

## Out of scope

- Pregnancy / kids pillars and any week/age-keyed rotation.
- Translating new copy into the 11 non-English locales (follows the existing i18n wave plan).
- Server-side / personalized ML content selection — this is deterministic template rotation only.
