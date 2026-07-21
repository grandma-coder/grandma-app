# Quick-Log Picker Fit + Pinned SAVE + Distinct Cycle Icons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home quick-log picker fit its now-long list — pin the SAVE button so it's never clipped, moderately compact the rows, and give the cycle picker distinct per-row icons (it currently reuses one droplet for 9 rows).

**Architecture:** Add an optional pinned `footer` slot to the shared `LogSheet` (rendered as a sibling after its ScrollView, in both current + Diffuse variants). Move each of the 3 pickers' SAVE button into that footer and compact the shared row style. Replace the cycle picker's decorative `Drop/Heart/Smiley` icons with the calendar's purpose-built `logSticker()` glyphs (distinct, calendar-matching), with closest-fit stand-ins for the 3 Phase-2 types.

**Tech Stack:** React Native 0.81, Expo SDK 54, TypeScript strict, lucide-react-native. Design tokens from `constants/theme.ts`.

## Global Constraints

- **Design tokens only** — no hardcoded hex/radius/font. Use `useTheme()`/`useSafeAreaInsets()`/`radius`.
- **`LogSheet` footer must be backward-compatible** — every existing consumer (all log forms) passes NO `footer`; their layout must be byte-unchanged.
- **Compact row values (apply IDENTICALLY in all 3 pickers):** `row.paddingVertical: 10`, `row.gap: 12`, `socket: 36×36` (borderRadius 18), inner glyph `size: 22`, `checkbox: 24` (unchanged), `row.borderRadius: radius.lg`, between-rows list `gap: 10`.
- **Toggle unchanged** — the 24px `checkbox` circle + full-row `Pressable` stay exactly as-is.
- **Cycle title bug** — the cycle picker currently passes `title={t('pregnancy_quickLogs_pickTitle')}` (copy-paste artifact); fix to a cycle-appropriate key.
- **Typecheck:** `npm run typecheck` (this repo wraps tsc; ignore any pre-existing errors in files this plan doesn't touch — confirm via `git stash` if unsure).
- **Tests:** `npm test`.
- **Work on `main`**; stage ONLY each task's files (a concurrent workstream is active — never `git add -A`). A task's review BASE is its commit's actual parent (`git rev-parse <commit>^`), which may be a concurrent commit.

---

### Task 1: Add an optional pinned footer to `LogSheet`

**Files:**
- Modify: `components/calendar/LogSheet.tsx`

**Interfaces:**
- Produces: `LogSheetProps` gains `footer?: ReactNode`. When passed, it renders pinned at the bottom of the sheet (below the scroll area, above the safe-area padding), in both `CurrentLogSheet` and `DiffuseLogSheet`. When omitted, the sheet renders exactly as before.

- [ ] **Step 1: Add the prop to the interface**

In `components/calendar/LogSheet.tsx`, add to `LogSheetProps` (after `titleRight`):

```tsx
  /** Optional pinned action bar rendered below the scroll area (not scrolled).
   *  Used by the quick-log pickers to keep SAVE always visible. */
  footer?: ReactNode
```

- [ ] **Step 2: Destructure + render footer in CurrentLogSheet**

In `CurrentLogSheet`, add `footer` to the destructured props. Then, immediately AFTER the `</ScrollView>` and still inside the `styles.sheet` `<View>`, add:

```tsx
          {footer ? (
            <View style={[styles.footer, { borderTopColor: paperBorder }]}>
              {footer}
            </View>
          ) : null}
```

- [ ] **Step 3: Destructure + render footer in DiffuseLogSheet**

In `DiffuseLogSheet`, add `footer` to the destructured props. After its `</ScrollView>`, inside `styles.sheet`, add (using the Diffuse hairline token):

```tsx
          {footer ? (
            <View style={[styles.footer, { borderTopColor: colors.hairline }]}>
              {footer}
            </View>
          ) : null}
```

- [ ] **Step 4: Add the footer style**

In the `styles` `StyleSheet.create`, add:

```tsx
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
```

(No `paddingBottom` — the sheet's own `paddingBottom: insets.bottom + 16` already provides safe-area spacing below the footer.)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no new errors. `ReactNode` is already imported (line 8) — confirm; if not, add it to the `react` import.

- [ ] **Step 6: Commit**

```bash
git add components/calendar/LogSheet.tsx
git commit -m "feat(ui): add optional pinned footer slot to LogSheet"
```

---

### Task 2: Kids picker — SAVE into footer + compact rows

**Files:**
- Modify: `components/home/kids/KidsQuickLogPicker.tsx`

**Interfaces:**
- Consumes: `LogSheet`'s new `footer` prop (Task 1).

- [ ] **Step 1: Move SAVE into the footer + drop the trailing block**

In `components/home/kids/KidsQuickLogPicker.tsx`, change the `<LogSheet>` open tag to pass the button as `footer`, and remove the trailing `saveWrap` `<View>`. Replace the whole `return (...)` JSX from `<LogSheet ...>` through `</LogSheet>` with:

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
      <View style={{ gap: 10 }}>
        {KIDS_QUICK_LOGS.map((q) => {
          const on = draft.includes(q.key)
          const c = characterFor(q.key, stickers)
          return (
            <Pressable
              key={q.key}
              onPress={() => toggleDraft(q.key)}
              style={({ pressed }) => [
                styles.row,
                { borderColor: on ? colors.text : colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={[styles.socket, { backgroundColor: c.soft }]}>
                <Character name={c.name} size={22} color={c.hue} />
              </View>
              <Body size={16} color={colors.text} style={{ flex: 1 }}>{t(q.labelKey)}</Body>
              <View style={[styles.checkbox, { borderColor: on ? colors.text : colors.border, backgroundColor: on ? colors.text : 'transparent' }]}>
                {on ? <Check size={14} color={colors.bg} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          )
        })}
      </View>
    </LogSheet>
```

(Note: `Character` size `24 → 22`; SAVE moved to `footer`; `saveWrap` View removed.)

- [ ] **Step 2: Compact the row styles + drop saveWrap**

Replace the `styles` `StyleSheet.create` with:

```tsx
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 16 },
  socket: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
})
```

(`saveWrap` deleted; `row` padding 14→10, gap 14→12; `socket` 42→36.)

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/home/kids/KidsQuickLogPicker.tsx
git commit -m "feat(kids): pin SAVE + compact rows in quick-log picker"
```

---

### Task 3: Pregnancy picker — SAVE into footer + compact rows

**Files:**
- Modify: `components/home/pregnancy/QuickLogPicker.tsx`

**Interfaces:**
- Consumes: `LogSheet`'s `footer` prop (Task 1).

- [ ] **Step 1: Move SAVE into the footer + drop the trailing block**

In `components/home/pregnancy/QuickLogPicker.tsx`, replace the `return (...)` JSX from `<LogSheet ...>` through `</LogSheet>` with:

```tsx
    <LogSheet
      visible={visible}
      title={t('pregnancy_quickLogs_pickTitle')}
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
      <View style={{ gap: 10 }}>
        {available.map((q) => {
          const on = draft.includes(q.key)
          const s = stickerFor(q.key, themeStickers)
          return (
            <Pressable
              key={q.key}
              onPress={() => toggleDraft(q.key)}
              style={({ pressed }) => [
                styles.row,
                { borderColor: on ? colors.text : colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={[styles.socket, { backgroundColor: s.soft }]}>{s.node}</View>
              <Body size={16} color={colors.text} style={{ flex: 1 }}>{t(q.labelKey)}</Body>
              <View style={[styles.checkbox, { borderColor: on ? colors.text : colors.border, backgroundColor: on ? colors.text : 'transparent' }]}>
                {on ? <Check size={14} color={colors.bg} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          )
        })}
      </View>
    </LogSheet>
```

- [ ] **Step 2: Shrink the sticker size in `stickerFor` (24 → 22)**

In this file's `stickerFor` function, change every `size={24}` to `size={22}` (all 15 cases + the default). These are inline `Log*`/`MoodFace` sticker sizes. (A find-replace of `size={24}` → `size={22}` within `stickerFor` is safe — no other `size={24}` exists in this file.)

- [ ] **Step 3: Compact the row styles + drop saveWrap**

Replace the `styles` `StyleSheet.create` with:

```tsx
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 16 },
  socket: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
})
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add components/home/pregnancy/QuickLogPicker.tsx
git commit -m "feat(pregnancy): pin SAVE + compact rows in quick-log picker"
```

---

### Task 4: Cycle picker — SAVE into footer, compact rows, distinct icons, title fix

**Files:**
- Modify: `components/home/cycle/CycleQuickLogPicker.tsx`

**Interfaces:**
- Consumes: `LogSheet`'s `footer` prop (Task 1); `logSticker` from `components/calendar/logStickers.tsx`; `Log*` components from `components/stickers/RewardStickers`.

Context: the cycle picker's default path currently reuses one `Drop` for 9 rows / one `Heart` for 4. This task swaps to the calendar's distinct `logSticker()` glyphs (keyed by each row's `sheet`), overrides the 3 Phase-2 types that `logSticker` leaves as placeholders, and remaps the Diffuse `CYCLE_LOG_META` chars to remove collisions.

- [ ] **Step 1: Update imports**

Replace the icon-related imports. Remove `import { Drop, Heart, Smiley } from '../../ui/Stickers'` and add:

```tsx
import { logSticker } from '../../calendar/logStickers'
import { LogExamResult, LogNesting, LogKegel } from '../../stickers/RewardStickers'
import { useTheme, radius } from '../../../constants/theme'
```

(Keep the existing `Character`, `CharacterName`, `useIsDiffuse` imports — the Diffuse path still uses them. `useTheme`/`radius` line already exists; don't duplicate — only add what's missing.)

VERIFY `LogExamResult`, `LogNesting`, `LogKegel` are exported from `components/stickers/RewardStickers.tsx` (they are used by the pregnancy picker, so they exist). If a name differs, use the real export.

- [ ] **Step 2: Remap the Diffuse `CYCLE_LOG_META` chars to remove collisions**

Replace the `CYCLE_LOG_META` object with (collision-free `char` values; hues/softs adjusted so period_start/period_end differ):

```tsx
const CYCLE_LOG_META: Record<string, { char: CharacterName; hue: keyof ReturnType<typeof useTheme>['stickers']; soft: keyof ReturnType<typeof useTheme>['stickers'] }> = {
  mood:           { char: 'mood',        hue: 'yellow', soft: 'yellowSoft' },
  symptoms:       { char: 'warning',     hue: 'pink',   soft: 'pinkSoft' },
  bbt:            { char: 'temperature', hue: 'blue',   soft: 'blueSoft' },
  lh:             { char: 'ovulation',   hue: 'yellow', soft: 'yellowSoft' },
  cm:             { char: 'cloud',       hue: 'green',  soft: 'greenSoft' },
  intimacy:       { char: 'heart',       hue: 'coral',  soft: 'peachSoft' },
  period_start:   { char: 'period',      hue: 'coral',  soft: 'peachSoft' },
  period_end:     { char: 'period',      hue: 'pink',   soft: 'pinkSoft' },
  pregnancy_test: { char: 'exam',        hue: 'yellow', soft: 'yellowSoft' },
  sex_drive:      { char: 'sparkle',     hue: 'pink',   soft: 'pinkSoft' },
  clots:          { char: 'contraction', hue: 'coral',  soft: 'peachSoft' },
  weight:         { char: 'growth',      hue: 'peach',  soft: 'peachSoft' },
  water:          { char: 'water',       hue: 'blue',   soft: 'blueSoft' },
  activity:       { char: 'activity',    hue: 'green',  soft: 'greenSoft' },
}
```

VERIFY each `char` (`warning`, `ovulation`, `cloud`, `exam`, `sparkle`, `contraction`, `growth`, plus existing) is a valid `CharacterName` in `components/characters/Characters.tsx` (all confirmed present in the inventory). If one isn't, substitute the closest and note it.

- [ ] **Step 3: Rewrite `stickerFor` to use distinct calendar glyphs (default path)**

Replace the entire `stickerFor` function with:

```tsx
// The 3 Phase-2 signals that logSticker() renders with a shared placeholder
// (pregnancy_test/sex_drive/clots all reuse ovulation/intimacy/period). Give
// them distinct existing Log* stand-ins so no two picker rows share a glyph.
const CYCLE_ICON_OVERRIDE: Record<string, React.ComponentType<{ size?: number; fill?: string }>> = {
  pregnancy_test: LogExamResult,
  sex_drive: LogKegel,
  clots: LogNesting,
}

function stickerFor(
  key: string,
  sheet: string,
  stickers: ReturnType<typeof useTheme>['stickers'],
  isDark: boolean,
  diffuse: boolean,
): { node: React.ReactNode; soft: string } {
  const meta = CYCLE_LOG_META[key] ?? CYCLE_LOG_META.mood
  const soft = stickers[meta.soft]
  if (diffuse) {
    return { node: <Character name={meta.char} size={22} color={stickers[meta.hue]} />, soft }
  }
  const Override = CYCLE_ICON_OVERRIDE[key]
  if (Override) {
    return { node: <Override size={22} fill={stickers[meta.hue]} />, soft }
  }
  // Default: reuse the calendar's purpose-built glyph for this sheet type,
  // so the picker matches the calendar and 11/14 rows are already distinct.
  return { node: logSticker(sheet, 22, isDark), soft }
}
```

- [ ] **Step 4: Update the call site + component signature for the new `stickerFor` args**

In the `CycleQuickLogPicker` component: it already destructures `const { colors, stickers: themeStickers } = useTheme()` and `const diffuse = useIsDiffuse()`. Add `isDark`:

```tsx
  const { colors, stickers: themeStickers, isDark } = useTheme()
```

Then update the call inside the `.map`:

```tsx
          const s = stickerFor(q.key, q.sheet, themeStickers, isDark, diffuse)
```

(`q.sheet` is the `logSticker` type key — every `CYCLE_QUICK_LOGS` entry has it.)

- [ ] **Step 5: Move SAVE into footer, compact rows, fix the title**

Replace the `return (...)` JSX from `<LogSheet ...>` through `</LogSheet>` with (note the title fix — `cycleLog_pickTitle` instead of the pregnancy key):

```tsx
    <LogSheet
      visible={visible}
      title={t('cycleLog_pickTitle')}
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
      <View style={{ gap: 10 }}>
        {CYCLE_QUICK_LOGS.map((q) => {
          const on = draft.includes(q.key)
          const s = stickerFor(q.key, q.sheet, themeStickers, isDark, diffuse)
          return (
            <Pressable
              key={q.key}
              onPress={() => toggleDraft(q.key)}
              style={({ pressed }) => [
                styles.row,
                { borderColor: on ? colors.text : colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={[styles.socket, { backgroundColor: s.soft }]}>{s.node}</View>
              <Body size={16} color={colors.text} style={{ flex: 1 }}>{t(q.labelKey)}</Body>
              <View style={[styles.checkbox, { borderColor: on ? colors.text : colors.border, backgroundColor: on ? colors.text : 'transparent' }]}>
                {on ? <Check size={14} color={colors.bg} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          )
        })}
      </View>
    </LogSheet>
```

`cycleLog_pickTitle` should exist (used by CycleHome's month picker — `t('cycleLog_pickDay')` is nearby; verify `cycleLog_pickTitle` exists, else reuse `kids_quickLogs_pickTitle` or add a `cycleLog_pickTitle` key to `keys.ts` + all 12 locale files with "What do you want to track?" / localized fallback). If unsure which exists, run typecheck — an invalid `t()` key errors.

- [ ] **Step 6: Compact the row styles + drop saveWrap**

Replace the `styles` `StyleSheet.create` with:

```tsx
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 16 },
  socket: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
})
```

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: no new errors. Resolve any invalid `t()` key (Step 5) or `CharacterName`/`Log*` name (Steps 1–2) it flags.

- [ ] **Step 8: Commit**

```bash
git add components/home/cycle/CycleQuickLogPicker.tsx lib/i18n/keys.ts lib/i18n/en.ts
git commit -m "feat(cycle): pin SAVE, compact rows, distinct per-row icons in quick-log picker"
```

(Include the i18n files only if Step 5 required adding a `cycleLog_pickTitle` key — otherwise just the picker.)

---

### Task 5: Verification

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: clean, or only pre-existing errors in files this plan didn't touch (confirm any error's file is NOT one of: LogSheet.tsx, the 3 pickers).

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: all pass (this is UI layout/icon work; no test logic changes — the existing suite incl. `quickLogParity` stays green).

- [ ] **Step 3: Grep — SAVE is now a footer, not a scrolled child**

Run: `grep -n "saveWrap" components/home/kids/KidsQuickLogPicker.tsx components/home/pregnancy/QuickLogPicker.tsx components/home/cycle/CycleQuickLogPicker.tsx`
Expected: NO matches (all three moved SAVE to `footer`).

- [ ] **Step 4: Grep — cycle no longer uses the decorative droplet reuse**

Run: `grep -n "from '../../ui/Stickers'" components/home/cycle/CycleQuickLogPicker.tsx`
Expected: NO match (swapped to `logSticker` + `Log*`).

- [ ] **Step 5: Grep — LogSheet footer wired in both variants**

Run: `grep -c "footer" components/calendar/LogSheet.tsx`
Expected: ≥ 4 (prop decl + 2 render sites + style).

- [ ] **Step 6: Commit (only if a step required cleanup)**

```bash
git add -A
git commit -m "chore: quick-log picker fit cleanup"
```
(Prefer staging specific files; only use `-A` if you've confirmed no concurrent-workstream files are staged.)

---

## Self-Review

**Spec coverage:**
- Pinned SAVE → `LogSheet.footer` (Task 1) + moved in all 3 pickers (Tasks 2–4). ✓
- Compact rows → identical style change in Tasks 2, 3, 4. ✓
- Distinct cycle icons → Task 4 (default path via `logSticker` + 3 overrides; Diffuse path via remapped `CYCLE_LOG_META`). ✓
- Toggle unchanged → checkbox style untouched in all tasks. ✓
- Backward-compatible LogSheet → footer optional, only rendered when passed (Task 1 Steps 2–3). ✓
- Cycle title bug fixed → Task 4 Step 5. ✓
- No hardcoded tokens → all values from `radius`/`stickers`/theme. ✓

**Placeholder scan:** No TBDs. Every code step shows full code. The "verify the name exists" instructions (glyph/i18n) are bounded verification with named fallbacks, not hand-waves.

**Type consistency:** `stickerFor` in Task 4 changes signature to `(key, sheet, stickers, isDark, diffuse)`; the call site is updated in the same task (Steps 4 & 5 both show `stickerFor(q.key, q.sheet, themeStickers, isDark, diffuse)`). Kids/pregnancy `stickerFor`/`characterFor` signatures are unchanged (only glyph `size` shrinks). `footer` prop type (`ReactNode`) is consistent between Task 1 (definition) and Tasks 2–4 (usage passes a `<PillButton>` element).

**Note on the compact values:** the spec's Global Constraints and every picker task use the same numbers (paddingVertical 10, gap 12, socket 36/18, glyph 22, checkbox 24) — verified identical across Tasks 2/3/4.
