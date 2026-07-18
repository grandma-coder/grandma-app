# Cycle Insights Redesign — Design

**Date:** 2026-07-18
**Status:** Approved (design), pending implementation plan
**Scope:** Diffuse variant only (the current default; screenshots that prompted this are Diffuse). The cream/current variant path is preserved unchanged.

## Goal

Bring the pre-pregnancy **Cycle analytics** surface up to the visual caliber of the **Pregnancy Insights** surface — "cards, fonts, colors, graphs, everything" — by reusing pregnancy's existing shared design primitives rather than inventing new ones. Also rename the pre-pregnancy tab label from "Analytics" to "Insights" to match pregnancy and kids.

Reference of quality bar: `components/analytics/PregnancyAnalytics.tsx` (Diffuse path).
Screen being redesigned: `components/analytics/CycleAnalytics.tsx` + `components/analytics/CycleDetailSheets.tsx`.

## Approved decisions

- **Structure depth:** Rich but cycle-shaped. Upgrade visuals + add 1–2 cycle-native chart sections. **No PeriodSelector** — cycle data is inherently per-cycle, not per-time-window, so a Week/Month toggle is awkward.
- **Scope boundary:** Redesign the main scrollable surface **and** the tapped-through detail sheets.
- **Color story:** **Keep the per-phase accent.** The whole screen's accent follows the current cycle phase (menstruation=coral, follicular=green, ovulation=pink, luteal=lilac). This is cycle's signature and stays. Individual charts may still use their own metric hue where it aids legibility.
- **Approach:** Reuse pregnancy's shared primitives directly (approach A). The only pregnancy-file change is a lift-and-shift extraction (below), with no visual change to pregnancy.

## Non-goals

- No changes to the `lib/cycleAnalytics.ts` hooks or the numbers they compute. Same data, richer presentation.
- No new chart-engine primitives. Everything comes from `components/analytics/shared/`.
- No PeriodSelector, no custom-range modal on the cycle surface.
- No changes to the cream/current variant rendering (only Diffuse is redesigned; current stays on its existing components incl. `LogSheet`).
- Detail-sheet *data hooks* unchanged; only presentation upgraded.

---

## Section 1 — Shared primitive extraction

Two helpers live inside `PregnancyAnalytics.tsx` today and must move to `components/analytics/shared/` so cycle can reuse them. This also trims that ~3,800-line file.

### 1a. `Section` → `components/analytics/shared/Section.tsx`
- The titled, tappable, chevron'd wrapper: props `{ title: string; subtitle?: string; onPress?: () => void; children: React.ReactNode }`.
- Diffuse/current aware, moved verbatim.
- `PregnancyAnalytics.tsx` deletes its local copy and imports from shared. **No behavior/visual change to pregnancy.**

### 1b. `MoodTrendStrip` → `components/analytics/shared/MoodStrip.tsx`
- The row of mood blobs + day labels.
- **Generalize the prop** so both callers feed it. Pregnancy currently passes `{ log_date, value }`; cycle's mood data is `{ date, mood }`. Normalize to a single shape: `{ date: string; value: string | null }[]`.
  - Pregnancy caller maps `log_date → date`.
  - Cycle caller maps its `MoodId` → the string the blob mapper expects (`moodExpression` / `moodBlobFill` in `lib/moodFace.ts`).
- Export the component as `MoodStrip` from the new file; update the single pregnancy call site to import + use `MoodStrip` (rename the JSX usage from `MoodTrendStrip`). No alias/re-export left behind.

### Interface contract
- **What it does:** presentational wrappers, no data fetching, no business logic.
- **Depends on:** theme tokens, `useIsDiffuse`, `Character` (for `MoodStrip`), `lib/moodFace`. Nothing cycle- or pregnancy-specific.
- **Consumers:** `PregnancyAnalytics`, `CycleAnalytics`.

---

## Section 2 — Cycle Insights surface (`CycleAnalytics.tsx`)

Top-to-bottom order and per-block change. Everything below describes the **Diffuse** render path; the current path keeps its existing blocks.

### 2.1 Hero — keep, minor polish
`YOUR CYCLE TODAY` kicker · phase word (e.g. **Luteal**) + phase glyph · italic day-line. On-system already. Only spacing tuning to match pregnancy's title rhythm. Phase accent unchanged.

### 2.2 Hero trend chart — upgrade (biggest lift)
- Replace the hand-rolled `CycleLengthTrend` SVG bead line with a titled card wrapping **`GlowAreaLine`** (from `shared/MiniCharts.tsx`), same component pregnancy's weight hero uses.
- Card header: kicker `CYCLE LENGTH` + right-aligned `{avg}D AVG` read (reuse existing copy keys).
- Data: the last N closed cycle lengths (same slice logic as today, `slice(-8)`/`-12`).
- Tint: **per-phase accent**.
- `onPress` → `cycleLength` detail sheet (unchanged).
- Empty state (<2 closed cycles): keep the existing "Log a few periods…" message.

