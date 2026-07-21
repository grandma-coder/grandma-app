# Quick-Log Picker Fit + Pinned SAVE + Distinct Cycle Icons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home quick-log picker fit its now-long list — pin the SAVE button so it's never clipped, moderately compact the rows, and give the cycle picker distinct per-row icons (it currently reuses one droplet for 9 rows).

**Architecture:** Add an optional pinned `footer` slot to the shared `LogSheet` (rendered as a sibling after its ScrollView, in both current + Diffuse variants). Move the kids + cycle pickers' SAVE button into that footer and compact the shared row style. Replace the cycle picker's decorative `Drop/Heart/Smiley` icons with the shared canonical **`DIFFUSE_LOG_CHARACTER` blob map** (`blobFor(logType)` using `diffuseLogHue`/`diffuseLogSoftHue` from `DiffuseLogTimeline`) — the SAME icon system a concurrent workstream is applying to the pregnancy picker, so all pickers stay consistent. Distinctness comes from concept blob + hue (period_start coral vs period_end pink, etc.).

> **CONCURRENCY NOTE (read before starting):** A concurrent workstream has UNCOMMITTED edits in the working tree to `components/home/pregnancy/QuickLogPicker.tsx` (rewriting its icons to `blobFor`), `components/calendar/DiffuseLogTimeline.tsx` (the shared blob helpers), `components/home/cycle/CycleTodaySummaryCard.tsx`, `CycleHome.tsx`, and relabeled `lib/pregnancyQuickLogs.ts`. **The pregnancy picker task is DROPPED** — they own that file; do not touch it. Every task stages ONLY its own file(s) and must NEVER `git add -A` (that would sweep in their WIP). Cycle picker (`CycleQuickLogPicker.tsx`) and `LogSheet.tsx` are currently clean/uncontended.

**Tech Stack:** React Native 0.81, Expo SDK 54, TypeScript strict, lucide-react-native. Design tokens from `constants/theme.ts`.

## Global Constraints

- **Design tokens only** — no hardcoded hex/radius/font. Use `useTheme()`/`useSafeAreaInsets()`/`radius`.
- **`LogSheet` footer must be backward-compatible** — every existing consumer (all log forms) passes NO `footer`; their layout must be byte-unchanged.
- **Compact row values (apply IDENTICALLY in the kids + cycle pickers):** `row.paddingVertical: 10`, `row.gap: 12`, `socket: 36×36` (borderRadius 18), inner glyph `size: 22`, `checkbox: 24` (unchanged), `row.borderRadius: radius.lg`, between-rows list `gap: 10`.
- **Toggle unchanged** — the 24px `checkbox` circle + full-row `Pressable` stay exactly as-is.
- **Cycle title bug** — the cycle picker currently passes `title={t('pregnancy_quickLogs_pickTitle')}` (copy-paste artifact); fix to a cycle-appropriate key.
- **Cycle icons use the shared blob map** — NOT `logSticker()`. Use `blobFor(logType)` built on `DIFFUSE_LOG_CHARACTER` + `diffuseLogHue` + `diffuseLogSoftHue` from `components/calendar/DiffuseLogTimeline` (already exports these; already covers every cycle type). This matches the concurrent pregnancy-picker rewrite. Do NOT add `logSticker`/`Log*`/`CYCLE_ICON_OVERRIDE` — that earlier approach is superseded.
- **Pregnancy picker DROPPED** — owned by the concurrent workstream (uncommitted). Do not touch `components/home/pregnancy/QuickLogPicker.tsx` or `lib/pregnancyQuickLogs.ts`.
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

### Task 3: Cycle picker — SAVE into footer, compact rows, shared blob icons, title fix

**Files:**
- Modify: `components/home/cycle/CycleQuickLogPicker.tsx`

**Interfaces:**
- Consumes: `LogSheet`'s `footer` prop (Task 1); `DIFFUSE_LOG_CHARACTER`, `diffuseLogHue`, `diffuseLogSoftHue` from `components/calendar/DiffuseLogTimeline`; `Character` from `components/characters/Characters`.

