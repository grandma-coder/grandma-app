# QuietPill — standardizing the secondary-action tier across behavior homes

**Date:** 2026-07-19
**Status:** Approved, ready for implementation plan

## Problem

The three behavior homes (Cycle, Pregnancy, Kids) each render a small set of
"quiet" action controls — **See Results**, **Answer**, and **Edit** — that look
and behave inconsistently. This is visible in the current UI: the Answer pill is
filled and bold, See Results is a hairline pill, and Edit shows up two different
ways.

Root cause: there is **no shared primitive** for this tier. Every instance was
hand-styled with local `StyleSheet` values, so they drifted. `PillButton` (58px
filled primary CTA) and `StickerButton` exist, but nothing covers the
compact/tertiary "quiet" tier these controls belong to — so each screen invented
its own.

### Current state (confirmed in code)

| Control | Location | Today's style |
|---|---|---|
| See Results | `CycleTodaySummaryCard`, `TodaySummaryCard` (pregnancy), `KidsTodaySummaryCard` | `headerResultsPill`: hairline `colors.border`, bg `colors.surface`, `fontSize 11`, `font.bodySemiBold`, pad 6/12, `radius.full` |
| Answer / View all cards | `pregnancy/DailyMessageCard` (shared by cycle + pregnancy homes) | `answerPill` / `pill`: **filled** `colors.surface`, `fontSize 13`, pad 8/16 — heavier than See Results |
| Edit (summary cards) | all 3 summary cards | `SlidersHorizontal size={16}`, icon-only, `hitSlop 12` |
| Edit (wallets) | `CycleWallet`, `WeekWallet` | `SlidersHorizontal size={14}` **+ "EDIT" text** |
| Edit (kids wallet) | `KidsWallet` | `SlidersHorizontal size={16}`, icon-only |

So the controls diverge both *across* behaviors and *within* one behavior (wallet
Edit ≠ summary-card Edit).

## Decisions (locked)

1. **Build a shared primitive** and swap all instances (fixes the root cause).
2. **Answer → hairline treatment** — same visual family as See Results (no longer
   a filled/emphasized pill).
3. **Edit → icon-only glyph** everywhere (drop the "EDIT" text label from the
   cycle + pregnancy wallets).
4. **Build both design variants now** — current (default cream-paper) and Diffuse
   (v3), preserving the existing Diffuse mono-caps/uppercase treatment.
5. **"View all cards"** (answered-state pill in DailyMessageCard) folds into the
   same primitive — it is the same tier.

## The primitive — `components/ui/QuietPill.tsx`

One component, resolving current vs Diffuse internally (mirrors how `PillButton`
does it). Label optional: omit → icon-only glyph (the Edit form).

```ts
interface QuietPillProps {
  label?: string            // omit → icon-only (glyph mode)
  onPress: () => void
  leading?: React.ReactNode // optional leading icon
  accessibilityLabel: string
  style?: StyleProp<ViewStyle>
}
```

### Current variant (default cream-paper)

- **Text pill** (label present): hairline `colors.border`, bg `colors.surface`,
  `radius.full`, `paddingVertical 6` / `paddingHorizontal 12`,
  `font.bodySemiBold`, `fontSize 11`, `color colors.textMuted`, `hitSlop 8`,
  pressed `opacity 0.6`. (These are exactly today's `headerResultsPill` values —
  the shared See Results look becomes the canonical one.)
- **Glyph** (label omitted): no border/bg; renders `leading` only, `hitSlop 12`,
  pressed `opacity 0.6`. Callers pass `<SlidersHorizontal size={16} strokeWidth={2} color={colors.textMuted}/>`.

### Diffuse variant (v3, behind the flag)

- Text pill: bg `transparent`, border `dt.colors.line2`, `diffuseFont.mono`,
  `textTransform: 'uppercase'`, `letterSpacing 0.8`, color `dt.colors.ink3`.
- Glyph: same as current (icon color `dt.colors.ink3`).

This is the canonical **quiet / tertiary tier**, a sibling to `PillButton`
(primary) and `StickerButton`. Once it exists, these controls can't silently
drift again.

## Swaps (7 files)

1. **`components/home/cycle/CycleTodaySummaryCard.tsx`** — See Results →
   `<QuietPill label>`; Edit → `<QuietPill leading={<SlidersHorizontal/>}>`.
   Remove `headerResultsPill` from local styles.
2. **`components/home/pregnancy/TodaySummaryCard.tsx`** — same two swaps.
3. **`components/home/kids/KidsTodaySummaryCard.tsx`** — same two swaps.
4. **`components/home/pregnancy/DailyMessageCard.tsx`** — Answer → `<QuietPill label="Answer">`
   (now hairline). "View all cards" → `<QuietPill label>`. Remove `answerPill` /
   `pill` / `pillText` local styles.
5. **`components/home/cycle/CycleWallet.tsx`** — Edit (icon+text) → icon-only `QuietPill`.
6. **`components/home/pregnancy/WeekWallet.tsx`** — Edit (icon+text) → icon-only `QuietPill`.
7. **`components/home/KidsWallet.tsx`** — Edit (already icon-only) → `QuietPill` for a single source of truth.

## Explicitly out of scope (YAGNI)

- `PillButton` / `StickerButton` — untouched; QuietPill is a new sibling.
- Log-signal chips (mood/water/sleep pills) — a different component; not action buttons.
- Reminder cards, wallet cards, section headings.
- No new translation keys — reuse existing `t()` labels
  (`cycleDash_seeResults`, `pregnancy_quickLogs_seeResults`,
  `kids_quickLogs_seeResults`, `kids_quickLogs_edit`, `common_edit`, etc.).

## Success criteria

- See Results, Answer, and Edit read as one visual family across Cycle,
  Pregnancy, and Kids, in both the current and Diffuse variants.
- All quiet-tier instances resolve through `QuietPill` — no remaining local
  `headerResultsPill` / `answerPill` style blocks.
- No design-token violations (all values from `constants/theme.ts`).
- No visual regression to the primary CTA tier.
