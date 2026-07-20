# QuietPill Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce one shared `QuietPill` primitive for the "quiet" secondary-action tier (See Results / Answer / Edit) and swap every hand-styled instance across the Cycle, Pregnancy, and Kids homes to use it.

**Architecture:** New `components/ui/QuietPill.tsx` resolves the current (cream-paper) vs Diffuse (v3) variant internally, exactly like `PillButton` does. It has two shapes: a hairline text pill (`label` present) and an icon-only glyph (`label` omitted → renders `leading` only). Seven consumer files drop their local style blocks and render `QuietPill` instead.

**Tech Stack:** React Native 0.81, Expo SDK 54, TypeScript strict, lucide-react-native, Jest + @testing-library/react-native. Design tokens from `constants/theme.ts`.

## Global Constraints

- **Design tokens only** — never hardcode hex/radius/font/shadow. Import from `constants/theme.ts`: `useTheme()` for `colors`/`font`/`radius`, `useDiffuseTheme()` + `useIsDiffuse()` + `diffuseFont` for the Diffuse variant. (CLAUDE.md / DESIGN_SYSTEM.md)
- **Pills use `radius.full` (999).** Text pill padding: `paddingVertical 6` / `paddingHorizontal 12`, `fontSize 11`, `font.bodySemiBold`.
- **Named exports for components.** One component per file, PascalCase filename.
- **No new i18n keys** — reuse existing `t()` labels already passed at each call site.
- **TypeScript strict** — no `any`, explicit prop interface above the component.
- **Diffuse variant preserves existing treatment:** transparent bg, `dt.colors.line2` border, `diffuseFont.mono`, `textTransform: 'uppercase'`, `letterSpacing 0.8`, `dt.colors.ink3`.
- **Test runner:** `npm test` (jest). Components under test render directly — `useTheme`/`useIsDiffuse` work under Jest without mocking (see `components/home/__tests__/EssentialsWalletCard.test.tsx`).

---

### Task 1: Create the `QuietPill` primitive

**Files:**
- Create: `components/ui/QuietPill.tsx`
- Test: `components/ui/__tests__/QuietPill.test.tsx`

**Interfaces:**
- Consumes: `useTheme`, `useDiffuseTheme`, `diffuseFont`, `radius` from `../../constants/theme`; `useIsDiffuse` from `./diffuse/DiffuseKit`.
- Produces: `export function QuietPill(props: QuietPillProps)` where
  ```ts
  interface QuietPillProps {
    label?: string
    onPress: () => void
    leading?: React.ReactNode
    accessibilityLabel: string
    style?: StyleProp<ViewStyle>
  }
  ```
  Behavior: `label` present → hairline text pill (with optional `leading` icon before the label). `label` omitted → icon-only glyph (renders `leading` only, no border/bg).

- [ ] **Step 1: Write the failing test**

Create `components/ui/__tests__/QuietPill.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native'
import { Text } from 'react-native'
import { QuietPill } from '../QuietPill'

describe('QuietPill', () => {
  it('renders the label when provided', () => {
    const { queryByText } = render(
      <QuietPill label="See results" onPress={() => {}} accessibilityLabel="See results" />,
    )
    expect(queryByText('See results')).toBeTruthy()
  })

  it('renders icon-only (no label text) when label is omitted', () => {
    const { queryByText, getByLabelText } = render(
      <QuietPill
        leading={<Text>ICON</Text>}
        onPress={() => {}}
        accessibilityLabel="Edit"
      />,
    )
    // The glyph form shows the leading node but no pill text.
    expect(queryByText('ICON')).toBeTruthy()
    expect(getByLabelText('Edit')).toBeTruthy()
  })

  it('fires onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByLabelText } = render(
      <QuietPill label="Answer" onPress={onPress} accessibilityLabel="Answer" />,
    )
    fireEvent.press(getByLabelText('Answer'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- QuietPill`
Expected: FAIL — cannot find module `../QuietPill`.

- [ ] **Step 3: Write the primitive**

Create `components/ui/QuietPill.tsx`:

