# Friendly Quick-Log Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize Kids logging on the friendly Pregnancy pattern via a shared Quick-Log Kit, piloting it on Sleep, Diaper, Mood, and Feeding.

**Architecture:** A new `components/calendar/QuickLogKit.tsx` module provides three pure, tested presentation primitives — `ChoiceStep`, `MoreSection`, `ActiveChildChip` — that complement the existing `StepSlider`. The four pilot Kids forms in `KidsLogForms.tsx` are rewritten to compose these primitives: primary value visible + immediately editable, active child defaulted, and time/notes/photo/routine collapsed behind one "more" tap. Persistence is unchanged (existing `saveChildLog`/`updateChildLog`/`saveAsRoutine`), so it's a UI-only redesign.

**Tech Stack:** React Native 0.81 + Expo SDK 54, TypeScript strict, Zustand v5, `@testing-library/react-native` 13 + `jest-expo`, existing `StepSlider` / `LogSheet` / `Character` primitives.

## Global Constraints

- Design tokens only — import from `constants/theme.ts` (`useTheme()` / `useDiffuseTheme()` / `stickers` / `radius` / `font`); no raw hex in JSX. (SVG path files exempt — not touched here.)
- Blob + hue for any log type come from the shared canonical map: `DIFFUSE_LOG_CHARACTER` + `diffuseLogHue` in `components/calendar/DiffuseLogTimeline.tsx`. Never hardcode a per-type color.
- Both variants supported: current (paper) via `useTheme()`, Diffuse via `useDiffuseTheme()`, selected with `useIsDiffuse()`. Follow the existing branch pattern in `KidsLogForms.tsx`.
- TypeScript strict — no `any`, named exports for components, `interface Props` above each component.
- Local dates only — `toDateStr(new Date())` for `date`; never `toISOString().split('T')[0]`.
- No schema changes. Reuse `saveChildLog` / `updateChildLog` / `saveAsRoutine`. Keep every field currently loggable (collapsed, not removed).
- Each pilot form keeps its exported signature `{ onSaved; initialDate?; prefill?; onSkip?; editLog? }` (Diaper: `{ onSaved; initialDate?; editLog? }`) so `KidsLogRouter.tsx` + `CaregiverLogSheet.tsx` mount unchanged.
- Commit model: tap a choice = select (highlight), not save. A single explicit **Save** commits every form (slider and choice alike).
- Run `npx tsc --noEmit` (expect 0 errors) and `npx jest <file>` before each commit.

---

## File Structure

- **Create** `components/calendar/QuickLogKit.tsx` — `ChoiceStep`, `MoreSection`, `ActiveChildChip` (+ their `Props`).
- **Create** `components/calendar/__tests__/QuickLogKit.test.tsx` — RTL tests for the three primitives.
- **Modify** `components/calendar/KidsLogForms.tsx` — export the three save helpers (Task 2); rewrite `SleepForm`, `DiaperForm`, `KidsMoodForm`, `FeedingForm` to compose the kit (Tasks 4–7).
- **Reference (unchanged):** `components/ui/StepSlider.tsx`, `components/calendar/LogSheet.tsx`, `components/calendar/KidsLogRouter.tsx`, `components/caregiver/CaregiverLogSheet.tsx`, `components/calendar/DiffuseLogTimeline.tsx`.

---

### Task 1: ChoiceStep primitive

**Files:**
- Modify: `components/calendar/QuickLogKit.tsx` (create)
- Test: `components/calendar/__tests__/QuickLogKit.test.tsx` (create)

**Interfaces:**
- Consumes: nothing (leaf primitive).
- Produces:
  ```ts
  export interface ChoiceOption { id: string; label: string; blob: CharacterName; color: string }
  export interface ChoiceStepProps {
    options: ChoiceOption[]
    value: string[]                    // selected ids (single-select = length 0 or 1)
    onChange: (ids: string[]) => void
    multi?: boolean                    // default false
    testID?: string
  }
  export function ChoiceStep(props: ChoiceStepProps): JSX.Element
  ```
  Single-select: pressing an option sets `value=[id]` (pressing the selected one keeps it selected — never clears to empty in single mode). Multi: pressing toggles membership.

