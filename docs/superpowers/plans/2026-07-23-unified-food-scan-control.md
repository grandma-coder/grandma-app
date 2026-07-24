# Unified Food-Scan Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inconsistent, multi-entry food-photo controls in the two food-scan forms with one shared two-button (Take Photo + Gallery) control.

**Architecture:** Extract a token-driven `ScanSourceButtons` component that renders the two source pills and delegates the source choice to a parent `onPick(source)` handler. Wire it into `PregnancyMealForm` (already two buttons) and `FeedingForm` (Kids → Solids, both the Diffuse and current renders), removing the redundant photo-attach tile row and the intermediate "SCAN PLATE" alert. Captured photos still render as a read-only, removable thumbnail strip.

**Tech Stack:** React Native + Expo, TypeScript strict, jest-expo + @testing-library/react-native, design tokens from `constants/theme.ts`.

## Global Constraints

- Tokens only — colors/fonts/radii from `constants/theme.ts` (`useTheme`, `useDiffuseTheme`, `diffuseFont`, `font`, `radius`, `brand`, `getDiffuseAccent`). No new raw hex in JSX style props. (Pre-existing raw hex already in the edited blocks — e.g. `"#FFFFFF"` on an existing thumbnail delete icon — is left as-is; do not add new hex.)
- Reuse existing i18n keys — no new keys: `kids_logForm_scanPlate` ("Scan plate — auto-detect foods & calories"), `kids_logForm_alertTakePhoto` ("Take photo"), `kids_foodDash_gallery` ("Gallery"), `kids_logForm_readingPlate` ("Reading the plate…").
- Icons via `Character` from `components/characters/Characters` (glyph `name="photo"`).
- Buttons pill/tile radius from `radius` token (`radius.md`), never a hardcoded number.
- `npm run typecheck` must pass (strict; no unused locals).
- Scope: only `FeedingForm` and `PregnancyMealForm`. Do NOT touch `MemoryForm` / `DiaperForm` `DiffusePhotoRow` usages (keepsake photos, not scan) — `DiffusePhotoRow` stays defined.

---

### Task 1: `ScanSourceButtons` shared component (TDD)

**Files:**
- Create: `components/calendar/ScanSourceButtons.tsx`
- Test: `components/calendar/__tests__/ScanSourceButtons.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  interface ScanSourceButtonsProps {
    onPick: (source: 'camera' | 'library') => void
    scanning?: boolean            // default false — replaces buttons with a reading state
    variant: 'current' | 'diffuse'
    accent: string                // token color: fill (current) / border+glyph (diffuse)
    accentText?: string           // token text/glyph color on the filled primary (current); default colors.textInverse
  }
  export function ScanSourceButtons(props: ScanSourceButtonsProps): JSX.Element
  ```
- Consumes: nothing from other tasks.

- [ ] **Step 1: Write the failing test**

`components/calendar/__tests__/ScanSourceButtons.test.tsx`:
```tsx
import { render, fireEvent } from '@testing-library/react-native'
import { ScanSourceButtons } from '../ScanSourceButtons'

// Character renders an SVG glyph; stub it so the test focuses on behavior.
jest.mock('../../characters/Characters', () => ({ Character: () => null }))

describe('ScanSourceButtons', () => {
  it('calls onPick("camera") when Take photo is pressed', () => {
    const onPick = jest.fn()
    const { getByText } = render(
      <ScanSourceButtons variant="current" accent="#B7A6E8" onPick={onPick} />,
    )
    fireEvent.press(getByText(/Take photo/i))
    expect(onPick).toHaveBeenCalledWith('camera')
  })

  it('calls onPick("library") when Gallery is pressed', () => {
    const onPick = jest.fn()
    const { getByText } = render(
      <ScanSourceButtons variant="current" accent="#B7A6E8" onPick={onPick} />,
    )
    fireEvent.press(getByText(/Gallery/i))
    expect(onPick).toHaveBeenCalledWith('library')
  })

  it('hides the source buttons and shows the reading label while scanning', () => {
    const onPick = jest.fn()
    const { queryByText, getByText } = render(
      <ScanSourceButtons variant="current" accent="#B7A6E8" scanning onPick={onPick} />,
    )
    expect(queryByText(/Take photo/i)).toBeNull()
    expect(getByText(/Reading the plate/i)).toBeTruthy()
  })

  it('renders the diffuse variant without crashing', () => {
    const { getByText } = render(
      <ScanSourceButtons variant="diffuse" accent="#B7A6E8" onPick={() => {}} />,
    )
    expect(getByText(/Take photo/i)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest components/calendar/__tests__/ScanSourceButtons.test.tsx`
