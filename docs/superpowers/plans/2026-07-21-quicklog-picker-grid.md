# Quick-Log Picker 2-Column Tile Grid — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "What do you want to track?" picker show its whole option list on one screen (no scrolling) for all three behaviors, by replacing the full-width row list with a shared 2-column tile grid.

**Architecture:** Create ONE shared `QuickLogPickerGrid` component (owns all tile chrome + the 2-column wrap layout + the selected badge). Each of the 3 pickers maps its catalog → `QuickLogGridItem[]` (supplying its own icon + tint) and renders `<QuickLogPickerGrid items={...} />`. Pickers keep their icon resolvers, catalog/store wiring, and draft/toggle/save logic; only the row-list layout is replaced.

**Tech Stack:** React Native 0.81, Expo SDK 54, TypeScript strict, lucide-react-native, Jest + @testing-library/react-native. Tokens from `constants/theme.ts`.

## Global Constraints

- **Design tokens only** — no hardcoded hex/radius/font. `useTheme()` for colors, `radius` for radii.
- **Tile chrome = hairline border, NO shadow.** `backgroundColor: colors.surface`, `borderWidth: 1` (`colors.border`, → `colors.text` when selected), `borderRadius: radius.lg`.
- **Grid:** `flexDirection: 'row'`, `flexWrap: 'wrap'`, `gap: 10`; each tile `width: '48%'` (2 per row).
- **Tile internals:** socket `34×34` (radius 17) with the item's soft tint; icon rendered by the picker at `size 24`; label `Body size 14`, `numberOfLines={1}`; selected badge `20×20` circle top-right (ON = filled `colors.text` + white `Check` size 12; OFF = hairline empty). Whole tile is `Pressable`, pressed `opacity 0.8`.
- **SAVE pinned in `LogSheet` footer** on all three (kids + cycle already do; pregnancy must move its trailing `saveWrap` into `footer`).
- **Same title** on all three: `t('kids_quickLogs_pickTitle')` (kids + cycle already use it; pregnancy switches to it). No new i18n key.
- **Concurrency:** the pregnancy picker has UNCOMMITTED teammate edits (its `blobFor` icon migration). Task 4 must READ the current in-tree file and preserve `blobFor`; restructure only layout. Stage ONLY each task's file(s); NEVER `git add -A`. A task's review BASE is its commit's actual parent (`git rev-parse <commit>^`), which may be a concurrent commit.
- **Typecheck:** `npm run typecheck`. **Tests:** `npm test`. Work on `main`.

---

### Task 1: Create the shared `QuickLogPickerGrid`

**Files:**
- Create: `components/home/QuickLogPickerGrid.tsx`
- Test: `components/home/__tests__/QuickLogPickerGrid.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface QuickLogGridItem {
    key: string
    label: string
    icon: React.ReactNode
    socketTint: string
    selected: boolean
    onToggle: () => void
  }
  export function QuickLogPickerGrid({ items }: { items: QuickLogGridItem[] }): React.ReactElement
  ```

- [ ] **Step 1: Write the failing test**

Create `components/home/__tests__/QuickLogPickerGrid.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native'
import { Text } from 'react-native'
import { QuickLogPickerGrid, type QuickLogGridItem } from '../QuickLogPickerGrid'

function makeItems(overrides: Partial<QuickLogGridItem>[] = []): QuickLogGridItem[] {
  const base: QuickLogGridItem[] = [
    { key: 'a', label: 'Mood', icon: <Text>IA</Text>, socketTint: '#eee', selected: true, onToggle: () => {} },
    { key: 'b', label: 'Water', icon: <Text>IB</Text>, socketTint: '#eee', selected: false, onToggle: () => {} },
  ]
  return base.map((it, i) => ({ ...it, ...(overrides[i] ?? {}) }))
}

describe('QuickLogPickerGrid', () => {
  it('renders a tile per item (label + icon)', () => {
    const { queryByText } = render(<QuickLogPickerGrid items={makeItems()} />)
    expect(queryByText('Mood')).toBeTruthy()
    expect(queryByText('Water')).toBeTruthy()
    expect(queryByText('IA')).toBeTruthy()
  })

  it('fires onToggle when a tile is pressed', () => {
    const onToggle = jest.fn()
    const items = makeItems([{ onToggle }])
    const { getByText } = render(<QuickLogPickerGrid items={items} />)
    fireEvent.press(getByText('Mood'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('renders all items for a long list (15)', () => {
    const many: QuickLogGridItem[] = Array.from({ length: 15 }, (_, i) => ({
      key: `k${i}`, label: `Item ${i}`, icon: <Text>{`I${i}`}</Text>,
      socketTint: '#eee', selected: i % 2 === 0, onToggle: () => {},
    }))
    const { queryByText } = render(<QuickLogPickerGrid items={many} />)
    expect(queryByText('Item 0')).toBeTruthy()
    expect(queryByText('Item 14')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- QuickLogPickerGrid`
