# Quick-access (wallet) edit picker → 2-column tile grid

**Date:** 2026-07-21
**Status:** Approved, ready for implementation plan

## Problem

We just moved the "What do you want to track?" log pickers to a shared
2-column tile grid (`QuickLogPickerGrid`). The **Quick access** section's edit
control opens a different picker (`WalletPicker` — "choose which cards show on
your home wallet") that still uses the old full-width row list. It should get the
same grid treatment so the two pickers match and long card lists fit better.

Unlike the log pickers, `WalletPicker` is ALREADY a single shared component used
by all three wallets (`KidsWallet`, `CycleWallet`, `WeekWallet`) — so one file
changes and all three behaviors get the grid.

## Decision (locked)

- **Swap `WalletPicker`'s row list for the shared `QuickLogPickerGrid`** (2-column
  tiles, hairline border, pinned SAVE in the `LogSheet` footer) — identical to
  the log pickers.
- The grid uses current-theme colors (`useTheme()`); it is not Diffuse-branched.
  `WalletPicker` currently resolves its own Diffuse-aware row colors — that
  Diffuse-specific coloring is dropped. The default (shipping) look is unaffected;
  Diffuse is opt-in/experimental. Accepted tradeoff.

## Change

**File:** `components/home/WalletPicker.tsx` (the only file — its 3 wallet
consumers already pass `WalletPickerItem[]` and are untouched).

- Import `{ QuickLogPickerGrid, type QuickLogGridItem } from './QuickLogPickerGrid'`.
- Map the incoming `items: WalletPickerItem[]` (`{ key, label, icon, soft }`) →
  `QuickLogGridItem[]`: `{ key, label, icon, socketTint: it.soft, selected:
  draft.includes(it.key), onToggle: () => toggleDraft(it.key) }`.
- Replace the `<View style={{gap:10}}>` row-list block with
  `<QuickLogPickerGrid items={gridItems} />`.
- Move the SAVE `PillButton` into `LogSheet`'s `footer` prop (drop the trailing
  `saveWrap` block) — matching the log pickers.
- Delete the local `row` / `socket` / `checkbox` / `saveWrap` styles. Delete the
  now-unused Diffuse color resolution (`rowBorder`/`rowBg`/`rowInk`/`checkBg`/
  `checkGlyph`, `useDiffuseTheme`, `useIsDiffuse`) and any import typecheck flags
  unused (`Pressable`, `Check`, `radius`, `StyleSheet`, `useTheme`, `Body`).
- Keep `WalletPickerItem` interface, the draft/toggle/dirty/save logic, the
  `wallet_pickTitle` title, and the `Props` contract EXACTLY as-is (consumers must
  not need changes).

## Out of scope (YAGNI)

- The 3 wallet consumers (they already supply `WalletPickerItem[]`).
- The shared `QuickLogPickerGrid` component (reused as-is; not modified).
- Diffuse-variant coloring of the grid (accepted tradeoff above).

## Success criteria

- Quick-access edit picker renders the same 2-column tile grid as the log pickers,
  for all three behaviors (via the one shared `WalletPicker`).
- SAVE pinned in the footer; `wallet_pickTitle` title unchanged; whole tile
  toggles selection.
- `WalletPicker`'s public `Props` + `WalletPickerItem` unchanged — no consumer edits.
- Typecheck clean; tests green; tokens only.