Expected: FAIL — `Cannot find module '../ScanSourceButtons'`.

- [ ] **Step 3: Write the component**

`components/calendar/ScanSourceButtons.tsx`:
```tsx
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont, font, radius } from '../../constants/theme'
import { Character } from '../characters/Characters'
import { useTranslation } from '../../lib/i18n'

interface ScanSourceButtonsProps {
  onPick: (source: 'camera' | 'library') => void
  scanning?: boolean
  variant: 'current' | 'diffuse'
  accent: string
  accentText?: string
}

/** One clear food-scan control: an eyebrow + two source pills (Take Photo /
 *  Gallery). Both call onPick(source); the parent owns the picker + AI scan.
 *  Token-driven; supports the current and Diffuse variants. */
export function ScanSourceButtons({
  onPick, scanning = false, variant, accent, accentText,
}: ScanSourceButtonsProps) {
  const { colors } = useTheme()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const diffuse = variant === 'diffuse'

  const textFont = diffuse ? diffuseFont.monoBold : font.bodySemiBold
  const textTransform = diffuse ? ('uppercase' as const) : ('none' as const)
  const letterSpacing = diffuse ? 0.5 : 0
  const fontSize = diffuse ? 12 : 15
  const primaryText = diffuse ? accent : (accentText ?? colors.textInverse)

  return (
    <View style={styles.wrap}>
      <Text style={[
        styles.eyebrow,
        diffuse
          ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 2, textTransform: 'uppercase', fontSize: 10 }
          : { color: colors.textMuted, fontFamily: font.bodyMedium, fontSize: 12 },
      ]}>
        {t('kids_logForm_scanPlate')}
      </Text>

      {scanning ? (
        <View style={[styles.pill, styles.scanningRow, { borderWidth: 1, borderColor: diffuse ? dt.colors.line : colors.border }]}>
          <ActivityIndicator size="small" color={diffuse ? dt.colors.ink : accent} />
          <Text style={{ color: diffuse ? dt.colors.ink : colors.text, fontFamily: textFont, letterSpacing, textTransform, fontSize }}>
            {t('kids_logForm_readingPlate')}
          </Text>
        </View>
      ) : (
        <View style={styles.row}>
          <Pressable
            onPress={() => onPick('camera')}
            style={[styles.pill, diffuse
              ? { backgroundColor: accent + '1F', borderColor: accent, borderWidth: 1 }
              : { backgroundColor: accent }]}
          >
            <Character name="photo" size={18} color={primaryText} />
            <Text style={{ color: primaryText, fontFamily: textFont, letterSpacing, textTransform, fontSize }}>
              {t('kids_logForm_alertTakePhoto')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onPick('library')}
            style={[styles.pill, diffuse
              ? { backgroundColor: 'transparent', borderColor: dt.colors.line, borderWidth: 1 }
              : { backgroundColor: colors.surfaceGlass, borderColor: colors.border, borderWidth: 1 }]}
          >
            <Character name="photo" size={18} color={diffuse ? dt.colors.ink : colors.text} />
            <Text style={{ color: diffuse ? dt.colors.ink : colors.text, fontFamily: textFont, letterSpacing, textTransform, fontSize }}>
              {t('kids_foodDash_gallery')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  eyebrow: {},
  row: { flexDirection: 'row', gap: 10 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: radius.md },
  scanningRow: {},
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest components/calendar/__tests__/ScanSourceButtons.test.tsx`
Expected: PASS (4 tests). If `useTranslation` or `useTheme` throws for lack of a provider, check an existing passing test (e.g. `components/home/__tests__/QuickLogPickerGrid.test.tsx`) and mirror its setup — these hooks default to English / light theme without a provider in this repo.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add components/calendar/ScanSourceButtons.tsx components/calendar/__tests__/ScanSourceButtons.test.tsx
git commit -m "feat(logs): add shared ScanSourceButtons (Take Photo + Gallery) food-scan control"
```

---

### Task 2: Wire `ScanSourceButtons` into `PregnancyMealForm`

**Files:**
- Modify: `components/calendar/PregnancyMealForm.tsx` (import; replace L242-262; remove dead styles L388-390)

**Interfaces:**
- Consumes: `ScanSourceButtons` from Task 1.

- [ ] **Step 1: Add the import**

After the existing `import { LogFormSticker } from './LogFormSticker'` line, add:
```tsx
import { ScanSourceButtons } from './ScanSourceButtons'
```

- [ ] **Step 2: Replace the inline pick row**

Replace the entire `else` branch currently at L241-262 (the `) : (` … `<View style={styles.pickRow}> … </View>` … `)}`) with:
```tsx
        ) : (
          <ScanSourceButtons
            variant={diffuse ? 'diffuse' : 'current'}
            accent={diffuse ? dAccent : brand.pregnancy}
            accentText={colors.textInverse}
            scanning={scanning}
            onPick={pick}
          />
        )}