```tsx
/**
 * QuietPill — the shared "quiet" / tertiary action tier (See Results, Answer,
 * Edit). Sits below PillButton (primary 58px CTA) and StickerButton.
 *
 * Two shapes from one prop:
 *  · label present → hairline text pill (optional leading icon before the label)
 *  · label omitted → icon-only glyph (renders `leading` only, no border/bg)
 *
 * Resolves the current (cream-paper) vs Diffuse (v3) variant internally, the
 * same pattern PillButton uses. Never hardcodes tokens.
 */
import React from 'react'
import { Pressable, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont, radius } from '../../constants/theme'
import { useIsDiffuse } from './diffuse/DiffuseKit'

interface QuietPillProps {
  /** Omit for the icon-only glyph form (Edit). */
  label?: string
  onPress: () => void
  /** Optional leading icon. In glyph mode this is the only content. */
  leading?: React.ReactNode
  accessibilityLabel: string
  style?: StyleProp<ViewStyle>
}

export function QuietPill({ label, onPress, leading, accessibilityLabel, style }: QuietPillProps) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  const inkColor = diffuse ? dt.colors.ink3 : colors.textMuted

  // Glyph form — no chrome, just the icon. Bigger hitSlop since it's small.
  if (!label) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }, style]}
      >
        {leading}
      </Pressable>
    )
  }

  // Text pill — hairline in current; transparent + mono-caps in Diffuse.
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.pill,
        {
          borderColor: diffuse ? dt.colors.line2 : colors.border,
          backgroundColor: diffuse ? 'transparent' : colors.surface,
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      {leading}
      <Text
        style={{
          fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold,
          fontSize: 11,
          color: inkColor,
          textTransform: diffuse ? 'uppercase' : 'none',
          letterSpacing: diffuse ? 0.8 : 0,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- QuietPill`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors in `components/ui/QuietPill.tsx`.

- [ ] **Step 6: Commit**

```bash
git add components/ui/QuietPill.tsx components/ui/__tests__/QuietPill.test.tsx
git commit -m "feat(ui): add QuietPill — shared secondary-action tier primitive"
```

---

### Task 2: Swap Cycle summary card (See Results + Edit)

**Files:**
- Modify: `components/home/cycle/CycleTodaySummaryCard.tsx`

**Interfaces:**
- Consumes: `QuietPill` from `../../ui/QuietPill` (Task 1).

- [ ] **Step 1: Add the import**

At the top import block of `components/home/cycle/CycleTodaySummaryCard.tsx`, add:

```tsx
import { QuietPill } from '../../ui/QuietPill'
```

- [ ] **Step 2: Replace the See Results pill + Edit control**

Find the `{!bare ? (` block (the `<>...</>` containing `styles.headerResultsPill` and the `SlidersHorizontal` edit `Pressable`) and replace both `Pressable`s with:

```tsx
          <>
            <QuietPill
              label={t('cycleDash_seeResults')}
              onPress={() => setOpen(true)}
              accessibilityLabel={t('cycleDash_seeResults')}
            />
            <QuietPill
              leading={<SlidersHorizontal size={16} color={chevronColor} strokeWidth={2} />}
              onPress={() => setPickerOpen(true)}
              accessibilityLabel={t('common_edit')}
            />
          </>
```

Leave the `bare` branch (`<ChevronRight .../>`) unchanged.

- [ ] **Step 3: Remove the dead style**

Delete the `headerResultsPill` entry from the `StyleSheet.create` block at the bottom (the line: `headerResultsPill: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },`).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (If `SlidersHorizontal` is now only used in the edit glyph, it's still imported and used — leave the import.)

- [ ] **Step 5: Commit**

```bash
git add components/home/cycle/CycleTodaySummaryCard.tsx
git commit -m "refactor(cycle): use QuietPill for See Results + Edit on summary card"
```

---

### Task 3: Swap Pregnancy summary card (See Results + Edit)

**Files:**
- Modify: `components/home/pregnancy/TodaySummaryCard.tsx`

**Interfaces:**
- Consumes: `QuietPill` from `../../ui/QuietPill` (Task 1).

- [ ] **Step 1: Add the import**

Add to the top import block of `components/home/pregnancy/TodaySummaryCard.tsx`:

```tsx
import { QuietPill } from '../../ui/QuietPill'
```

- [ ] **Step 2: Replace the See Results pill + Edit control**

Find the two `Pressable`s in the header row — the one using `styles.headerResultsPill` (See results) and the `SlidersHorizontal` edit one — and replace both with:

```tsx
        <QuietPill
          label={t('pregnancy_quickLogs_seeResults')}
          onPress={() => setOpen(true)}
          accessibilityLabel={t('pregnancy_quickLogs_seeResults')}
        />
        <QuietPill
          leading={<SlidersHorizontal size={16} color={chevronColor} strokeWidth={2} />}
          onPress={() => setPickerOpen(true)}
          accessibilityLabel={t('common_edit')}
        />
```

- [ ] **Step 3: Remove the dead style**

Delete `headerResultsPill: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },` from `StyleSheet.create`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/home/pregnancy/TodaySummaryCard.tsx
git commit -m "refactor(pregnancy): use QuietPill for See Results + Edit on summary card"
```

---

### Task 4: Swap Kids summary card (See Results + Edit)

**Files:**
- Modify: `components/home/kids/KidsTodaySummaryCard.tsx`

**Interfaces:**
- Consumes: `QuietPill` from `../../ui/QuietPill` (Task 1).

- [ ] **Step 1: Add the import**

Add to the top import block of `components/home/kids/KidsTodaySummaryCard.tsx`:

```tsx
import { QuietPill } from '../../ui/QuietPill'
```

- [ ] **Step 2: Replace the See Results pill + Edit control**

Find the header-row `Pressable` using `styles.headerResultsPill` (routes to `/vault`) and the `SlidersHorizontal` edit `Pressable`, and replace both with:

```tsx
        <QuietPill
          label={t('kids_quickLogs_seeResults')}
          onPress={() => router.push('/vault')}
          accessibilityLabel={t('kids_quickLogs_seeResults')}
        />
        <QuietPill
          leading={<SlidersHorizontal size={16} color={chevronColor} strokeWidth={2} />}
          onPress={() => setPickerOpen(true)}
          accessibilityLabel={t('kids_quickLogs_edit')}
        />
```

- [ ] **Step 3: Remove the dead style**

Delete `headerResultsPill: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },` from `StyleSheet.create`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/home/kids/KidsTodaySummaryCard.tsx
git commit -m "refactor(kids): use QuietPill for See Results + Edit on summary card"
```

