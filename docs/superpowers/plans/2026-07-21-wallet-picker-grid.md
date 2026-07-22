# Wallet (Quick-access) Picker → 2-Column Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the Quick-access edit picker (`WalletPicker`) render the shared `QuickLogPickerGrid` 2-column tile grid, matching the log pickers — one file, all three behaviors.

**Architecture:** `WalletPicker` is already the single shared picker for all 3 wallets. Swap its internal row list for `QuickLogPickerGrid`; map `WalletPickerItem[]` → `QuickLogGridItem[]`; move SAVE to the `LogSheet` footer. Public `Props`/`WalletPickerItem` unchanged so consumers need no edits.

**Tech Stack:** React Native 0.81, TypeScript strict. Tokens from `constants/theme.ts`.

## Global Constraints

- Design tokens only. `QuickLogPickerGrid` (from `./QuickLogPickerGrid`) owns tile chrome; do not restyle it.
- Do NOT change `WalletPickerItem` interface or `Props` — the 3 wallet consumers pass these and must stay untouched.
- Diffuse-variant row coloring is intentionally dropped (grid uses current theme) — accepted per spec.
- Stage ONLY `components/home/WalletPicker.tsx`; never `git add -A` (concurrent teammate WIP in tree). Work on `main`.
- Typecheck: `npm run typecheck`. Tests: `npm test`.

---

### Task 1: Swap WalletPicker to the shared grid

**Files:**
- Modify: `components/home/WalletPicker.tsx`

**Interfaces:**
- Consumes: `QuickLogPickerGrid`, `QuickLogGridItem` from `./QuickLogPickerGrid`.

- [ ] **Step 1: Import the grid + build grid items**

Add `import { QuickLogPickerGrid, type QuickLogGridItem } from './QuickLogPickerGrid'`. Inside the component (after `save`), build:

```tsx
  const gridItems: QuickLogGridItem[] = items.map((it) => ({
    key: it.key,
    label: it.label,
    icon: it.icon,
    socketTint: it.soft,
    selected: draft.includes(it.key),
    onToggle: () => toggleDraft(it.key),
  }))
```

- [ ] **Step 2: Replace the row list + move SAVE to footer**

Replace the entire `return (<LogSheet ...> ... </LogSheet>)` with:

```tsx
    <LogSheet
      visible={visible}
      title={t('wallet_pickTitle')}
      onClose={onClose}
      footer={
        <PillButton
          label={dirty ? t('common_save') : t('common_done')}
          variant="ink"
          onPress={dirty ? save : onClose}
          disabled={draft.length === 0}
        />
      }
    >
      <QuickLogPickerGrid items={gridItems} />
    </LogSheet>
```

- [ ] **Step 3: Delete dead styles + unused Diffuse resolution**

Remove the `styles` `StyleSheet.create` block (`row`/`socket`/`checkbox`/`saveWrap`). Remove the Diffuse color locals (`rowBorder`, `rowBg`, `rowInk`, `checkBg`, `checkGlyph`) — no longer used. Then remove imports typecheck flags as unused: likely `Pressable`, `Check`, `StyleSheet`, `radius`, `View`, `Body`, `useDiffuseTheme`, `useIsDiffuse`, and `useTheme` (if `colors` is no longer referenced). Keep `useState`, `useEffect`, `PillButton`, `LogSheet`, `useTranslation`, and the `QuickLogPickerGrid` import. Let typecheck confirm the exact set.

Keep the `WalletPickerItem` interface, `Props`, and the draft/toggle/dirty/save logic EXACTLY as-is.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: clean for this file (ignore pre-existing errors in files this task didn't touch). Remove any remaining unused import it flags.

- [ ] **Step 5: Test**

Run: `npm test`
Expected: all pass (existing suite; no logic change).

- [ ] **Step 6: Commit**

```bash
git add components/home/WalletPicker.tsx
git commit -m "feat(home): render Quick-access wallet picker as 2-column grid"
```

---

### Task 2: Verification

**Files:** none.

- [ ] **Step 1: Typecheck** — `npm run typecheck`; no errors in `WalletPicker.tsx`.
- [ ] **Step 2: Tests** — `npm test`; all pass.
- [ ] **Step 3: Grep — grid wired, old styles gone**

Run: `grep -n "QuickLogPickerGrid\|styles.row\|saveWrap" components/home/WalletPicker.tsx`
Expected: `QuickLogPickerGrid` present; NO `styles.row` / `saveWrap`.

- [ ] **Step 4: Grep — consumers untouched**

Run: `git status --short -- components/home/KidsWallet.tsx components/home/cycle/CycleWallet.tsx components/home/pregnancy/WeekWallet.tsx`
Expected: none of the 3 wallet consumers modified by this work (any `M` on them is the concurrent teammate, not us — do not stage).

---

## Self-Review

**Spec coverage:** grid swap (Task 1 Steps 1-2), SAVE→footer (Step 2), dead-style + Diffuse-resolution removal (Step 3), consumers untouched (Props/interface preserved; Task 2 Step 4 verifies). ✓
**Placeholder scan:** no TBDs; full code shown; "let typecheck confirm unused imports" is bounded with a named candidate list. ✓
**Type consistency:** `gridItems` built as `QuickLogGridItem[]` (the exact interface the grid consumes, verified in the shipped `QuickLogPickerGrid`); `WalletPickerItem` → `QuickLogGridItem` field mapping is 1:1 with `socketTint: it.soft`. ✓
