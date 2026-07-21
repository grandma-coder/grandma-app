# Quick-log picker — fit everything + pin SAVE + fix cycle icon collisions

**Date:** 2026-07-20
**Status:** Approved, ready for implementation plan

## Problem

After expanding the home quick-log catalogs to full calendar parity (9 kids / 15
pregnancy / 14 cycle rows), the "What do you want to track?" picker has three
layout/clarity problems, visible in the screenshots:

1. **SAVE button clips / is unreachable.** `LogSheet` renders all children (rows
   AND the SAVE PillButton) inside ONE `ScrollView` (`maxHeight 95%`). SAVE is
   the last scrolled child, so with a long list it falls below the fold — the
   kids screenshot shows "SAVE" half-clipped; pregnancy/cycle never reach it.
2. **Rows are tall.** Generous padding (14) + 42px sockets means only ~5–6 rows
   fit; the list overflows immediately.
3. **Cycle rows look near-identical.** The cycle picker's default (non-Diffuse)
   render reuses ONE `Drop` glyph for 9 rows (bbt, lh, cm, period_start,
   period_end, pregnancy_test, clots, weight, water) and ONE `Heart` for 4
   (symptoms, intimacy, sex_drive, activity) — differentiated only by fill color.
   Rows are hard to tell apart at a glance.

Root causes:
- (1) `LogSheet` has no pinned-footer slot.
- (2) The shared picker row style is over-padded for a long list.
- (3) The cycle picker is the OUTLIER of the three: it's the only one reaching
  into the decorative `components/ui/Stickers.tsx` (`Drop`/`Heart`/`Smiley`)
  instead of the purpose-built `Log*` set in `components/stickers/RewardStickers.tsx`
  that the pregnancy picker AND the calendar's `logSticker()` already use.

## Decisions (locked)

1. **Pinned SAVE** — add a footer slot to `LogSheet`; move each picker's SAVE
   button into it so it's always visible.
2. **Moderately compact rows** — trim padding (14→10), socket (42→36), gap
   (14→12); keep the 24px toggle. ~7–8 rows visible; list scrolls; SAVE pinned.
3. **Distinct cycle glyphs** — cycle picker's default path uses the calendar's
   `logSticker()` glyphs (11/14 distinct for free); 3 Phase-2 types get
   closest-fit existing `Log*` stand-ins (no new SVG art this pass); Diffuse path
   gets the parallel distinct-`CharacterName` remap.
4. **Toggle unchanged** — the on/off checkmark circle + full-row Pressable works;
   not touched.

## Changes

### A. `components/calendar/LogSheet.tsx` — add optional pinned footer

- Add `footer?: ReactNode` to `LogSheetProps`.
- In BOTH `CurrentLogSheet` and `DiffuseLogSheet`: render `{footer}` as a sibling
  **after** the `<ScrollView>`, still inside `styles.sheet` (above the
  `insets.bottom + 16` padding). The ScrollView keeps flexing above it.
- Backward-compatible: no `footer` → layout unchanged (every other LogSheet
  consumer is unaffected).
- Give the footer a hairline top divider + horizontal padding matching the
  content (24) so it reads as a pinned action bar, not a floating button.

### B. The 3 pickers — SAVE into footer + compact rows

Files: `components/home/kids/KidsQuickLogPicker.tsx`,
`components/home/pregnancy/QuickLogPicker.tsx`,
`components/home/cycle/CycleQuickLogPicker.tsx`.

They are structurally identical (same row map → Pressable → row/socket/checkbox
styles; same `saveWrap` trailing PillButton; all wrap `<LogSheet>`).

- Move each picker's `<PillButton>` out of the trailing `saveWrap` child and pass
  it to `<LogSheet footer={<PillButton .../>}>`. Delete the `saveWrap` style +
  trailing block.
- Compact the shared `row`/`socket` styles (apply the SAME values in all three):
  - `row.paddingVertical: 14 → 10`
  - `row.gap: 14 → 12`
  - `socket: 42 → 36` (borderRadius 21 → 18)
  - inner glyph `size: 24 → 22`
  - `checkbox`: unchanged (24, still a comfortable tap target; whole row is
    pressable anyway)
  - `row.borderRadius`: keep `radius.lg`
- Keep the between-rows `gap: 10` (or trim to 8 if still tight).

### C. `components/home/cycle/CycleQuickLogPicker.tsx` — distinct icons

The picker's `CYCLE_QUICK_LOGS` entries each carry a `sheet` field that IS a
`logSticker()` type key. So:

- **Default (non-Diffuse) path:** replace the `Drop`/`Heart`/`Smiley` switch with
  `logSticker(q.sheet, 22, isDark)` from `components/calendar/logStickers.tsx`.
  This yields distinct, calendar-matching glyphs for 11/14 rows for free:
  `mood→LogMood, symptoms→LogSymptom, bbt→LogTemperature, lh→LogOvulation,
  cm→LogCervicalFluid, intimacy→LogIntimacy, period_start→LogPeriodStart,
  period_end→LogPeriodEnd, weight→LogWeight, water→LogWater, activity→LogExercise`.
- **The 3 Phase-2 collisions** (`logSticker` reuses placeholders for these — see
  its "Phase 2" comment): override in the picker with closest-fit DISTINCT
  existing `Log*` components so no two rows share a glyph:
  - `pregnancy_test` → `LogExamResult` (it is literally a test result)
  - `clots` → `LogNesting` (distinct shape; closest unused)
  - `sex_drive` → `LogKegel` (distinct shape; closest unused)
  These are stand-ins, not semantically perfect; acceptable per decision #3 (no
  new art this pass). Implement as a small `CYCLE_ICON_OVERRIDE: Record<sheet,
  Log*>` consulted before falling back to `logSticker()`.
- **Diffuse path:** remap `CYCLE_LOG_META[key].char` to remove collisions:
  `symptoms→warning, lh→ovulation, cm→cloud, pregnancy_test→exam,
  sex_drive→sparkle, clots→contraction` (keep mood, bbt→temperature, intimacy→heart,
  period_start/period_end→period, weight→growth, water→water, activity→activity).
  `period_start`/`period_end` share `period` (unavoidable — no distinct blob);
  differentiate by the existing hue/`soft` tint (give period_end a different hue
  if they currently match).

The `soft` socket tint per row stays token-based (existing pattern).

## Verification note (glyph existence)

Before finalizing, the implementer verifies each `Log*` component name against
`components/stickers/RewardStickers.tsx` exports and each `CharacterName` against
`components/characters/Characters.tsx`. If a proposed stand-in doesn't exist,
substitute the closest exported one and note it.

## Explicitly out of scope (YAGNI)

- **Toggle mechanism** — unchanged (works, good hit target).
- **Pregnancy & Kids icons** — already distinct (RewardStickers / Character);
  only the shared row compacting touches them.
- **`exam`/`exam_result` never-done state** — separate, already-documented
  limitation from the parity feature; not re-touched here.
- **Catalogs, routers, logging behavior** — untouched.
- **New SVG art** for the 3 Phase-2 cycle types — deferred; stand-ins used.

## Success criteria

- SAVE is visible on every picker (all 3 behaviors, both variants) regardless of
  list length — pinned, never clipped.
- The longest list (pregnancy, 15) scrolls smoothly with SAVE pinned; ~7–8 rows
  visible at once.
- No two rows in the cycle picker show an identical glyph in the default look
  (except period_start/period_end, differentiated by color).
- Other `LogSheet` consumers (log forms) render unchanged (no `footer` passed).
- Typecheck clean; tests green; no hardcoded hex/radius/font (tokens only).