---

### Task 5: Swap the Answer / View-all-cards pills in DailyMessageCard

**Files:**
- Modify: `components/home/pregnancy/DailyMessageCard.tsx`

**Interfaces:**
- Consumes: `QuietPill` from `../../ui/QuietPill` (Task 1).

Note: this file is shared by BOTH the Cycle and Pregnancy homes (CycleHome mounts `<DailyMessageCard/>` too), so this one swap standardizes "Answer" in both behaviors at once.

- [ ] **Step 1: Add the import**

Add to the top import block of `components/home/pregnancy/DailyMessageCard.tsx`:

```tsx
import { QuietPill } from '../../ui/QuietPill'
```

- [ ] **Step 2: Replace the Answer pill**

The Answer pill currently sits INSIDE the outer `Pressable onPress={() => setOpen(true)}` (the whole prompt row is tappable). A nested `QuietPill` Pressable must not swallow that tap oddly — since both open the same modal, give the QuietPill the same `onPress`. Replace this block:

```tsx
            <View style={[styles.answerPill, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={[styles.pillText, { color: colors.text }]}>Answer</Text>
            </View>
```

with:

```tsx
            <QuietPill
              label="Answer"
              onPress={() => setOpen(true)}
              accessibilityLabel="Answer"
            />
```

- [ ] **Step 3: Replace the "View all cards" pill**

Replace this block:

```tsx
      {isAnswered ? (
        <Pressable
          onPress={() => router.push('/my-cards')}
          style={({ pressed }) => [styles.pill, { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.pillText, { color: colors.text }]}>View all cards</Text>
        </Pressable>
      ) : null}
```

with:

```tsx
      {isAnswered ? (
        <QuietPill
          label="View all cards"
          onPress={() => router.push('/my-cards')}
          accessibilityLabel="View all cards"
          style={{ alignSelf: 'flex-start', marginTop: 16 }}
        />
      ) : null}
```

- [ ] **Step 4: Remove the dead styles**

From `StyleSheet.create` delete these three entries: `answerPill`, `pill`, and `pillText`. Keep `flex`, `prompt`, `promptRow`, `promptFlex`, `answeredRow` (still used).

- [ ] **Step 5: Verify remaining imports**

`Pressable` is still used (the outer prompt wrapper). `Text` may now be unused — if so, remove `Text` from the `react-native` import. Run `npx tsc --noEmit` and remove any now-unused import it flags.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/home/pregnancy/DailyMessageCard.tsx
git commit -m "refactor(home): use QuietPill for Answer + View-all-cards in DailyMessageCard"
```

---

### Task 6: Swap the wallet Edit controls to icon-only QuietPill

**Files:**
- Modify: `components/home/cycle/CycleWallet.tsx`
- Modify: `components/home/pregnancy/WeekWallet.tsx`
- Modify: `components/home/KidsWallet.tsx`

**Interfaces:**
- Consumes: `QuietPill` from the correct relative path (`../../ui/QuietPill` for CycleWallet & WeekWallet; `../ui/QuietPill` for KidsWallet — it lives one level up in `components/home/`).

This task drops the "EDIT" text label from CycleWallet + WeekWallet (they become icon-only, matching KidsWallet and the summary cards).

- [ ] **Step 1: CycleWallet — add import + swap**

In `components/home/cycle/CycleWallet.tsx` add `import { QuietPill } from '../../ui/QuietPill'`. Replace the edit `Pressable` block:

```tsx
        <Pressable onPress={() => setPickerOpen(true)} hitSlop={10} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: pressed ? 0.6 : 1 }]}>
          <SlidersHorizontal size={14} color={editColor} strokeWidth={2} />
          <Text style={{ fontFamily: diffuse ? diffuseFont.mono : undefined, fontSize: 11, letterSpacing: diffuse ? 0.8 : 0, textTransform: diffuse ? 'uppercase' : 'none', color: editColor }}>
            {t('kids_quickLogs_edit')}
          </Text>
        </Pressable>