Expected: FAIL — cannot find module `../QuickLogPickerGrid`.

- [ ] **Step 3: Write the component**

Create `components/home/QuickLogPickerGrid.tsx`:

```tsx
/**
 * QuickLogPickerGrid — the shared 2-column tile grid for the "What do you want
 * to track?" pickers (kids / pregnancy / cycle). One source of truth for tile
 * chrome + layout so all three pickers look identical and fit their full list on
 * one screen. Each picker supplies per-item icon + tint; this owns the rest.
 */
import React from 'react'
import { View, Pressable, Text, StyleSheet } from 'react-native'
import { Check } from 'lucide-react-native'
import { useTheme, radius } from '../../constants/theme'
import { Body } from '../ui/Typography'

export interface QuickLogGridItem {
  key: string
  label: string
  icon: React.ReactNode
  socketTint: string
  selected: boolean
  onToggle: () => void
}

export function QuickLogPickerGrid({ items }: { items: QuickLogGridItem[] }): React.ReactElement {
  const { colors } = useTheme()
  return (
    <View style={styles.grid}>
      {items.map((it) => (
        <Pressable
          key={it.key}
          onPress={it.onToggle}
          accessibilityRole="button"
          accessibilityState={{ selected: it.selected }}
          accessibilityLabel={it.label}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: colors.surface, borderColor: it.selected ? colors.text : colors.border, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <View style={[styles.socket, { backgroundColor: it.socketTint }]}>{it.icon}</View>
          <Body size={14} color={colors.text} numberOfLines={1} style={styles.label}>{it.label}</Body>
          <View style={[styles.badge, { borderColor: it.selected ? colors.text : colors.border, backgroundColor: it.selected ? colors.text : 'transparent' }]}>
            {it.selected ? <Check size={12} color={colors.bg} strokeWidth={3} /> : null}
          </View>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  socket: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  label: { flex: 1, minWidth: 0 },
  badge: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- QuickLogPickerGrid`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no new errors in the new files.

- [ ] **Step 6: Commit**

```bash
git add components/home/QuickLogPickerGrid.tsx components/home/__tests__/QuickLogPickerGrid.test.tsx
git commit -m "feat(home): add shared QuickLogPickerGrid (2-column tile grid)"
```

---

### Task 2: Kids picker → grid

**Files:**
- Modify: `components/home/kids/KidsQuickLogPicker.tsx`

**Interfaces:**
- Consumes: `QuickLogPickerGrid`, `QuickLogGridItem` (Task 1).

- [ ] **Step 1: Import the grid + build items**

In `components/home/kids/KidsQuickLogPicker.tsx`, add `import { QuickLogPickerGrid, type QuickLogGridItem } from '../QuickLogPickerGrid'`. Inside the component (after `save`), build the item list from the catalog using the existing `characterFor` resolver:

```tsx
  const items: QuickLogGridItem[] = KIDS_QUICK_LOGS.map((q) => {
    const c = characterFor(q.key, stickers)
    return {
      key: q.key,
      label: t(q.labelKey),
      icon: <Character name={c.name} size={24} color={c.hue} />,
      socketTint: c.soft,
      selected: draft.includes(q.key),
      onToggle: () => toggleDraft(q.key),
    }
  })
```

- [ ] **Step 2: Replace the row list with the grid**

Replace the `<View style={{ gap: 10 }}>...</View>` block (the `.map` over `KIDS_QUICK_LOGS` producing `<Pressable>` rows) with:

```tsx
      <QuickLogPickerGrid items={items} />
```

Leave the `<LogSheet ... footer={<PillButton .../>}>` wrapper exactly as-is (kids already pins SAVE in the footer).

- [ ] **Step 3: Delete the now-dead local styles**