```
(`diffuse`, `dAccent`, `brand`, `colors`, `scanning`, and `pick` are all already in scope in this component.)

- [ ] **Step 3: Remove now-dead styles**

Delete these three entries from the `StyleSheet.create` block (L388-390):
```tsx
  pickRow: { flexDirection: 'row', gap: 10 },
  pickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  pickBtnText: { fontSize: 15, fontFamily: font.bodySemiBold },
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors. If `font` is now unused in the file, remove it from the `constants/theme` import; if `brand` was previously only used here it is still used (accent) — leave it.

- [ ] **Step 5: Commit**

```bash
git add components/calendar/PregnancyMealForm.tsx
git commit -m "refactor(logs): PregnancyMealForm uses shared ScanSourceButtons"
```

---

### Task 3: Wire `ScanSourceButtons` into `FeedingForm` — Diffuse render

**Files:**
- Modify: `components/calendar/KidsLogForms.tsx` (import; replace the Diffuse photo row + SCAN PLATE block ~L1567-1594)

**Interfaces:**
- Consumes: `ScanSourceButtons` from Task 1.

- [ ] **Step 1: Add the import**

After `import { Character } from '../characters/Characters'` (L55), add:
```tsx
import { ScanSourceButtons } from './ScanSourceButtons'
```

- [ ] **Step 2: Replace the Diffuse photo-attach row + SCAN PLATE alert**

Replace the block that starts at `{/* Photo area */}` (`<DiffusePhotoRow … />`, ~L1567-1573) through the end of the `{/* Scan plate … */}` `<Pressable> … </Pressable>` (~L1575-1594) with:
```tsx
              {/* Captured scan photos — evidence, removable */}
              {photos.length > 0 && (
                <View style={df.photoRow}>
                  {photos.map((uri, i) => (
                    <View key={i} style={{ position: 'relative' }}>
                      <Image source={{ uri }} style={[df.photoThumb, { borderWidth: 1, borderColor: dc.line2 }]} />
                      <Pressable onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))} style={[df.photoDelete, { backgroundColor: dc.ink }]} hitSlop={4}>
                        <X size={13} color={dc.bg} strokeWidth={3} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* One clear scan control */}
              <ScanSourceButtons
                variant="diffuse"
                accent={getDiffuseAccent('kids', dTheme.isDark)}
                scanning={scanningPlate}
                onPick={scanPlate}
              />
```
(`df`, `dc`, `dTheme`, `getDiffuseAccent`, `photos`, `setPhotos`, `scanningPlate`, `scanPlate`, `X`, `Image` are all in scope in this file/branch. `dc` is the Diffuse colors alias already used throughout this branch; if the local alias differs, use `dTheme.colors`.)

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors from this change. (Unused `takePhoto`/`pickPhoto` in `FeedingForm` are removed in Task 5 after the current render is also rewired — a strict "unused local" error there is expected until Task 5.)

- [ ] **Step 4: Commit**

```bash
git add components/calendar/KidsLogForms.tsx
git commit -m "refactor(logs): FeedingForm Diffuse render uses shared ScanSourceButtons"
```

---

### Task 4: Wire `ScanSourceButtons` into `FeedingForm` — current render

**Files:**
- Modify: `components/calendar/KidsLogForms.tsx` (replace the current-variant photo row + SCAN PLATE block ~L2006-2061)

**Interfaces:**
- Consumes: `ScanSourceButtons` from Task 1 (import added in Task 3).

- [ ] **Step 1: Replace the current-variant photo-attach row + SCAN PLATE alert**

