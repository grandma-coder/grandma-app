# Vault / Kids Analytics — editorial dashboard rethink

**Date:** 2026-07-10
**Scope:** The Diffuse render of the Kids Analytics ("Vault") screen only. Current-system (non-Diffuse) path is untouched.

## Why

The current Diffuse Analytics screen dumps a score wheel + a flat pillar list (or the abandoned collage) and asks the parent to decode it. It isn't intuitive. Reworking it into an **editorial health dashboard** (per the "Max / Lifecare" reference) makes it read as one story: a hero score, a plain-language read of how the child is doing, then the pillars sorted so *what needs attention* is on top, each with a human takeaway, plus a trend.

## Decisions (locked)

- **Story lead:** Overall hero — big overall score + caption, then pillars **sorted lowest-score-first** (needs-attention on top; the top row is the visual "focus", larger).
- **Row detail:** Keep a **human takeaway line** under each pillar name (from the existing `getHealthTips` → `tipByPillar`).
- **Icons:** `LineIcons` (single-stroke), not the colorful stickers.
- **Diffuse only.** The collage (`KidsPillarCollage`), the old score wheel (`DiffuseCircularMetric`) and the flat `DiffuseListRow` list are **retired from the Diffuse path**. Non-Diffuse path unchanged.

## Screen structure (top → bottom, Diffuse path)

1. **Top bar** — child name (serif) + existing period chips (7d/30d/3mo/1yr/custom) + child selector (unchanged).
2. **Hero stat** (`KidsAnalyticsHero`) — big serif overall score (e.g. `5.6`), mono caption (`THIS WEEK · DEVELOPING`), one serif read line ("Bahia is **developing**."). Replaces the score wheel.
3. **Grandma one-liner** — the existing `buildInsightHighlights(...).message` as a quiet quote (hairline left rule). The full Grandma card + "Let's discuss" tap stays lower (compact card, already built).
4. **Pillar bands** (`KidsPillarBands`) — the 6 pillars as color-banded rows, **sorted by score ascending, no-data last**. Each row: `LineIcon` + pillar name (serif) + takeaway line (sans, from `tipMap[key].body`, ~1 line) + big bold number (sans 800). Top row = "focus" (larger number/padding). Row press → existing `setSelectedPillar(key)` detail modal. Band bg = pillar `*Soft` tint; text ink-on-tint.
5. **Trend strip** — a sparkline of the standout pillar (or overall) + a callout pill (e.g. `+233%`). Reuses existing chart data; if unavailable, omit gracefully.
6. **Below:** existing RoutineCompliance / growth sections unchanged.

## Components (new, presentational, Diffuse-only)

- `components/analytics/KidsAnalyticsHero.tsx` — props: `overall: number`, `hasData: boolean`, `caption: string`, `childName: string`. Renders hero stat + read line.
- `components/analytics/KidsPillarBands.tsx` — props: `items: { key, label, color, softColor, score, takeaway }[]`, `onPillarPress(key)`. Sorts lowest-first internally, no-data last. Renders the color-banded rows with `LineIcons`.

Both take plain data; no store/theme coupling beyond `useDiffuseTheme()`.

## Wiring in `KidsAnalytics.tsx` (diffuse branch)

- Replace `KidsWellnessRingCard` (diffuse render) → `KidsAnalyticsHero` + the Grandma one-liner.
- Replace the `KidsPillarCollage` block → `KidsPillarBands`, fed `PILLAR_ORDER` mapped to `{ label, color, softColor(from stickers*Soft), score: scores[key], takeaway: tipMap[key]?.body }`.
- Keep the compact `GrandmaInsightCard` (with "Let's discuss") below the bands, and RoutineCompliance.
- Icon map: nutrition→WaterDropIcon, sleep→SleepIcon, mood→HandHeartIcon, health→StethoscopeIcon, growth→WeightIcon, activity→FootprintIcon.

## Non-goals

- No change to data/scoring, tap targets, detail modals, or the non-Diffuse path.
- `KidsPillarCollage.tsx` is left in the tree but unused by the Diffuse path (can be deleted in a follow-up).

## Verification

- `npx tsc --noEmit` clean on touched files.
- Reload sim → Kids → Analytics (Diffuse): hero reads, bands sorted lowest-first with takeaways, taps open detail, dark theme legible.