Remove the entire `styles` `StyleSheet.create` block (`row`, `socket`, `checkbox` — all now owned by the grid). Remove the `Pressable`, `Check`, `radius`, and `StyleSheet` imports if typecheck flags them unused (the grid owns them now). `View`, `Character`, `Body` may still be used — let typecheck decide; do not blind-delete.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add components/home/kids/KidsQuickLogPicker.tsx
git commit -m "feat(kids): render quick-log picker as 2-column grid"
```

---

### Task 3: Cycle picker → grid

**Files:**
- Modify: `components/home/cycle/CycleQuickLogPicker.tsx`

**Interfaces:**
- Consumes: `QuickLogPickerGrid`, `QuickLogGridItem` (Task 1).

- [ ] **Step 1: Import the grid + build items**

In `components/home/cycle/CycleQuickLogPicker.tsx`, add `import { QuickLogPickerGrid, type QuickLogGridItem } from '../QuickLogPickerGrid'`. The existing `blobFor(logType, stickers)` returns `{ node, soft }`. Build:

```tsx
  const items: QuickLogGridItem[] = CYCLE_QUICK_LOGS.map((q) => {
    const s = blobFor(q.sheet, themeStickers)
    return {
      key: q.key,
      label: t(q.labelKey),
      icon: s.node,
      socketTint: s.soft,
      selected: draft.includes(q.key),
      onToggle: () => toggleDraft(q.key),
    }
  })
```

(`blobFor` already renders the `<Character>` at `size 22` — that's fine; the grid's socket is 34px so the 22 glyph sits comfortably. Leave `blobFor` unchanged.)

- [ ] **Step 2: Replace the row list with the grid**

Replace the `<View style={{ gap: 10 }}>...</View>` block (the `.map` over `CYCLE_QUICK_LOGS`) with:

```tsx
      <QuickLogPickerGrid items={items} />
```

Leave the `<LogSheet ... footer={...}>` wrapper as-is (cycle already pins SAVE + uses `kids_quickLogs_pickTitle`).

- [ ] **Step 3: Delete the now-dead local styles**

Remove the `styles` `StyleSheet.create` block (`row`, `socket`, `checkbox`). Remove `Pressable`, `Check`, `radius`, `StyleSheet`, `Body` imports if typecheck flags them unused. KEEP `blobFor`, `softForHue`, `CYCLE_BLOB_OVERRIDE`, `Character`, `DIFFUSE_LOG_CHARACTER`, `diffuseLogHue`, `useTheme` (still used by `blobFor`/items). Let typecheck confirm which imports to drop.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add components/home/cycle/CycleQuickLogPicker.tsx
git commit -m "feat(cycle): render quick-log picker as 2-column grid"
```

---

### Task 4: Pregnancy picker → grid (rebase on teammate's icons)

**Files:**
- Modify: `components/home/pregnancy/QuickLogPicker.tsx`

**Interfaces:**
- Consumes: `QuickLogPickerGrid`, `QuickLogGridItem` (Task 1).

**IMPORTANT:** This file has UNCOMMITTED teammate edits (its `blobFor` icon migration off `DIFFUSE_LOG_CHARACTER`). READ the current in-tree file first. Preserve `blobFor` and the teammate's imports; change ONLY the layout (row list → grid), the SAVE location (trailing `saveWrap` → `footer`), and the title key. Do NOT revert their icon work.

- [ ] **Step 1: Read the current in-tree file**

Open `components/home/pregnancy/QuickLogPicker.tsx` and confirm it has `blobFor(logType)` returning `{ node, soft }` (built on `DIFFUSE_LOG_CHARACTER` / `diffuseLogHue` / `diffuseLogSoftHue`), a trailing `<View style={styles.saveWrap}><PillButton .../></View>`, and `title={t('pregnancy_quickLogs_pickTitle')}`. Work from whatever the file currently contains.

- [ ] **Step 2: Import the grid + build items**

Add `import { QuickLogPickerGrid, type QuickLogGridItem } from '../QuickLogPickerGrid'`. Build (using the existing `blobFor` + `available` week-filtered list):

```tsx
  const items: QuickLogGridItem[] = available.map((q) => {
    const s = blobFor(q.logType)
    return {
      key: q.key,
      label: t(q.labelKey),
      icon: s.node,
      socketTint: s.soft,
      selected: draft.includes(q.key),
      onToggle: () => toggleDraft(q.key),
    }
  })
```

- [ ] **Step 3: Move SAVE into the footer, fix the title, render the grid**

Replace the `return (<LogSheet ...> ... </LogSheet>)` so that: (a) `title={t('kids_quickLogs_pickTitle')}` (same key as kids + cycle); (b) SAVE is passed via `footer={<PillButton label={dirty ? t('common_save') : t('common_done')} variant="ink" onPress={dirty ? save : onClose} disabled={draft.length === 0} />}`; (c) the body is just `<QuickLogPickerGrid items={items} />`; (d) the trailing `<View style={styles.saveWrap}>` block is removed. Result:

```tsx
    <LogSheet
      visible={visible}
      title={t('kids_quickLogs_pickTitle')}
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
      <QuickLogPickerGrid items={items} />
    </LogSheet>
```

- [ ] **Step 4: Delete the now-dead local styles**

Remove the `styles` `StyleSheet.create` block (`row`, `socket`, `checkbox`, `saveWrap`). Remove `Pressable`, `Check`, `radius`, `StyleSheet`, `Body` imports if typecheck flags them unused. KEEP `blobFor` + its `DIFFUSE_LOG_CHARACTER`/`diffuseLogHue`/`diffuseLogSoftHue`/`Character` imports (the teammate's icon work). Let typecheck confirm.

- [ ] **Step 5: Typecheck + test**

Run: `npm run typecheck` then `npm test`
Expected: no new errors; tests green.

- [ ] **Step 6: Commit (ONLY the pregnancy picker)**

```bash
git add components/home/pregnancy/QuickLogPicker.tsx
git commit -m "feat(pregnancy): render quick-log picker as 2-column grid"
```

(If `git status` shows other uncommitted teammate files, do NOT stage them — `git add` only this one path.)

---

### Task 5: Verification

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: clean, or only pre-existing errors in files this plan didn't touch (NOT `QuickLogPickerGrid.tsx` or any of the 3 pickers).

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: all pass, including `QuickLogPickerGrid`.

- [ ] **Step 3: Grep — all 3 pickers use the shared grid**

Run: `grep -l "QuickLogPickerGrid" components/home/kids/KidsQuickLogPicker.tsx components/home/pregnancy/QuickLogPicker.tsx components/home/cycle/CycleQuickLogPicker.tsx`
Expected: all 3 files listed.

- [ ] **Step 4: Grep — old row styles gone from all 3 pickers**

Run: `grep -n "styles.row\|saveWrap\|styles.checkbox" components/home/kids/KidsQuickLogPicker.tsx components/home/pregnancy/QuickLogPicker.tsx components/home/cycle/CycleQuickLogPicker.tsx`
Expected: NO matches (each picker's local row/checkbox/saveWrap removed).

- [ ] **Step 5: Grep — same title across all 3**

Run: `grep -n "quickLogs_pickTitle" components/home/kids/KidsQuickLogPicker.tsx components/home/pregnancy/QuickLogPicker.tsx components/home/cycle/CycleQuickLogPicker.tsx`
Expected: all three use `kids_quickLogs_pickTitle`.

- [ ] **Step 6: Commit (only if a step required cleanup)**

Stage specific files only; never `git add -A` (concurrent WIP in tree).

---

## Self-Review

**Spec coverage:**
- 2-column tile grid, everything on one screen → `QuickLogPickerGrid` (Task 1), applied in Tasks 2–4. ✓
- One shared component → Task 1; all three consume it. ✓
- All three behaviors → Tasks 2 (kids), 3 (cycle), 4 (pregnancy). ✓
- Hairline-border tiles, no shadow → grid `styles.tile` (Task 1). ✓
- Socket 34 / icon 24 / badge 20 / gap 10 / width 48% → Task 1 constants. ✓
- SAVE pinned in footer on all three → kids/cycle already; pregnancy moved in Task 4. ✓
- Same title on all three → `kids_quickLogs_pickTitle`; pregnancy switched in Task 4; verified in Task 5 Step 5. ✓
- Pregnancy rebased on teammate's `blobFor` icons (not reverted) → Task 4 Steps 1, 4. ✓
- Tokens only → all values from `radius`/`colors`; no hex. ✓

**Placeholder scan:** No TBDs. Every code step shows full code. The "let typecheck decide which imports to drop" steps are bounded (named candidate imports + a rule), not hand-waves.

**Type consistency:** `QuickLogGridItem` (`key`, `label`, `icon`, `socketTint`, `selected`, `onToggle`) is defined in Task 1 and built identically in Tasks 2–4. Each picker's icon resolver returns a node/tint that map cleanly to `icon`/`socketTint` (kids `characterFor` → `{name,hue,soft}`; cycle/pregnancy `blobFor` → `{node,soft}`). `QuickLogPickerGrid({ items })` signature is consistent across all consumers.

**Note on the icon-size difference:** kids builds the icon at `size 24`; cycle/pregnancy's `blobFor` renders at `size 22`. Both sit inside the same 34px socket and read fine; not worth forcing identical since each behavior's resolver is preserved as-is (YAGNI). Flagged so the reviewer doesn't treat it as an inconsistency to fix.