Context: the cycle picker's default path currently reuses ONE `Drop` glyph for 9 rows / ONE `Heart` for 4 (differentiated only by fill color), and its Diffuse path uses a local `CYCLE_LOG_META` with its own collisions. This task deletes BOTH local icon paths and replaces them with a single `blobFor(logType)` — the exact shared-canonical-map approach the concurrent workstream is applying to the pregnancy picker, so both pickers read identically. `DIFFUSE_LOG_CHARACTER` already maps every cycle type; distinctness comes from concept blob + `diffuseLogHue`.

- [ ] **Step 1: Replace the icon imports**

In `components/home/cycle/CycleQuickLogPicker.tsx`:
- REMOVE `import { Drop, Heart, Smiley } from '../../ui/Stickers'`.
- REMOVE the `useIsDiffuse` import IF it becomes unused after Step 3 (it will — the new path is variant-agnostic; but confirm via typecheck before deleting).
- KEEP `import { Character, type CharacterName } from '../../characters/Characters'`.
- ADD:

```tsx
import { DIFFUSE_LOG_CHARACTER, diffuseLogHue, diffuseLogSoftHue } from '../../calendar/DiffuseLogTimeline'
```

VERIFY these three symbols are exported from `components/calendar/DiffuseLogTimeline.tsx` (they are — `DIFFUSE_LOG_CHARACTER` is a `Record<string, CharacterName>`, `diffuseLogHue`/`diffuseLogSoftHue` are `(type: string) => string`).

- [ ] **Step 2: Delete `CYCLE_LOG_META` and rewrite `stickerFor` → `blobFor`**

DELETE the entire `CYCLE_LOG_META` object AND the entire `stickerFor` function. Replace both with a single `blobFor` keyed by the row's `logType`/`sheet` (mirrors the pregnancy picker's `blobFor`):

```tsx
// Each cycle def → its Character concept-blob + soft socket tint, pulled from
// the SHARED canonical map the Diffuse variant + calendar timeline use (keyed by
// the def's cycle log type). One source of truth = the picker, the home card,
// and the calendar all show the same icon; distinctness is concept + hue.
function blobFor(logType: string): { node: React.ReactElement; soft: string } {
  const hue = diffuseLogHue(logType)
  return {
    node: <Character name={DIFFUSE_LOG_CHARACTER[logType] ?? 'note'} size={22} color={hue} />,
    soft: diffuseLogSoftHue(logType),
  }
}
```

Note: the cycle `logType` key each row uses is `q.sheet` (every `CYCLE_QUICK_LOGS` entry has a `sheet` field that IS the `DIFFUSE_LOG_CHARACTER` key — e.g. `basal_temp`, `lh`, `cm`, `period_start`, `pregnancy_test`, `sex_drive`, `clots`). All are present in `DIFFUSE_LOG_CHARACTER`, so `?? 'note'` is just a safety fallback.

- [ ] **Step 3: Update the component body + call site**

In `CycleQuickLogPicker`:
- The `useTheme()` destructure can drop `stickers` if now unused (the new path gets hue from `diffuseLogHue`, not `themeStickers`); keep `colors`. Confirm via typecheck — if `themeStickers` is referenced nowhere else, remove it and the `const diffuse = useIsDiffuse()` line.
- Change the `.map` call site from `const s = stickerFor(q.key, themeStickers, diffuse)` to:

```tsx
          const s = blobFor(q.sheet)
```

- [ ] **Step 4: Move SAVE into footer, compact rows, fix the title**

Replace the `return (...)` JSX from `<LogSheet ...>` through `</LogSheet>` with (note the title fix — `cycleLog_pickTitle` replaces the wrong `pregnancy_quickLogs_pickTitle`):

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
          const s = blobFor(q.sheet)
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

VERIFY `cycleLog_pickTitle` exists in `lib/i18n/keys.ts`/`en.ts` (nearby keys: `cycleLog_pickDay`, `cycleLog_todayTitle`). If it does NOT exist, add `cycleLog_pickTitle` to `keys.ts` + ALL 12 locale files (English fallback "What do you want to track?") — every locale is typed against `TranslationKeys`, so en-only fails typecheck. If unsure, run typecheck: an invalid `t()` key errors.

- [ ] **Step 5: Compact the row styles + drop saveWrap**

Replace the `styles` `StyleSheet.create` with:

```tsx
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 16 },
  socket: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
})
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no new errors. Remove any import/var (`Drop`/`Heart`/`Smiley`, `useIsDiffuse`, `themeStickers`, `CharacterName` if now unused) that typecheck flags as unused. Resolve any invalid `t()` key (Step 4).

- [ ] **Step 7: Commit**

```bash
git add components/home/cycle/CycleQuickLogPicker.tsx
git commit -m "feat(cycle): pin SAVE, compact rows, shared blob icons in quick-log picker"
```

(If Step 4 required adding `cycleLog_pickTitle`, also `git add lib/i18n/keys.ts lib/i18n/en.ts lib/i18n/ar.ts lib/i18n/de.ts lib/i18n/es.ts lib/i18n/fr.ts lib/i18n/hi.ts lib/i18n/it.ts lib/i18n/ja.ts lib/i18n/ko.ts lib/i18n/pt-BR.ts lib/i18n/tr.ts lib/i18n/zh.ts` — stage them individually, never `-A`.)

---

### Task 4: Verification

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: clean, or only pre-existing errors in files this plan didn't touch (confirm any error's file is NOT `LogSheet.tsx`, `KidsQuickLogPicker.tsx`, or `CycleQuickLogPicker.tsx`). Note: the concurrent workstream's uncommitted pregnancy-picker edits may show unrelated errors — those are theirs, not ours.

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: all pass (UI layout/icon work; no test logic changes — existing suite incl. `quickLogParity` stays green).

- [ ] **Step 3: Grep — SAVE is a footer, not a scrolled child (our 2 pickers)**

Run: `grep -n "saveWrap" components/home/kids/KidsQuickLogPicker.tsx components/home/cycle/CycleQuickLogPicker.tsx`
Expected: NO matches (both moved SAVE to `footer`).

- [ ] **Step 4: Grep — cycle dropped the decorative droplet reuse + uses the shared map**

Run: `grep -n "from '../../ui/Stickers'\|stickerFor\|CYCLE_LOG_META" components/home/cycle/CycleQuickLogPicker.tsx`
Expected: NO matches. And `grep -n "blobFor\|DIFFUSE_LOG_CHARACTER" components/home/cycle/CycleQuickLogPicker.tsx` → matches present.

- [ ] **Step 5: Grep — LogSheet footer wired in both variants**

Run: `grep -c "footer" components/calendar/LogSheet.tsx`
Expected: ≥ 4 (prop decl + 2 render sites + style).

- [ ] **Step 6: Commit (only if a step required cleanup)**

Stage specific files only; never `git add -A` (concurrent WIP in tree).

---

## Self-Review

**Spec coverage:**
- Pinned SAVE → `LogSheet.footer` (Task 1) + moved in kids + cycle pickers (Tasks 2, 3). Pregnancy picker's SAVE-in-footer is deferred to the concurrent stream that owns that file. ✓
- Compact rows → identical style change in Tasks 2 and 3. ✓
- Distinct cycle icons → Task 3, via the shared `blobFor`/`DIFFUSE_LOG_CHARACTER` map (concept blob + hue), matching the concurrent pregnancy rewrite. ✓
- Toggle unchanged → checkbox style untouched in all tasks. ✓
- Backward-compatible LogSheet → footer optional, only rendered when passed (Task 1 Steps 2–3). ✓
- Cycle title bug fixed → Task 3 Step 4. ✓
- No hardcoded tokens → hues/softs come from `diffuseLogHue`/`diffuseLogSoftHue`; radii from `radius`. ✓
- Concurrency safety → pregnancy picker untouched; every task stages only its own files. ✓

**Placeholder scan:** No TBDs. Every code step shows full code. The "verify the symbol/key exists" instructions are bounded verification with named fallbacks, not hand-waves.

**Type consistency:** `blobFor(logType: string)` is defined and called identically in Task 3 (Steps 2, 3, 4 all use `blobFor(q.sheet)`). It returns `{ node: React.ReactElement; soft: string }` — same shape the old `stickerFor` returned, so the `<View style={[styles.socket, { backgroundColor: s.soft }]}>{s.node}</View>` render is unchanged. `footer` prop type (`ReactNode`) is consistent between Task 1 (definition) and Tasks 2–3 (usage passes a `<PillButton>` element).

**Note on the compact values:** kids (Task 2) and cycle (Task 3) use the same numbers (paddingVertical 10, gap 12, socket 36/18, glyph 22, checkbox 24) — verified identical.