Replace the block from `{/* Photo area */}` (`<View style={styles.photoRow}>`, ~L2006-2036) through the end of the `{/* Scan plate … */}` `<Pressable> … </Pressable>` (~L2038-2061) with:
```tsx
            {/* Captured scan photos — evidence, removable */}
            {photos.length > 0 && (
              <View style={styles.photoRow}>
                {photos.map((uri, i) => (
                  <View key={i} style={{ position: 'relative' }}>
                    <Image source={{ uri }} style={[styles.photoThumb, { borderRadius: radius.lg }]} />
                    <Pressable
                      onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      style={styles.photoDeleteBtn}
                      hitSlop={4}
                    >
                      <X size={14} color="#FFFFFF" strokeWidth={3} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* One clear scan control */}
            <ScanSourceButtons
              variant="current"
              accent={ACCENT}
              accentText={INK}
              scanning={scanningPlate}
              onPick={scanPlate}
            />
```
(`styles`, `radius`, `ACCENT`, `INK`, `photos`, `setPhotos`, `scanningPlate`, `scanPlate`, `X`, `Image` all in scope. The `"#FFFFFF"` on the delete icon is pre-existing — kept unchanged.)

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: same expected pending-unused-locals note as Task 3; resolved in Task 5.

- [ ] **Step 3: Commit**

```bash
git add components/calendar/KidsLogForms.tsx
git commit -m "refactor(logs): FeedingForm current render uses shared ScanSourceButtons"
```

---

### Task 5: Remove dead `FeedingForm` handlers/styles + verify

**Files:**
- Modify: `components/calendar/KidsLogForms.tsx` (remove `FeedingForm`'s `takePhoto`/`pickPhoto`; remove now-unused styles)

**Interfaces:**
- Consumes: nothing.

- [ ] **Step 1: Remove `FeedingForm`'s `pickPhoto` and `takePhoto`**

In `FeedingForm` only (~L1252-1272), delete the `async function pickPhoto() { … }` and `async function takePhoto() { … }` that append to `photos` (these were only wired to the removed `DiffusePhotoRow` / photo tiles). Do NOT touch the identically-named functions inside `MemoryForm`, `DiaperForm`, or `ActivityForm` — those forms still use them.

- [ ] **Step 2: Typecheck to find any remaining unused locals**

Run: `npm run typecheck`
Expected: PASS. If it flags any now-unused symbol (e.g. a `Camera`/`Plus` import or a `styles.cameraBtn`/`styles.galleryBtn`/`styles.scanPlateBtn`/`styles.scanPlateText`/`df.photoTile`/`df.photoButtons` entry that no other form references), remove only the entries the compiler flags. Verify with a grep before deleting a shared style, e.g.:
```bash
grep -n "cameraBtn\|galleryBtn\|scanPlateBtn\|scanPlateText" components/calendar/KidsLogForms.tsx
```
Keep anything still referenced by `MemoryForm`/`DiaperForm`/`ActivityForm` (e.g. `DiffusePhotoRow`, `df.photoTile` if those forms use it).

- [ ] **Step 3: Run the component test + full typecheck**

Run: `npx jest components/calendar/__tests__/ScanSourceButtons.test.tsx && npm run typecheck`
Expected: tests PASS, typecheck clean.

- [ ] **Step 4: Manual verification (iOS simulator)**

Launch the app (`npm start`, open simulator) and verify:
- Kids → Log Feeding → **Solids**: a single two-button control (Take Photo + Gallery) under a "Scan plate — auto-detect foods & calories" eyebrow; **no** separate camera/gallery tile row; **no** alert popup. Take Photo and Gallery each open the picker, scan, populate foods, and add a removable thumbnail. Manual "Add a food" input still works.
- Pregnancy → Log Meal: identical two-button control; photo preview + "Scan again" still work.
- Toggle Dev Panel → DESIGN VARIANT between current and Diffuse; both render with tokens (no broken colors), light and dark.

- [ ] **Step 5: Commit**

```bash
git add components/calendar/KidsLogForms.tsx
git commit -m "chore(logs): drop dead FeedingForm photo handlers/styles after scan-control unify"
```

---

## Self-Review

- **Spec coverage:** shared component (Task 1) ✓; Pregnancy wiring (Task 2) ✓; Kids Solids both renders (Tasks 3–4) ✓; redundant tile row + alert removed (Tasks 3–4) ✓; read-only evidence thumbnails retained (Tasks 3–4) ✓; behavior preserved — `scanPlate`/`pick` unchanged, spinner via `scanning`, manual input untouched ✓; out-of-scope forms untouched ✓; verification (Task 5) ✓.
- **Placeholder scan:** none — every code step is concrete.
- **Type consistency:** `ScanSourceButtonsProps` (`onPick`, `scanning`, `variant`, `accent`, `accentText`) is used identically at all three call sites; `onPick` receives `scanPlate`/`pick`, both `(source: 'camera' | 'library') => void`.