### 2.3 Stat grid — restyle, same data & signals
- Keep every signal: length, regularity, fertile, BBT, cervical mucus, PMS, mood, + intercourse (TTC-only).
- Under Diffuse, render each tile as **`DiffuseStatCard`** (pregnancy's tile) instead of the bespoke `GridTile`.
- Keep the flexible wrapping grid (7–8 tiles) — do not force a rigid 2×2. `DiffuseStatCard` accepts a `style` override; pass a half-width style (`{ width: '47%', flexGrow: 1 }`, mirroring the current `GridTile`) so tiles wrap two-per-row and the odd last tile grows. (Confirmed: `DiffuseStatCard` exposes both `flex` and `style` props.)
- Character-blob icons stay (they're the Diffuse icon system, per design rules).
- Per-phase accent on tiles.
- Each tile keeps its current `onPress` → matching detail sheet.
- `GridTile` (current-variant tile) is retained for the non-Diffuse path.

### 2.4 NEW titled chart sections (cycle-native)
Inserted between grid and recent cycles, using the extracted `Section` wrapper. Each **self-gates on data** (hidden when empty, mirroring pregnancy's empty-section behavior):

- **`This Cycle's Rhythm`** — **`BeadedThread`** of the current cycle's BBT readings. Shown only when ≥2 BBT logs exist for the cycle. `onPress` → `bbt` sheet. Tint: phase accent.
- **`Mood This Cycle`** — the extracted **`MoodStrip`** of recent mood logs. Shown only when mood logs exist. `onPress` → `mood` sheet.

### 2.5 Recent cycles — keep, light polish
`RecentCyclesCard` (current-cycle pill + C-N rows) is already strong. Align spacing/typography to the new sections; otherwise unchanged.

### Resulting cadence
hero → glow chart → tile board → up to two rhythm sections → recent cycles — the same rhythm as Pregnancy Insights, in cycle's own shape and phase color.

---

## Section 3 — Detail sheets (`CycleDetailSheets.tsx`)

All eight bodies currently render inside `LogSheet` (`maxHeight: 540`) with `MiniBarChart`/`MiniLineChart` + plain `StatChip` rows.

### 3.1 Sheet shell
- In Diffuse, `CycleDetailSheet` uses **`DiffuseSheet`** (taller, purpose-built modal with an eyebrow `chip`, handle, close). In the current variant it keeps `LogSheet` — no regression there.
- Each type supplies a short eyebrow chip (e.g. cycleLength → `RHYTHM`, bbt → `THERMAL`), analogous to pregnancy's `meta.blurb.toUpperCase()`.

### 3.2 Charts inside bodies
Upgrade only the two chart-bearing bodies, for continuity with the surface:
- **cycleLength** body: `MiniBarChart` → **`GlowAreaLine`** (matches the new hero).
- **bbt** body: `MiniLineChart` → **`BeadedThread`** (matches the new "This Cycle's Rhythm" section).
- The other six (regularity, pms, fertile, mood, mucus, intercourse) keep their list/bar/distribution layouts — they're already list-shaped.

### 3.3 Metric tiles
Under Diffuse, restyle the `StatChip` rows to match pregnancy's `DiffuseMetricTile` look (the current-variant `StatChip` styling is retained for the cream path).

### 3.4 Per-phase accent threading
Bodies currently hardcode `getDiffuseAccent('pre-pregnancy', …)`. Pass the **live phase accent** down from the surface into the sheet so a luteal day reads lilac end-to-end (chart lines, bars, dots). The surface computes the accent once and provides it to `CycleDetailSheet`.

### 3.5 Unchanged
Loading / empty / error states already work — untouched.

---

## Section 4 — Tab rename

- `lib/modeConfig.ts` line 51: `PRE_PREGNANCY_CONFIG.tabs.vault.label` change `'Analytics'` → `'Insights'`.
- Pregnancy and kids already say `'Insights'`; this only aligns pre-pregnancy.
- One-word change, no other wiring.

---

## Files touched

| File | Change |
|---|---|
| `components/analytics/shared/Section.tsx` | **New** — extracted from PregnancyAnalytics |
| `components/analytics/shared/MoodStrip.tsx` | **New** — extracted + generalized from PregnancyAnalytics |
| `components/analytics/PregnancyAnalytics.tsx` | Remove local `Section` + `MoodTrendStrip`, import from shared (no visual change) |
| `components/analytics/CycleAnalytics.tsx` | Hero chart → GlowAreaLine; grid → DiffuseStatCard; add two Sections; pass phase accent to sheet |
| `components/analytics/CycleDetailSheets.tsx` | Diffuse → DiffuseSheet shell; cycleLength/bbt chart upgrades; accent threading; StatChip → DiffuseMetricTile look |
| `lib/modeConfig.ts` | Rename Analytics → Insights (line 51) |

## Risks / watch-items

- **i18n:** any new visible strings (section titles "This Cycle's Rhythm", "Mood This Cycle", sheet chips) must go through `t()` with keys added to the i18n catalog — no hardcoded user-facing text. Keys added English-first (translation waves fill later).
- **MoodStrip prop generalization:** must not break the pregnancy call site — verify pregnancy's mood trend still renders after extraction.
- **Empty states:** new sections must hide cleanly for a no-data user (no empty cards).
- **Design tokens:** all colors/radii/fonts/shadows from `constants/theme.ts` (Diffuse via `useDiffuseTheme`); no raw hex except allowed sticker/SVG assets.
- **Verification:** must be visually confirmed in the simulator in pre-pregnancy/Cycle mode (light + dark) before commit — the prior session was blocked on mode-switching in the sim; resolve that first.

## Success criteria

1. Cycle Insights (Diffuse) reads as the same design family as Pregnancy Insights: glow hero chart, DiffuseStatCard grid, titled Sections, rich DiffuseSheet detail modals.
2. Per-phase accent visibly threads through surface + sheets.
3. Pre-pregnancy tab reads "Insights".
4. No regression to the cream/current variant, to pregnancy, or to the underlying cycle data.
5. `npm run typecheck` clean (modulo the known pre-existing `KidsHome.tsx` `resolveSex` error).
