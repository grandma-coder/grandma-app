# Pregnancy Home — Compact & Calm Redesign

**Date:** 2026-06-26
**Status:** Approved, ready for planning
**Scope:** `components/home/PregnancyHome.tsx` and its child sections only. Pre-pregnancy and Kids homes are out of scope.

## Problem

The pregnancy home stacks 8 full-width sections, several heavy with decorative stickers and animated VFX. Two of them (`QuickLogStrip` horizontal chips + `TodaySummaryCard` glance row) display the same daily logs twice with two separate sticker sets. The result reads as cluttered and unnecessarily long. The user wants it more compact and calm: fewer stickers, no duplicate tracker, shorter scroll.

## Goals

- One source of truth for today's logging (no duplicated chip strip + glance card).
- One sticker per concept, not two.
- Roughly 40% shorter page.
- Calmer affirmation card (kill the ambient VFX) while keeping its daily-reveal mechanic.
- Secondary cards become slim rows.

Non-goals: changing the hero carousel, changing any log-form behavior, touching Kids/Pre-preg homes, changing analytics/detail screens.

## Design

Section order after the change (top → bottom):

1. **Greeting** — unchanged.
2. **Hero carousel** — unchanged. The one place a large sticker earns its space.
3. **Daily Affirmation (slim)** — see below.
4. **Today tracker (merged)** — see below. Replaces both `QuickLogStrip` and the old `TodaySummaryCard` layout.
5. **Reminders** — unchanged (`RemindersSection` + `PregnancyUserReminders`).
6. **Weight row (slim)** — see below.
7. **Birth Guide row (slim)** — see below.
8. **Ask Grandma row (slim)** — see below.

### 3. Daily Affirmation — calm version

`AffirmationRevealCard.tsx`. Keep: the daily-reveal interaction, the per-day color variant, the reveal/share buttons, the Supabase-backed affirmation text, and the "already revealed today" persistence.

Remove the ambient VFX:
- Shimmer sweep (`shimmer` loop + gradient).
- Halo pulse behind the heart (`haloPulse` loop + `heartHalo`).
- Floating-star animation and the decorative `starTopRight` star.
- Star float loop (`starFloat`).
- Burst particles on reveal (`Particle` component, `showParticles`, particle state) — keep a simple opacity/scale text reveal, drop the particle explosion.

Shrink:
- Heart sticker 110 → ~44, static (no float).
- `card.minHeight` 160 → ~96; reduce `padding` 22 → 16.
- Keep one small static heart in the corner; drop the large halo entirely.

The reveal still animates text in (opacity + slight scale) so the interaction still feels alive — just without the particle/shimmer/halo layers.

### 4. Today tracker — merged card

Delete `QuickLogStrip` from `PregnancyHome.tsx` entirely. Fold its logging behavior into `TodaySummaryCard`, which becomes the single tracker.

New `TodaySummaryCard` behavior:
- Header: "Today" title + subtle hint line + chevron. Tapping the **header/chevron** still opens `TodayDashboardModal` (the full daily dashboard).
- Metric pills row: mood / water / sleep / meals / weight, plus kicks when `weekNumber >= 28`. One sticker per pill (re-use the existing per-metric stickers already in the card).
- **Each pill is tappable** and opens that metric's log sheet directly via a new `onLogMetric(type)` callback passed from `PregnancyHome`. This is the logging path that used to live in the chip strip.
- Logged pills tint green (re-use `stickers.greenSoft` / green border, matching the old chip's done-state); unlogged pills stay neutral and show a `+` affordance so it's clear they're tappable.
- Keep the thin completion progress bar.

`PregnancyHome.tsx` wiring:
- Remove `ROUTINES`, `QuickLogStrip`, and the `<QuickLogStrip .../>` render.
- Pass `onLogMetric={(type) => setActiveLog(type as InlineLogType)}` to `TodaySummaryCard`. The existing `activeLog` / `LogSheet` / `renderInlineForm` plumbing is reused unchanged.
- The pill→log mapping must cover the same types the chips covered (mood, water, sleep, nutrition/meals, weight, exercise, kick_count). Pills shown are the tracker metrics; tapping maps pill key → `InlineLogType`.

Note: the chip strip also exposed `vitamins`, `symptom`, `exercise`, and `kegel` as quick-log entries that are not all shown as tracker pills. These remain reachable from the Reminders habit nudges and the calendar; the home tracker surfaces the 5–6 core metrics only. This is an intentional reduction (fewer stickers), consistent with "compact."

### 6/7/8. Slim secondary rows

Convert these three cards into slim single-line rows: small icon (left) + title + optional trailing value + chevron. Target height ~56px, hairline border (`colors.border`), `colors.surface` background, `radius.md`, no heavy drop shadow.

- **Weight row** — replaces `WeightTrendCard` on the home. Shows label + current weight value (e.g. "75.0 kg") as the trailing value. Tapping navigates to the same destination the card's "Details" used (weight detail / analytics). The full chart is removed from the home but unchanged in detail/analytics.
- **Birth Guide row** — replaces the black-outlined `PaperCard`. Drops the heavy 1.5px ink outline and drop shadow; becomes a hairline slim row. Tapping still opens `BirthGuideModal`.
- **Ask Grandma row** — replaces `GrandmaCTA`'s tall card. Slim row with a small grandma logo, title, chevron. Tapping still `router.push('/grandma-talk')`.

A shared local `SlimRow` component (icon, title, trailing, onPress) keeps these three consistent and small. Defined in `PregnancyHome.tsx` (or co-located) — one clear purpose, easy to read.

## Design-system compliance

- All colors/radii/fonts/shadows from `constants/theme.ts` (`useTheme()`, `radius`, `font`, `shadows.card/subtle`). No raw hex in JSX except inside the affirmation variant palette, which is already documented as illustration data (DESIGN_SYSTEM.md §0).
- Slim rows use `radius.md`, hairline `colors.border`, `shadows.subtle` at most.
- Pills re-use existing sticker components; no new sticker assets.

## Testing / verification

- Visual: home is visibly shorter; no duplicated tracker; affirmation card is calm and short.
- Functional: tapping each tracker pill opens the correct log sheet; logged pills tint green and reflect `todayLogs`; header chevron still opens the dashboard modal; kicks pill appears only ≥ week 28.
- Affirmation: reveal still works once/day and persists; share still works; no VFX remain.
- Slim rows: each navigates/opens its existing destination.
- No regressions in hero, reminders, or the pregnancy log-save flow.
- Run the existing test suite; add no new heavy tests (UI-only change). Type-check passes (strict).

## Out of scope / follow-ups

- Kids and Pre-pregnancy homes (could get the same treatment later).
- Any change to log forms, dashboard modal internals, or analytics.