- [ ] **Step 1: Write the failing test**

```tsx
// components/calendar/__tests__/QuickLogKit.test.tsx
import { render, fireEvent } from '@testing-library/react-native'
import { ChoiceStep, type ChoiceOption } from '../QuickLogKit'

const OPTS: ChoiceOption[] = [
  { id: 'pee', label: 'Pee', blob: 'diaper', color: '#9DC3E8' },
  { id: 'poop', label: 'Poop', blob: 'diaper', color: '#F5B896' },
  { id: 'both', label: 'Both', blob: 'diaper', color: '#BDD48C' },
]

describe('ChoiceStep', () => {
  it('single-select: pressing an option reports [id]', () => {
    const onChange = jest.fn()
    const { getByText } = render(<ChoiceStep options={OPTS} value={[]} onChange={onChange} />)
    fireEvent.press(getByText('Poop'))
    expect(onChange).toHaveBeenCalledWith(['poop'])
  })

  it('single-select: pressing a different option replaces the selection', () => {
    const onChange = jest.fn()
    const { getByText } = render(<ChoiceStep options={OPTS} value={['pee']} onChange={onChange} />)
    fireEvent.press(getByText('Both'))
    expect(onChange).toHaveBeenCalledWith(['both'])
  })

  it('multi-select: pressing toggles membership', () => {
    const onChange = jest.fn()
    const { getByText } = render(<ChoiceStep options={OPTS} value={['pee']} onChange={onChange} multi />)
    fireEvent.press(getByText('Poop'))
    expect(onChange).toHaveBeenCalledWith(['pee', 'poop'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest components/calendar/__tests__/QuickLogKit.test.tsx -t ChoiceStep`
Expected: FAIL — cannot find module `../QuickLogKit` / `ChoiceStep is not a function`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/calendar/QuickLogKit.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont, radius } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { Character, type CharacterName } from '../characters/Characters'

export interface ChoiceOption { id: string; label: string; blob: CharacterName; color: string }
export interface ChoiceStepProps {
  options: ChoiceOption[]
  value: string[]
  onChange: (ids: string[]) => void
  multi?: boolean
  testID?: string
}

