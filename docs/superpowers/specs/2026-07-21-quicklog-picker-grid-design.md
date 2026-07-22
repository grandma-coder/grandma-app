# Quick-log picker — 2-column tile grid, everything on one screen

**Date:** 2026-07-21
**Status:** Approved, ready for implementation plan

## Problem

The "What do you want to track?" picker lists each log option as a full-width
row. With the catalogs now at full parity (kids 9 / cycle 14 / pregnancy 15),
the long lists force scrolling — the user can't see everything at once, and the
three pickers don't feel like one screen. The goal: **the whole list visible on
one screen, no scrolling, in one identical compact layout across all three
behaviors.**

A single vertical column can't fit 15 tappable rows on a phone. The fix is a
**layout change**, not just smaller rows: a **2-column grid of compact tiles**.

## Decisions (locked)

1. **2-column tile grid** replaces the full-width row list. 15 items → 8 rows of
   2 → fits one screen.
2. **One shared component** (`QuickLogPickerGrid`) renders the grid; all three
   pickers use it — identical by construction, can't drift again.
3. **All three behaviors** (kids, cycle, pregnancy) use the grid.
4. **Tile chrome = hairline border, no shadow** (cleaner across a dense grid).
5. **Pregnancy included now**, rebased on the teammate's in-tree uncommitted
   blob-icon version (preserve their icons, restructure only the layout).

## Layout

### The grid
- Container: `flexDirection: 'row'`, `flexWrap: 'wrap'`, `gap: 10`.
- Each tile: `width: '48%'` (2 per row; the 10px gap + two 48% tiles fit within
  the sheet's 24px-padded content width).
- 15 items = 8 rows; kids 9 = 5 rows; cycle 14 = 7 rows. On standard/large
  phones the sheet (95% height − ~70px header − ~70px footer ≈ 700–760px content)
  fits 8 tile-rows (~78px each + gaps ≈ 700px) with no scroll. The `LogSheet`
  ScrollView stays as a safety net for the smallest devices; it just won't
  scroll in the common case.

### A tile
- **Icon socket:** the behavior's blob/sticker at `size 24` inside a `34×34`
  circle (`borderRadius 17`) tinted with the item's soft hue.
- **Label:** beside the socket, `Body size 14`, `colors.text`, `numberOfLines={1}`
  (labels are short; long ones like "Cervical Mucus" ellipsize).
- **Selected badge:** top-right corner of the tile — `20×20` circle; ON = filled
  `colors.text` + white `Check` (size 12); OFF = hairline `colors.border` empty
  circle.
- **Tile chrome:** `backgroundColor: colors.surface`, `borderWidth: 1`
  `borderColor: colors.border` (→ `colors.text` when selected), `borderRadius:
  radius.lg`, `paddingVertical 12` / `paddingHorizontal 12`, `gap 10` between
  socket and label. Whole tile is the `Pressable` (pressed `opacity 0.8`).

Layout inside a tile: socket + label in a row, with the selected badge
absolutely positioned top-right (or a compact single row: socket, label flexes,
badge trailing — implementer picks whichever keeps a 2-up tile readable; the
absolute badge is preferred so the label has full width).

## Shared component

Create `components/home/QuickLogPickerGrid.tsx`:

```ts
export interface QuickLogGridItem {
  key: string
  label: string
  icon: React.ReactNode   // the socket's blob/sticker (each picker supplies its own)
  socketTint: string      // soft hue behind the icon
  selected: boolean
  onToggle: () => void
}

export function QuickLogPickerGrid({ items }: { items: QuickLogGridItem[] }): React.ReactElement
```

It renders the wrap-grid of tiles. It owns ALL tile chrome + the selected badge
+ the grid gap — so the three pickers share one visual. Each picker keeps only:
its icon resolver (`characterFor` / `blobFor`), its catalog + store wiring, and
its draft/toggle/save logic. The picker maps its catalog → `QuickLogGridItem[]`
and passes it in.

## Per-picker changes

All three (`components/home/kids/KidsQuickLogPicker.tsx`,
`components/home/pregnancy/QuickLogPicker.tsx`,
`components/home/cycle/CycleQuickLogPicker.tsx`):

- Build `items: QuickLogGridItem[]` from the catalog (map each def → `{ key,
  label: t(labelKey), icon: <its blob/sticker>, socketTint: <soft>, selected:
  draft.includes(key), onToggle: () => toggleDraft(key) }`).
- Render `<QuickLogPickerGrid items={items} />` in place of the old row list.
- Delete each picker's local `row` / `socket` / `checkbox` styles (now owned by
  the grid). Keep `saveWrap` only where still needed — but all three should pass
  SAVE via `LogSheet`'s `footer` prop (kids + cycle already do; **pregnancy**
  currently renders a trailing `saveWrap` block → move it into `footer` so all
  three match, and delete `saveWrap`).
- Titles: standardize all three to the same key so the header text is identical
  (they already render "What do you want to track?"; kids/cycle use
  `kids_quickLogs_pickTitle`, pregnancy uses `pregnancy_quickLogs_pickTitle` —
  point all three at one key; no new i18n key needed, reuse an existing one whose
  string is "What do you want to track?").

### Pregnancy — rebase on the teammate's uncommitted icons

The pregnancy picker has UNCOMMITTED in-tree edits (a teammate migrated its icons
to `blobFor` off `DIFFUSE_LOG_CHARACTER`). Read the CURRENT in-tree version and
apply the grid on top — preserve their `blobFor` icon resolver, restructure only
the layout (row list → grid). Do NOT revert their icon work. Stage ONLY the
pregnancy picker file; never `git add -A`.

## Explicitly out of scope (YAGNI)

- **Icon content** per behavior — unchanged; each picker's resolver is passed
  into the grid untouched.
- **`LogSheet`** shell — the `footer` slot already exists; not modified.
- **Catalogs / routing / logging logic** — untouched.
- **New i18n keys** — reuse the existing "What do you want to track?" key.

## Success criteria

- Each behavior's full option list is visible on one screen (no scroll) on a
  standard phone; the sheet still scrolls gracefully on the smallest devices.
- All three pickers render the identical grid layout (same tile size, gap,
  selected badge, border) via the one shared `QuickLogPickerGrid`.
- Tapping a tile toggles it; SAVE is pinned in the footer on all three; the
  header title is identical across all three.
- Pregnancy keeps the teammate's blob icons (their uncommitted work not reverted).
- Typecheck clean; existing tests green; tokens only (no hardcoded hex/radius).
