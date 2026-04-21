# Cycle Home Redesign + Analytics Empty-State Fix Design

**Date:** 2026-04-20
**Mode:** Pre-Pregnancy
**Status:** Approved

## Problems

1. `components/home/CycleHome.tsx` uses the old dark-neon layout with lucide icons and mock data. The cream-paper redesign reference shows a 4-section layout (hero cycle card → hormones+wisdom row → fertile window strip → pillars grid) that does not exist.
2. `CycleAnalytics.tsx` empty state renders poorly: "CYCLE LENGTH (LAST 0)" label, overflowing "—" hero value, and the blob decoration visibly bleeds past the card.
3. No way to generate realistic test data — manual logging 6 cycles worth is impractical for QA.

## Goals

- CycleHome matches the reference mock: hero ring card, hormones+wisdom 2-col, 7-day fertile strip, 2×2 pillars grid.
- All home-screen data comes from real Supabase queries via `lib/cycleAnalytics.ts`.
- Fresh user with zero logs sees a sensible empty state on both home and analytics.
- One-tap dev seed that populates ~6 cycles of data for the current user.

## Architecture

### New components

- `components/home/cycle/YourCycleCard.tsx` — hero card with SVG half-ring + phase label + blob sticker
- `components/home/cycle/HormonesCard.tsx` — dark card with SVG multi-line hormone chart + legend
- `components/home/cycle/WisdomCard.tsx` — yellow card with Heart sticker + "Today's wisdom" + phase-aware quote
- `components/home/cycle/FertileWindowStrip.tsx` — 7-day M-S pill row with today-ring + peak-day fill
- `components/home/cycle/CyclePillarsGrid.tsx` — 2×2 grid of 4 pre-preg pillars, tappable → `/pillar/[id]`

### Modified files

- `components/home/CycleHome.tsx` — full rewrite using the 5 new components + real hooks
- `components/analytics/CycleAnalytics.tsx` — label conditional + pass `hideValue` to BigChartCard when empty
- `components/analytics/shared/BigChartCard.tsx` — add optional `hideValue?: boolean` prop
- `app/profile/settings.tsx` — add a dev-only seed button gated by `__DEV__`

### New

- `lib/devSeed.ts` — `seedCycleData()` helper: deletes user's `cycle_logs`, then inserts ~6 cycles of realistic data

## Data sources

- `useCycleHistory()` — cycle day, length, next period date (from `lib/cycleAnalytics.ts`)
- `useFertileWindow()` — fertile window start/end for the 7-day strip
- `getCycleInfo(...)` from `lib/cycleLogic.ts` — derives phase, fertile flag, conception probability from the latest period_start
- Hormones data: computed client-side from cycle day using idealized curves (no hormone tracking table exists; this is a visualization, not tracked data)
- Wisdom quotes: static array in `WisdomCard`, keyed by phase

## Pillars selection

The mock shows 4 tiles: Nutrition / Hormones / Sleep / Mental. The existing `prePregPillars` has 6 ids: `fertility`, `nutrition-prep`, `emotional-readiness`, `financial-planning`, `partner-journey`, `health-checkups`.

Best fit for the mock:
- **Nutrition** → `nutrition-prep` (Leaf sticker, green tint)
- **Hormones** → `fertility` (Flower sticker, pink tint) — "Fertility Basics" covers hormones
- **Sleep** → `health-checkups` (Moon sticker, blue tint) — repurposed visually since there's no sleep pillar for pre-preg
- **Mental** → `emotional-readiness` (Heart sticker, peach tint)

Each card: sticker top-left (48px paper chip), card name (Display 18), subtitle (MonoCaps micro-label), tappable → `router.push('/pillar/[id]')`.

## Empty-state behavior

- `CycleAnalytics` with no `period_start` logs:
  - BigChartCard: label="CYCLE LENGTH" (no "(LAST N)"), `hideValue={true}`, chart shows MiniBarChart's own empty state
  - MiniStatTiles: value "—" (already works)
- CycleHome with no `period_start` logs:
  - YourCycleCard: DAY 0, "Start tracking" label, empty-shell ring
  - FertileWindowStrip: all cells dim, "Log your period to predict" footer line
  - Hormones/Wisdom/Pillars: render normally (don't depend on cycle data)

## Dev seed

`seedCycleData()`:
1. Get current session, bail if no user
2. `DELETE from cycle_logs where user_id = current`
3. Insert 6 cycles (last period start = today − 10 days, each cycle ~28d ± 1), including:
   - 6 `period_start` entries
   - 5 `period_end` entries (5 days after each start, except current open cycle)
   - ~40 `basal_temp` entries (realistic BBT curve, 36.3–36.9)
   - ~20 `symptom` entries in late-luteal days with random picks from SYMPTOMS
   - ~30 `mood` entries spread across the 6 months
   - ~6 `intercourse` entries in the fertile windows
4. Invalidate `['cycleLogs']` via global queryClient

Button lives in `app/profile/settings.tsx` at the bottom, only visible when `__DEV__`. Tap → Alert confirms → runs seed → Alert on success. Label: "Seed cycle data (dev)".

## Acceptance

1. Open pre-preg Home → matches mock: hero YOUR CYCLE card, hormones+wisdom row, fertile strip, pillars grid.
2. Tap a pillar card → pillar detail route opens with that id.
3. Open Analytics with no data → label shows "CYCLE LENGTH" without "(LAST 0)", no overflowing "—".
4. Tap the dev seed button → within 2s, both Home and Analytics reflect 6 cycles of data.
5. No new TypeScript errors.

## Out of scope

- Hormone tracking backend (curves stay client-computed)
- Search/notification icons wiring (already rendered by existing header)
- Wisdom quote rotation over time — static per phase is enough
- Sleep/Mental pillar content — we reuse existing pillars with different visual skins