export function ChoiceStep({ options, value, onChange, multi = false, testID }: ChoiceStepProps) {
  const { colors, font, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const ink = diffuse ? dt.colors.ink : colors.text
  const line = diffuse ? dt.colors.line : colors.border

  const press = (id: string) => {
    if (multi) {
      onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
    } else {
      onChange([id])
    }
  }

  return (
    <View style={kitStyles.choiceRow} testID={testID}>
      {options.map((o) => {
        const on = value.includes(o.id)
        return (
          <Pressable
            key={o.id}
            onPress={() => press(o.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [
              kitStyles.choice,
              {
                borderColor: on ? ink : line,
                backgroundColor: on ? (diffuse ? dt.colors.surface : colors.surfaceRaised) : 'transparent',
                borderRadius: radius.lg,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Character name={o.blob} size={40} color={o.color} />
            <Text style={[kitStyles.choiceLabel, { color: ink, fontFamily: diffuse ? diffuseFont.body : font.bodySemiBold }]}>
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const kitStyles = StyleSheet.create({
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  choice: { minWidth: 96, flexGrow: 1, alignItems: 'center', gap: 8, paddingVertical: 18, paddingHorizontal: 12, borderWidth: 1.5 },
  choiceLabel: { fontSize: 14 },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest components/calendar/__tests__/QuickLogKit.test.tsx -t ChoiceStep`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/calendar/QuickLogKit.tsx components/calendar/__tests__/QuickLogKit.test.tsx
git commit -m "feat(quicklog): ChoiceStep primitive for tap-select log choices"
```

---

### Task 2: Export Kids save helpers

**Files:**
- Modify: `components/calendar/KidsLogForms.tsx:477` (`saveChildLog`), `:509` (`updateChildLog`), `:531` (`saveAsRoutine`)

**Interfaces:**
- Consumes: existing internal helpers.
- Produces (unchanged signatures, now exported):
  ```ts
  export async function saveChildLog(childId: string, type: string, value?: string, notes?: string, photos?: string[], date?: string): Promise<void>
  export async function updateChildLog(id: string, value?: string | null, notes?: string | null, photos?: string[], date?: string): Promise<void>
  export async function saveAsRoutine(childId: string, type: string, name: string, value: string | null, time: string | null, daysOfWeek?: number[]): Promise<void>
  ```

- [ ] **Step 1: Add `export` to the three helpers**

At `components/calendar/KidsLogForms.tsx`, change each declaration:
```ts
// line 477
export async function saveChildLog(
// line 509
export async function updateChildLog(
// line 531
export async function saveAsRoutine(
```
(No body changes — these forms already call them in-module; exporting is additive.)

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/calendar/KidsLogForms.tsx
git commit -m "refactor(quicklog): export child-log save helpers for kit reuse"
```

---

### Task 3: MoreSection + ActiveChildChip primitives

**Files:**
- Modify: `components/calendar/QuickLogKit.tsx`
- Test: `components/calendar/__tests__/QuickLogKit.test.tsx`

**Interfaces:**
- Consumes: `useChildStore` (`children`, `activeChild`).
- Produces:
  ```ts
  export interface MoreSectionProps { children: React.ReactNode; label?: string; testID?: string }
  export function MoreSection(props: MoreSectionProps): JSX.Element   // collapsed by default; tapping the label row reveals children

  export interface ActiveChildChipProps { childId: string; onChange: (id: string) => void }
  export function ActiveChildChip(props: ActiveChildChipProps): JSX.Element  // shows selected child's name; tap cycles/opens child switch; hidden when <2 children
  ```

- [ ] **Step 1: Write the failing tests**

Append to `components/calendar/__tests__/QuickLogKit.test.tsx`:
```tsx
import { MoreSection } from '../QuickLogKit'
import { Text as RNText } from 'react-native'

describe('MoreSection', () => {
  it('hides its children until the toggle is pressed', () => {
    const { queryByText, getByText } = render(
      <MoreSection label="More"><RNText>HIDDEN_FIELD</RNText></MoreSection>,
    )
    expect(queryByText('HIDDEN_FIELD')).toBeNull()
    fireEvent.press(getByText('More'))
    expect(queryByText('HIDDEN_FIELD')).toBeTruthy()
  })
})
```
(`ActiveChildChip` depends on `useChildStore`; it's covered by manual verification in the form tasks rather than a store-mocked unit test — keep the unit test on the pure `MoreSection` behavior.)

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/calendar/__tests__/QuickLogKit.test.tsx -t MoreSection`
Expected: FAIL — `MoreSection is not a function`.

- [ ] **Step 3: Implement both primitives**

Append to `components/calendar/QuickLogKit.tsx`:
```tsx
import { useState } from 'react'
import { useChildStore } from '../../store/useChildStore'
import { DiffuseArrow } from '../ui/diffuse/DiffuseKit'
import { ChevronDown } from 'lucide-react-native'

export interface MoreSectionProps { children: React.ReactNode; label?: string; testID?: string }
export function MoreSection({ children, label = 'More', testID }: MoreSectionProps) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const ink3 = diffuse ? dt.colors.ink3 : colors.textMuted
  const [open, setOpen] = useState(false)
  return (
    <View testID={testID}>
      <Pressable onPress={() => setOpen((o) => !o)} style={kitStyles.moreRow} accessibilityRole="button">
        <Text style={[kitStyles.moreLabel, { color: ink3, fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium }]}>{label}</Text>
        <ChevronDown size={16} color={ink3} strokeWidth={1.8} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>
      {open ? <View style={kitStyles.moreBody}>{children}</View> : null}
    </View>
  )
}

export interface ActiveChildChipProps { childId: string; onChange: (id: string) => void }
export function ActiveChildChip({ childId, onChange }: ActiveChildChipProps) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const children = useChildStore((s) => s.children)
  if (children.length < 2) return null
  const ink = diffuse ? dt.colors.ink : colors.text
  const line = diffuse ? dt.colors.line : colors.border
  const cur = children.findIndex((c) => c.id === childId)
  const next = () => onChange(children[(cur + 1) % children.length].id)
  const name = children[cur]?.name ?? children[0]?.name ?? ''
  return (
    <Pressable onPress={next} style={({ pressed }) => [kitStyles.childChip, { borderColor: line, opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button" accessibilityLabel={`Child: ${name}. Tap to switch.`}>
      <Text style={[kitStyles.childChipText, { color: ink, fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold }]}>{name}</Text>
    </Pressable>
  )
}
```
Add to `kitStyles`:
```ts
  moreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  moreLabel: { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  moreBody: { gap: 12, paddingBottom: 4 },
  childChip: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 7 },
  childChipText: { fontSize: 13, letterSpacing: 0.3 },
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/calendar/__tests__/QuickLogKit.test.tsx`
Expected: PASS (all ChoiceStep + MoreSection tests).

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit` → 0 errors.
```bash
git add components/calendar/QuickLogKit.tsx components/calendar/__tests__/QuickLogKit.test.tsx
git commit -m "feat(quicklog): MoreSection + ActiveChildChip primitives"
```

---

### Task 4: Convert Kids DiaperForm (simplest choice log first)

**Files:**
- Modify: `components/calendar/KidsLogForms.tsx` (`DiaperForm`, ~`:3473`)

**Interfaces:**
- Consumes: `ChoiceStep`, `MoreSection`, `ActiveChildChip` (Tasks 1,3); `saveChildLog`, `updateChildLog` (Task 2, same module — call directly); `useChildStore.activeChild`.
- Produces: `DiaperForm` with unchanged export signature `{ onSaved; initialDate?; editLog? }`.

- [ ] **Step 1: Default child to active child**

In `DiaperForm`, replace the child-state initializer so it defaults to the active child instead of `''`:
```ts
const activeChild = useChildStore((s) => s.activeChild)
const [childId, setChildId] = useState(editLog?.child_id ?? activeChild?.id ?? children[0]?.id ?? '')
```

- [ ] **Step 2: Replace the body with the kit layout**

Inside the form's returned `LogSheet`/content, render:
1. `<ActiveChildChip childId={childId} onChange={setChildId} />` (top; auto-hides for single-child).
2. `<ChoiceStep options={DIAPER_OPTS} value={type ? [type] : []} onChange={(ids) => setType(ids[0])} />` where
   ```ts
   const DIAPER_OPTS: ChoiceOption[] = [
     { id: 'pee', label: t('kids_logForm_diaperPee'), blob: 'diaper', color: stickers.blue },
     { id: 'poop', label: t('kids_logForm_diaperPoop'), blob: 'diaper', color: stickers.peach },
     { id: 'both', label: t('kids_logForm_diaperBoth'), blob: 'diaper', color: stickers.green },
   ]
   ```
   (Reuse the existing diaper label i18n keys already in the form; if a key name differs, keep the one the form currently uses.)
3. `<MoreSection>` wrapping the EXISTING time picker, photo picker, and notes input JSX moved verbatim from the current form.
4. The existing Save button, unchanged, calling the existing save path but with `childId` now defaulted.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Manual verification (record result)**

Launch the app (`/run` skill or `npx expo start`), open Kids → Log Activity → Diaper:
- Active child pre-selected (e.g. Rio), no "select a child" wall.
- pee/poop/both are large tappable blobs; tapping highlights (does not auto-close).
- "More" reveals time + photo + notes.
- Save writes a `child_logs` row (`type='diaper'`) and it appears on the timeline; the saved `value` shape matches the pre-change form (verify by comparing a saved row before/after, or reading `formatLogDisplay` output is unchanged).
- Edit an existing diaper log (`editLog`) still prefills the choice.

- [ ] **Step 5: Commit**

```bash
git add components/calendar/KidsLogForms.tsx
git commit -m "feat(quicklog): friendly DiaperForm (active-child default + choice blobs + collapsed more)"
```

---

### Task 5: Convert Kids KidsMoodForm

**Files:**
- Modify: `components/calendar/KidsLogForms.tsx` (`KidsMoodForm`, ~`:2920`)

**Interfaces:**
- Consumes: `ChoiceStep`, `MoreSection`, `ActiveChildChip`; existing mood option list already defined in the form (`MOOD_DEFS` / equivalent); existing save path.
- Produces: `KidsMoodForm` with unchanged signature `{ onSaved; initialDate?; prefill?; onSkip?; editLog? }`.

- [ ] **Step 1: Default child to active child**

```ts
const activeChild = useChildStore((s) => s.activeChild)
const [childId, setChildId] = useState(prefill?.childId ?? editLog?.child_id ?? activeChild?.id ?? children[0]?.id ?? '')
```

- [ ] **Step 2: Map the existing mood options to `ChoiceOption[]`**

Build from the form's current mood definitions (keep the same ids/labels the form already saves), assigning each a blob + hue from the shared map:
```ts
const MOOD_OPTS: ChoiceOption[] = MOOD_DEFS.map((m) => ({
  id: m.id, label: t(m.labelKey), blob: 'mood', color: diffuseLogHue('mood'),
}))
```
Render `<ChoiceStep options={MOOD_OPTS} value={mood ? [mood] : []} onChange={(ids) => setMood(ids[0])} />`. Wrap time + notes in `<MoreSection>`. Keep the existing Save.
(Import `diffuseLogHue` from `./DiffuseLogTimeline` if not already imported.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` → 0 errors.

- [ ] **Step 4: Manual verification (record result)**

Kids → Log Activity → Mood: active child defaulted; mood blobs tappable (highlight, not auto-save); "More" reveals time + notes; Save writes `type='mood'` with the same `value` the old form used; edit prefills.

- [ ] **Step 5: Commit**

```bash
git add components/calendar/KidsLogForms.tsx
git commit -m "feat(quicklog): friendly KidsMoodForm (choice blobs + collapsed more)"
```

---

### Task 6: Convert Kids SleepForm (slider parity with pregnancy)

**Files:**
- Modify: `components/calendar/KidsLogForms.tsx` (`SleepForm`, `:2512`)

**Interfaces:**
- Consumes: `StepSlider` (existing), `MoreSection`, `ActiveChildChip`; existing sleep save path (`saveChildLog(... 'sleep' ...)` + `saveAsRoutine`).
- Produces: `SleepForm` unchanged signature.

- [ ] **Step 1: Default child to active child**

```ts
const activeChild = useChildStore((s) => s.activeChild)
const [childId, setChildId] = useState(prefill?.childId ?? editLog?.child_id ?? activeChild?.id ?? children[0]?.id ?? '')
```

- [ ] **Step 2: Replace GREAT/GOOD/RESTLESS/POOR chips + time-first layout with sliders**

Primary screen:
- `<ActiveChildChip childId={childId} onChange={setChildId} />`
- Hours: `<StepSlider min={0} max={16} step={0.5} value={hours} onChange={setHours} unit={t('kids_logForm_hoursUnit')} blob="sleep" />` (add `hours` numeric state; default e.g. 8).
- Quality: `<StepSlider min={1} max={10} step={1} value={quality} onChange={setQuality} blob="sleep" />` (convert the existing `quality` string state to a 1–10 numeric; when saving keep writing whatever the analytics expect — see Step 3).
- `<MoreSection>`: existing start/end time pickers, notes, save-as-routine toggle + days.

- [ ] **Step 3: Preserve the saved value shape**

The current form saves `JSON.stringify(valueObj)` with a `quality` field (+ tag). Keep the same object keys; map the numeric quality back to the stored representation the analytics reader expects (if analytics read a string label, map 1–10 → nearest label; if numeric, store the number). Verify against `formatLogDisplay('sleep', …)` and `KidsAnalytics` sleep reader so no downstream breaks. Do NOT change `saveChildLog`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit` → 0 errors.

- [ ] **Step 5: Manual verification (record result)**

Kids → Log Activity → Sleep: active child defaulted; two sliders (hours, quality) matching the pregnancy sleep feel; "More" reveals time/notes/routine; Save writes `type='sleep'`; sleep analytics + timeline still render the value; save-as-routine still works; edit prefills.

- [ ] **Step 6: Commit**

```bash
git add components/calendar/KidsLogForms.tsx
git commit -m "feat(quicklog): friendly SleepForm (dual sliders, pregnancy parity)"
```

---

### Task 7: Convert Kids FeedingForm

**Files:**
- Modify: `components/calendar/KidsLogForms.tsx` (`FeedingForm`, `:1019`)

**Interfaces:**
- Consumes: `ChoiceStep`, `StepSlider`, `MoreSection`, `ActiveChildChip`; existing feeding save path.
- Produces: `FeedingForm` unchanged signature.

- [ ] **Step 1: Default child to active child**

```ts
const activeChild = useChildStore((s) => s.activeChild)
const [childId, setChildId] = useState(prefill?.childId ?? editLog?.child_id ?? activeChild?.id ?? children[0]?.id ?? '')
```

- [ ] **Step 2: Type as ChoiceStep, amount as skippable slider**

- Type: `<ChoiceStep options={FEED_OPTS} value={feedType ? [feedType] : []} onChange={(ids) => setFeedType(ids[0])} />` where `FEED_OPTS` are the form's existing feed types (breast/bottle/solid) mapped to `{id,label,blob:'feeding',color:diffuseLogHue('feeding')}` — keep the ids the form already saves.
- Amount: `<StepSlider min={0} max={<existing max>} step={<existing step>} value={amount} onChange={setAmount} unit={<existing unit>} blob="feeding" />` shown when the chosen type has an amount (bottle/solid); optional — a 0 value or untouched slider means "not recorded", exactly as the current form treats an empty amount.
- `<MoreSection>`: existing side/breast selector, time, notes.

- [ ] **Step 3: Preserve saved value shape**

Keep the exact `value` object/string the current `FeedingForm` saves (type, amount, side, food tags). Don't change `saveChildLog`. Verify `formatLogDisplay('feeding', …)` output is unchanged for a sample log.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit` → 0 errors.

- [ ] **Step 5: Manual verification (record result)**

Kids → Log Activity → Feeding: active child defaulted; type blobs tappable; amount slider appears for bottle/solid; "More" reveals side/time/notes; Save writes `type='feeding'` with unchanged shape; food-scan tag path (if used) still works; edit prefills.

- [ ] **Step 6: Commit**

```bash
git add components/calendar/KidsLogForms.tsx
git commit -m "feat(quicklog): friendly FeedingForm (type choice + amount slider + collapsed more)"
```

---

### Task 8: Full regression pass + kit test run

**Files:**
- Reference: all pilot forms + `KidsLogRouter.tsx`, `CaregiverLogSheet.tsx`.

- [ ] **Step 1: Run the kit tests**

Run: `npx jest components/calendar/__tests__/QuickLogKit.test.tsx`
Expected: PASS (all).

- [ ] **Step 2: Run the existing log-parity suite (no regressions)**

Run: `npx jest lib/__tests__/quickLogParity.test.ts`
Expected: PASS.

- [ ] **Step 3: Full typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Manual matrix (record results)**

For each pilot log (Sleep, Diaper, Mood, Feeding), in BOTH variants (toggle Dev Panel → DESIGN VARIANT):
- Mounted from KidsCalendar "Log Activity" sheet AND from a caregiver context (`CaregiverLogSheet`) if reachable.
- Active child defaults; single-child users see no chip; multi-child users can switch via chip.
- Save writes correct row; timeline + analytics reflect it; edit prefills; save-as-routine (Sleep) works.
- Untouched Kids logs (Health, Activity, Wake-up, Memory) still open and save via the old forms.

- [ ] **Step 5: Commit any fixes found**

```bash
git add -A
git commit -m "test(quicklog): regression pass for pilot log forms"
```

---

## Notes for the rollout (out of scope for this plan)

After the pilot ships and is approved: apply the same kit to the remaining Kids logs (Health, Activity, Wake-up, Memory), then Cycle logs, then optionally refactor Pregnancy forms to consume the kit's primitives. Each is mechanical given the kit exists.