```

with:

```tsx
        <QuietPill
          leading={<SlidersHorizontal size={16} color={editColor} strokeWidth={2} />}
          onPress={() => setPickerOpen(true)}
          accessibilityLabel={t('kids_quickLogs_edit')}
        />
```

- [ ] **Step 2: WeekWallet — add import + swap**

In `components/home/pregnancy/WeekWallet.tsx` add `import { QuietPill } from '../../ui/QuietPill'`. Replace the identical edit `Pressable` block (same code as Step 1's "before") with the same `QuietPill` (Step 1's "after").

- [ ] **Step 3: KidsWallet — add import + swap**

In `components/home/KidsWallet.tsx` add `import { QuietPill } from '../ui/QuietPill'`. Replace the edit `Pressable` block:

```tsx
        <Pressable onPress={() => setPickerOpen(true)} hitSlop={12} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} accessibilityRole="button" accessibilityLabel={t('kids_quickLogs_edit')}>
          <SlidersHorizontal size={16} color={editColor} strokeWidth={2} />
        </Pressable>
```

with:

```tsx
        <QuietPill
          leading={<SlidersHorizontal size={16} color={editColor} strokeWidth={2} />}
          onPress={() => setPickerOpen(true)}
          accessibilityLabel={t('kids_quickLogs_edit')}
        />
```

- [ ] **Step 4: Remove now-unused imports**

In CycleWallet and WeekWallet, `Text` and possibly `diffuseFont` may no longer be used in the edit control — but both are likely still used elsewhere in each file. Run `npx tsc --noEmit` and remove ONLY imports it flags as unused. Do not blind-delete.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors across all three files.

- [ ] **Step 6: Commit**

```bash
git add components/home/cycle/CycleWallet.tsx components/home/pregnancy/WeekWallet.tsx components/home/KidsWallet.tsx
git commit -m "refactor(wallets): icon-only QuietPill for Edit across cycle/pregnancy/kids"
```

---

### Task 7: Full-suite verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all pass, including the new `QuietPill` tests. No snapshot failures (this repo has no snapshot tests for these cards).

- [ ] **Step 2: Full typecheck**

Run: `npx tsc --noEmit`
Expected: clean (no errors introduced by this work).

- [ ] **Step 3: Grep for leftover dead styles**

Run: `grep -rn "headerResultsPill\|answerPill\|pillText" components/`
Expected: NO matches (all removed). If any remain, remove them and re-commit.

- [ ] **Step 4: Grep for stray hand-styled quiet pills**

Run: `grep -rn "kids_quickLogs_edit\|seeResults" components/home/`
Expected: every match is now inside a `QuietPill` call, not a raw `Pressable`.

- [ ] **Step 5: Commit (only if Step 3/4 required cleanup)**

```bash
git add -A
git commit -m "chore(home): remove leftover quiet-pill dead styles"
```

---

## Self-Review

**Spec coverage:**
- QuietPill primitive (current + Diffuse) → Task 1. ✓
- See Results swapped in all 3 summary cards → Tasks 2, 3, 4. ✓
- Answer → hairline; View all cards folded in → Task 5. ✓
- Edit → icon-only everywhere (summary cards via Tasks 2–4; wallets via Task 6). ✓
- Dead style removal (`headerResultsPill`/`answerPill`/`pillText`) → Tasks 2–5 + Task 7 grep. ✓
- Both design variants → handled inside QuietPill (Task 1); consumers pass tokens. ✓
- No new i18n keys → all call sites reuse existing `t()` labels. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; no "handle edge cases" hand-waves. ✓

**Type consistency:** `QuietPillProps` (`label?`, `onPress`, `leading?`, `accessibilityLabel`, `style?`) is used identically in Tasks 2–6. The icon-only form always passes `leading` + `accessibilityLabel` with no `label`; the text form always passes `label` + `accessibilityLabel`. ✓

**Note on literal strings:** "Answer" and "View all cards" were hardcoded in the original DailyMessageCard (not `t()` keys), so the plan preserves them verbatim rather than inventing i18n keys — matching existing behavior and the "no new keys" constraint. A future i18n wave can extract them.
