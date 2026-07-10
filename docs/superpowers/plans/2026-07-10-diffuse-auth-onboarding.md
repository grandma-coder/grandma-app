# Diffuse Auth + Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the entire auth + onboarding flow onto the Diffuse (v4) variant, matching `docs/design/Onboarding.html` frame-by-frame, flag-gated behind the same Dev Panel variant switch every behavior surface uses.

**Architecture:** Additive `if (diffuse) …` branches per screen (`useIsDiffuse()`), current cream-paper path untouched. A tiny shared foundation (AuraField background, containerless CTA/OAuth actions, flag-branched OnboardingStep shell) is built + verified first; then screens are built one at a time against their exact HTML frame, extracting ~11 picker primitives as first needed.

**Tech Stack:** React Native + Expo Router, `react-native-svg` (blooms/pickers), `react-native-reanimated` + `PanResponder` (gesture pickers), Zustand (`useThemeStore` variant flag + onboarding stores), Jest (logic-only tests).

## Global Constraints

- **Flag:** `useIsDiffuse()` = `useThemeStore((s) => s.variant) === 'diffuse'` (from `components/ui/diffuse/DiffuseKit`). Mode-independent; works pre-login. Same flag drives all surfaces.
- **Additive only:** every screen keeps its current cream-paper render in the `else`/`!diffuse` path, byte-for-byte. No behavior/data/validation/Supabase/navigation changes — only render paths added; pickers feed the same values current inputs do.
- **Reference:** `docs/design/Onboarding.html` (pinned) is the visual source of truth. Match look; where HTML and live RN diverge, the live RN flow/data wins — flag the divergence, never invent data.
- **Tokens only:** import from `constants/theme.ts` — `useDiffuseTheme()` (`dt.colors.ink/ink2/ink3/ink4/line/line2/hairline/surface/bg/success`), `diffuseFont` (`display`/`displayLight`/`displayMedium`/`italic`/`body`/`bodySemiBold`/`mono`/`monoBold`), `getDiffuseAccent(mode, isDark)`, `getModeField(mode, isDark)`. Reuse `SoftBloom`, `DiffuseGrain` from `DiffuseKit`; `DiffuseDotCalendar` from `DiffusePrimitives`.
- **Aura mode is explicit per screen:** auth = `'pre-pregnancy'`; cycle flow = `'pre-pregnancy'`; pregnancy = `'pregnancy'`; kids = `'kids'`; journey picker = all four.
- **Testing reality:** this repo has NO RN-component tests — Jest is used for pure logic only (`lib/__tests__/*`). So: pure-math helpers get real Jest TDD tests; visual composition is verified by `npx tsc --noEmit 2>&1 | grep -v lib/i18n` clean + visual match to the HTML frame + flag round-trip (toggle Dev Panel variant: Diffuse matches frame, Current unchanged).
- **Git hygiene:** `git restore --staged .` before every commit; stage only explicit paths; never `git add -A`. Never touch `lib/cycle*.ts` or other parallel-session WIP.
- **SoftBloom API:** `<SoftBloom color opacity? cx? cy? spread? radius? style? />` (all strings for cx/cy/radius, numbers for opacity/spread).
- **No new i18n keys** unless a screen genuinely needs one; reuse existing `t('…')` keys/strings.

---

## File Structure

**New primitive files:**
- `components/ui/diffuse/AuraField.tsx` — `AuraField`, `AURA` recipe map.
- `components/ui/diffuse/DiffuseActions.tsx` — `DiffuseSolidCTA`, `DiffuseOAuthRow`, `DiffuseTextLink`.
- `components/ui/diffuse/DiffuseField.tsx` — `DiffuseField` (bare underline input), `DiffuseFieldLabel`, `DiffuseDivider`.
- `components/ui/diffuse/pickers/BloomChips.tsx`, `SegmentedBloom.tsx`, `ChoiceTimeline.tsx`, `AvatarBloomGrid.tsx`, `BlobPicker.tsx`, `PoleField.tsx`, `OrbitPicker.tsx`, `MetaballBloom.tsx`, `ArcDial.tsx`.
- `lib/diffusePickers/arcDial.ts`, `orbit.ts`, `metaball.ts` — pure layout math (Jest-tested).
- `lib/__tests__/arcDial.test.ts`, `orbit.test.ts`, `metaball.test.ts`.

**Modified (additive diffuse branch only):**
- `components/onboarding/OnboardingStep.tsx`
- `app/(auth)/{welcome,sign-in,sign-up,forgot-password,reset-password}.tsx`
- `app/onboarding/journey.tsx`, `app/onboarding/{cycle,pregnancy,kids}/index.tsx`

**Extend:** `components/ui/diffuse/DiffusePrimitives.tsx` (`DiffuseDotCalendar` — add `periodDays` bloom already present; confirm props suffice).

---

## Phase 0 — Shared foundation

### Task 1: AuraField background primitive

**Files:**
- Create: `components/ui/diffuse/AuraField.tsx`
- Reference: `docs/design/Onboarding.html` (`.aura` inline `--aura` recipes per frame)

**Interfaces:**
- Produces: `AuraField({ blooms, grain=true, dark, style, children }): JSX` where `blooms: { color: string; cx: string; cy: string; opacity?: number; spread?: number }[]`. Also exports `AURA: Record<string, AuraBloom[]>` — named recipes (`welcome`, `signin`, `journey`, `cycleLastPeriod`, …) copied from the HTML frames.

- [ ] **Step 1: Create the component**

```tsx
// components/ui/diffuse/AuraField.tsx
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import type { ReactNode } from 'react'
import { SoftBloom, DiffuseGrain } from './DiffuseKit'

export interface AuraBloom { color: string; cx: string; cy: string; opacity?: number; spread?: number }

interface AuraFieldProps {
  blooms: AuraBloom[]
  grain?: boolean
  radius?: number
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}

/** The signature Diffuse background: several soft corner blooms + grain.
 *  RN equivalent of the HTML `.aura` multi-radial-gradient field. */
export function AuraField({ blooms, grain = true, radius = 0, style, children }: AuraFieldProps) {
  return (
    <View style={[styles.root, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {blooms.map((b, i) => (
          <SoftBloom key={i} color={b.color} cx={b.cx} cy={b.cy} opacity={b.opacity ?? 0.4} spread={b.spread ?? 0.55} radius="70%" />
        ))}
        {grain ? <DiffuseGrain opacity={0.05} radius={radius} /> : null}
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({ root: { flex: 1, overflow: 'hidden' } })
```

- [ ] **Step 2: Add the AURA recipe map (copy exact colors/positions from the HTML frames)**

Read each frame's `--aura` in `docs/design/Onboarding.html` and translate `radial-gradient(SIZE at Xpct Ypct, COLOR 0%, transparent …)` → `{ color: COLOR, cx: 'X%', cy: 'Y%' }`. Append to the file:

```tsx
// Recipes transcribed from docs/design/Onboarding.html `.aura` values.
export const AURA: Record<string, AuraBloom[]> = {
  // Auth · Welcome: peach 18/16, rose 88/24, lilac 50/108
  welcome: [
    { color: '#F4C9A0', cx: '18%', cy: '16%', opacity: 0.5 },
    { color: '#ED88A6', cx: '88%', cy: '24%', opacity: 0.5 },
    { color: '#A98BDD', cx: '50%', cy: '100%', opacity: 0.45 },
  ],
  // (transcribe the remaining frames as their screens are built — see each screen task)
}
```

- [ ] **Step 3: Verify tsc**

Run: `npx tsc --noEmit 2>&1 | grep -v lib/i18n | grep "error TS"` — Expected: no output.

- [ ] **Step 4: Commit**

```bash
git restore --staged .
git add components/ui/diffuse/AuraField.tsx
git commit -m "feat(diffuse): AuraField background primitive"
```

### Task 2: Containerless actions (CTA / OAuth / text link)

**Files:**
- Create: `components/ui/diffuse/DiffuseActions.tsx`
- Reference: `.solid`, `.pillbtn.oauth`, `.txtlink` in `docs/design/Onboarding.html`

**Interfaces:**
- Produces:
  - `DiffuseSolidCTA({ label, onPress, disabled?, icon?='arrow'|'check' }): JSX` — mono uppercase label + arrow/check on a top hairline, no fill.
  - `DiffuseOAuthRow({ label, icon, onPress }): JSX` — mono row, leading glyph, bottom hairline.
  - `DiffuseTextLink({ label, onPress }): JSX` — centered muted mono.

- [ ] **Step 1: Create the file**

```tsx
// components/ui/diffuse/DiffuseActions.tsx
import { Pressable, Text, View, StyleSheet } from 'react-native'
import type { ReactNode } from 'react'
import { ArrowRight, Check } from 'lucide-react-native'
import { useDiffuseTheme, diffuseFont } from '../../../constants/theme'

export function DiffuseSolidCTA({ label, onPress, disabled, icon = 'arrow' }: {
  label: string; onPress: () => void; disabled?: boolean; icon?: 'arrow' | 'check'
}) {
  const { colors } = useDiffuseTheme()
  const Icon = icon === 'check' ? Check : ArrowRight
  return (
    <Pressable onPress={onPress} disabled={disabled}
      style={({ pressed }) => [s.solid, { borderTopColor: colors.line2, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}>
      <Text style={[s.solidLabel, { color: colors.ink, fontFamily: diffuseFont.monoBold }]}>{label}</Text>
      <Icon size={18} color={colors.ink} strokeWidth={1.8} />
    </Pressable>
  )
}

export function DiffuseOAuthRow({ label, icon, onPress }: { label: string; icon: ReactNode; onPress: () => void }) {
  const { colors } = useDiffuseTheme()
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.oauth, { borderBottomColor: colors.line2, opacity: pressed ? 0.55 : 1 }]}>
      {icon}
      <Text style={[s.oauthLabel, { color: colors.ink, fontFamily: diffuseFont.monoBold }]}>{label}</Text>
    </Pressable>
  )
}

export function DiffuseTextLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useDiffuseTheme()
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <Text style={[s.txtlink, { color: colors.ink3, fontFamily: diffuseFont.monoBold }]}>{label}</Text>
    </Pressable>
  )
}

const s = StyleSheet.create({
  solid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 18, paddingHorizontal: 2 },
  solidLabel: { fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' },
  oauth: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 16, paddingHorizontal: 2 },
  oauthLabel: { fontSize: 12.5, letterSpacing: 1.4, textTransform: 'uppercase' },
  txtlink: { fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', paddingVertical: 15 },
})
```

- [ ] **Step 2: tsc clean** — `npx tsc --noEmit 2>&1 | grep -v lib/i18n | grep "error TS"` → no output.
- [ ] **Step 3: Commit** — `git restore --staged . && git add components/ui/diffuse/DiffuseActions.tsx && git commit -m "feat(diffuse): containerless actions (CTA/OAuth/text-link)"`

### Task 3: Bare underline field + label + divider

**Files:** Create `components/ui/diffuse/DiffuseField.tsx`. Reference: `.field`/`.authfield`, `.field-lab`, `.divider`.

**Interfaces:** Produces `DiffuseField({ value, onChangeText, placeholder, secureTextEntry?, keyboardType?, autoCapitalize? })`, `DiffuseFieldLabel({ children })`, `DiffuseDivider({ label })`.

- [ ] **Step 1: Create the file**

```tsx
// components/ui/diffuse/DiffuseField.tsx
import { View, Text, TextInput, StyleSheet, type KeyboardTypeOptions } from 'react-native'
import { useDiffuseTheme, diffuseFont } from '../../../constants/theme'

export function DiffuseFieldLabel({ children }: { children: string }) {
  const { colors } = useDiffuseTheme()
  return <Text style={[s.lab, { color: colors.ink3, fontFamily: diffuseFont.mono }]}>{children}</Text>
}

export function DiffuseField(props: {
  value: string; onChangeText: (t: string) => void; placeholder?: string
  secureTextEntry?: boolean; keyboardType?: KeyboardTypeOptions; autoCapitalize?: 'none' | 'words' | 'sentences'
}) {
  const { colors } = useDiffuseTheme()
  return (
    <TextInput
      value={props.value} onChangeText={props.onChangeText} placeholder={props.placeholder}
      placeholderTextColor={colors.ink4} secureTextEntry={props.secureTextEntry}
      keyboardType={props.keyboardType} autoCapitalize={props.autoCapitalize}
      style={[s.field, { color: colors.ink, borderBottomColor: colors.line2, fontFamily: diffuseFont.body }]}
    />
  )
}

export function DiffuseDivider({ label }: { label: string }) {
  const { colors } = useDiffuseTheme()
  return (
    <View style={s.divRow}>
      <View style={[s.divLine, { backgroundColor: colors.line2 }]} />
      <Text style={[s.divLab, { color: colors.ink3, fontFamily: diffuseFont.mono }]}>{label}</Text>
      <View style={[s.divLine, { backgroundColor: colors.line2 }]} />
    </View>
  )
}

const s = StyleSheet.create({
  lab: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  field: { borderBottomWidth: 1.5, paddingVertical: 12, fontSize: 17 },
  divRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 22 },
  divLine: { flex: 1, height: 1 },
  divLab: { fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase' },
})
```

- [ ] **Step 2: tsc clean.** **Step 3: Commit** — `feat(diffuse): bare underline field + divider`.

### Task 4: Flag-branch OnboardingStep shell

**Files:** Modify `components/onboarding/OnboardingStep.tsx`. Reference: `.ob-head`, `.prog`, `.q`, `.cta` in the HTML.

**Interfaces:** Consumes `AuraField`, `AURA`, `DiffuseSolidCTA`, `useIsDiffuse`, `useDiffuseTheme`, `diffuseFont`. Adds two optional props: `auraMode?: 'pre-pregnancy'|'pregnancy'|'kids'` (which AURA recipe family), `progress?: number` (0..1 for the `.prog` bar). Keeps every existing prop + the cream-paper render unchanged.

- [ ] **Step 1:** Add imports + `const diffuse = useIsDiffuse(); const dt = useDiffuseTheme()` at the top of the component; add `auraMode` + `progress` to `OnboardingStepProps`.
- [ ] **Step 2:** Before the existing `return (`, add an `if (diffuse) { return ( … ) }` branch rendering: `<AuraField blooms={...auraMode recipe...}>` wrapping a safe-area column: `.ob-head` row (hairline circular back button using existing `backHandler`, mono step label `${step} / ${total}` uppercase, optional Skip/close as `DiffuseTextLink`), a progress hairline bar (`progress ?? step/total` width, track `dt.colors.line`, fill `getDiffuseAccent(auraMode, dt.isDark)`), the serif question (`diffuseFont.displayLight` fontSize 36 + `diffuseFont.italic` accent for `italicSuffix`), then `children` in the content area, then `DiffuseSolidCTA` pinned bottom (label from `continueLabel` minus the "→"; icon `check` if the label implies finish). No sticker slot.
- [ ] **Step 3:** Leave the existing cream-paper `return` fully intact below.
- [ ] **Step 4: tsc clean.**
- [ ] **Step 5:** Visual check deferred to first onboarding screen (Task 12). **Commit** — `git restore --staged . && git add components/onboarding/OnboardingStep.tsx && git commit -m "feat(diffuse): flag-branch OnboardingStep shell (aura + mono header + progress + solid CTA)"`

---

## Phase 1 — Auth screens (aura = pre-pregnancy palette)

> Each auth screen: add `const diffuse = useIsDiffuse()`; wrap an `if (diffuse) return (<AuraField blooms={AURA.<frame>}> … </AuraField>)` using `DiffuseField`/`DiffuseOAuthRow`/`DiffuseSolidCTA`/`DiffuseTextLink` + serif question; keep all existing auth calls (`signInWithApple`/`signInWithGoogle`/Supabase) and the current cream-paper return. Add the screen's `AURA.<frame>` recipe (transcribed from its HTML frame) to `AuraField.tsx`.

### Task 5: Welcome screen
**Files:** Modify `app/(auth)/welcome.tsx`; add `AURA.welcome` (done in Task 1). Reference: AUTH 01 frame.
- [ ] Add diffuse branch: `AuraField` (welcome recipe) + animated `GrandmaLogo` + "welcome to" mono kicker + serif `grandma` / italic "sees you." + subcopy + two `DiffuseOAuthRow` (Apple/Google, reuse existing OAuth handlers + brand SVGs) + "Already have an account? Sign in" footer (`DiffuseTextLink` → router push sign-in). Keep cream path.
- [ ] tsc clean → visual match AUTH 01 → flag round-trip → Commit `feat(diffuse): welcome screen`.

### Task 6: Sign-in
**Files:** Modify `app/(auth)/sign-in.tsx`; add `AURA.signin`. Reference: AUTH 02.
- [ ] Diffuse branch: back button, serif "Welcome / back, dear.", two `DiffuseOAuthRow`, `DiffuseDivider` "or with email", `DiffuseFieldLabel`+`DiffuseField` for email + password, "Forgot password?" italic link, `DiffuseSolidCTA` "SIGN IN", "New here? Create account" footer. Same auth submit logic.
- [ ] tsc clean → visual match → round-trip → Commit `feat(diffuse): sign-in screen`.

### Task 7: Sign-up
**Files:** Modify `app/(auth)/sign-up.tsx`; add `AURA.signup`. Reference: AUTH 03.
- [ ] Diffuse branch: serif "What should / grandma call you?", fields name/email/password, `DiffuseSolidCTA` "CONTINUE", terms line (mono), footer. Same submit.
- [ ] tsc → match → round-trip → Commit `feat(diffuse): sign-up screen`.

### Task 8: Forgot + reset password
**Files:** Modify `app/(auth)/forgot-password.tsx`, `app/(auth)/reset-password.tsx`; add `AURA.forgot`. Reference: AUTH 04.
- [ ] Diffuse branch each: serif title, email field (forgot) / new-password fields (reset), `DiffuseSolidCTA` ("SEND RESET LINK" / "RESET PASSWORD"), footer link. Same Supabase reset calls.
- [ ] tsc → match → round-trip → Commit `feat(diffuse): forgot + reset password screens`.

---

## Phase 2 — Journey picker + BlobPicker

### Task 9: BlobPicker primitive
**Files:** Create `components/ui/diffuse/pickers/BlobPicker.tsx`. Reference: `.blobpick`/`.bopt`.
**Interfaces:** Produces `BlobPicker({ options, value, onChange })` where `options: { key: string; kicker: string; name: string; color: string; cx: string; cy: string }[]`; selected bloom scales 1.06 + brightens, mono kicker + serif-italic name.
- [ ] **Step 1:** Create component — absolute-positioned bloom circles (`SoftBloom` behind each at `cx/cy`), tap toggles single-select, selected uses higher opacity + `transform scale`. Kicker `diffuseFont.mono` uppercase ink3 (ink on selected), name `diffuseFont.italic` fontSize 27 ink.
- [ ] **Step 2:** tsc clean. **Step 3:** Commit `feat(diffuse): BlobPicker primitive`.

### Task 10: Journey picker screen
**Files:** Modify `app/onboarding/journey.tsx`; add `AURA.journey` (four-corner blooms). Reference: GENERAL 01 + 02.
- [ ] Diffuse branch: `AuraField` + serif "Where are / you right now?" + `BlobPicker` (Cycle `#F2654E`, Pregnancy `#B06AD8`, Kids `#46C173`, Circle `#3F9BD8`) wired to the SAME mode/behavior selection the current picker writes + "Skip for now" `DiffuseTextLink`. Plus the "all set" screen variant (serif "Grandma's with you through all of it." + three chips + `DiffuseSolidCTA` "ENTER GRANDMA"). Keep cream path + all existing selection logic.
- [ ] tsc → match GENERAL 01/02 → round-trip → Commit `feat(diffuse): journey picker + all-set`.

---

## Phase 3 — Cycle onboarding (aura = pre-pregnancy)

> First, re-read `app/onboarding/cycle/index.tsx` to confirm the LIVE step list + each step's state/type (constraint: RN flow wins). Map each live step to the HTML frame's input type below. Wrap the whole flow's per-step render in the diffuse branch, passing `auraMode="pre-pregnancy"` to `OnboardingStep`.

### Task 11: DotCalendar reuse check + BloomChips + SegmentedBloom primitives
**Files:** Create `components/ui/diffuse/pickers/BloomChips.tsx`, `SegmentedBloom.tsx`; confirm `DiffuseDotCalendar` props suffice (extend if the frame needs a `bigDateHeader`).
**Interfaces:**
- `BloomChips({ options, value, onChange, multi?, allowOther? })` — `value: string[]`; hairline mono pills, `.on` firm border, "None" exclusive, "Other +" reveal → `DiffuseField`.
- `SegmentedBloom({ options, value, onChange })` — single-select hairline mono segmented.
- [ ] **Step 1:** Build `BloomChips` (chips from `.chips`/`.chip`/`.other-input` CSS: mono 12px, radius 999, hairline border, `.on` = firm border + subtle bg). **Step 2:** Build `SegmentedBloom` (from `.seg`). **Step 3:** tsc clean. **Step 4:** Commit `feat(diffuse): BloomChips + SegmentedBloom pickers`.

### Task 12: ArcDial primitive (gesture dial) — math TDD
**Files:** Create `lib/diffusePickers/arcDial.ts`, `lib/__tests__/arcDial.test.ts`, `components/ui/diffuse/pickers/ArcDial.tsx`. Reference: `.arcpick` + its JS in the HTML (`CX=-110, CY=170, R=300, STEP=13°`, sizes `[76,42,30,22]`, opacities `[1,.5,.32,.18]`).
**Interfaces:** `arcNumberLayout(sel, min, max): { value, x, y, size, opacity, angleRad }[]` (pure); `ArcDial({ min, max, value, onChange, unit })`.
- [ ] **Step 1: Write failing test**
```ts
// lib/__tests__/arcDial.test.ts
import { arcNumberLayout } from '../diffusePickers/arcDial'
test('centers the selected value with full size + opacity', () => {
  const rows = arcNumberLayout(28, 21, 35)
  const center = rows.find(r => r.value === 28)!
  expect(center.size).toBe(76); expect(center.opacity).toBe(1)
})
test('clamps the window to min/max', () => {
  const rows = arcNumberLayout(21, 21, 35)
  expect(rows.every(r => r.value >= 21)).toBe(true)
})
```
- [ ] **Step 2: Run — expect FAIL** `npx jest lib/__tests__/arcDial.test.ts` → "Cannot find module".
- [ ] **Step 3: Implement `arcDial.ts`** — port the HTML loop (`k=-3..3`, `a=k*STEP`, `x=CX+R*cos(a)`, `y=CY+R*sin(a)`, `size=SIZES[|k|]`, `opacity=OPAC[|k|]`), skipping out-of-range values.
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Build `ArcDial.tsx`** — render numbers via layout, `PanResponder` vertical drag accumulates → `onChange(clamp(value±1))` past a threshold; center value big serif + mono unit. (Same mechanic as `KidsJourneyRing` PanResponder.)
- [ ] **Step 6: tsc clean. Commit** — `git add lib/diffusePickers/arcDial.ts lib/__tests__/arcDial.test.ts components/ui/diffuse/pickers/ArcDial.tsx && git commit -m "feat(diffuse): ArcDial gesture number dial + layout math"`

### Task 13: OrbitPicker primitive — math TDD
**Files:** `lib/diffusePickers/orbit.ts` + test, `components/ui/diffuse/pickers/OrbitPicker.tsx`. Reference: `.orbit`/`.orbnode` (4 nodes on a dashed ellipse at 27/22, 73/22, 27/78, 73/78 %).
**Interfaces:** `orbitNodePositions(count): {left:string; top:string}[]` (pure, supports 4); `OrbitPicker({ options, value, onChange })`.
- [ ] **Step 1:** failing test asserting 4 positions match `['27%','22%']…`. **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS. **Step 5:** build component (dashed `Ellipse` via SVG, dot-node per option, selected `.od` fills accent + bloom ring, serif label). **Step 6:** tsc + Commit `feat(diffuse): OrbitPicker`.

### Task 14: PoleField primitive
**Files:** `components/ui/diffuse/pickers/PoleField.tsx`. Reference: `.polefield`/`.poleblob` (two blooms + diagonal connector).
**Interfaces:** `PoleField({ options: [A,B], value, onChange })` — two `SoftBloom` blobs (top-right, bottom-left) + connecting `Line`, selected scales+brightens, serif label + mono sub.
- [ ] Build → tsc → Commit `feat(diffuse): PoleField binary picker`.

### Task 15: MetaballBloom primitive — feasibility gate + math TDD
**Files:** `lib/diffusePickers/metaball.ts` + test, `components/ui/diffuse/pickers/MetaballBloom.tsx`. Reference: `.bloom`/`.bloomsvg` (goo filter mask + label grid).
- [ ] **Step 0 (feasibility):** verify `react-native-svg` supports `FeGaussianBlur`+`FeColorMatrix` on iOS+Android in a throwaway render. If unsupported → fallback: overlapping `SoftBloom` discs at the label positions (same clustered-bloom feel).
- [ ] **Step 1–4 (math TDD):** `metaballLabelPositions(count): {left,top}[]` from the HTML label `left/top` %; test the 8-label cycle grid.
- [ ] **Step 5:** build component (goo cluster or SoftBloom fallback) + overlaid multi-select labels (mono, dot marker toggles `.on`).
- [ ] **Step 6:** tsc + Commit `feat(diffuse): MetaballBloom multi-select cluster`.

### Task 16: Cycle onboarding screen — compose
**Files:** Modify `app/onboarding/cycle/index.tsx`. Reference: CYCLE 01–08.
- [ ] Add `const diffuse = useIsDiffuse()`; for each live step, in the diffuse render pass `auraMode="pre-pregnancy"` to `OnboardingStep` and swap the input to its Diffuse picker per type: last-period→`DiffuseDotCalendar`, cycle-length→`ArcDial`, regular?→`SegmentedBloom`, period-length→`BloomChips`, conditions→`MetaballBloom`, temp-unit→`SegmentedBloom`, trying-duration→`OrbitPicker`, temp-tracking?→`PoleField`, supplements→`BloomChips`. Every picker wired to the SAME `useCycleOnboardingStore` value it currently sets. Keep cream path.
- [ ] Add each CYCLE frame's `AURA.cycle*` recipe. tsc → visual match each frame → round-trip → Commit `feat(diffuse): cycle onboarding flow`.

---

## Phase 4 — Pregnancy onboarding (aura = pregnancy)

### Task 17: Pregnancy onboarding screen — compose
**Files:** Modify `app/onboarding/pregnancy/index.tsx`. Reference: PREG 01–07. Re-read live steps first.
- [ ] Diffuse branch, `auraMode="pregnancy"`: due-date→`DiffuseDotCalendar`, first-pregnancy?→`PoleField`, feeling→`MetaballBloom`, birth-place→`OrbitPicker`, care-provider→`OrbitPicker`, conditions→`BloomChips`, add-partner→bloom avatar + `DiffuseField` + invite `DiffuseSolidCTA`/`DiffuseTextLink`. Same `usePregnancyOnboardingStore`. Add `AURA.preg*` recipes.
- [ ] tsc → match → round-trip → Commit `feat(diffuse): pregnancy onboarding flow`.

---

## Phase 5 — Kids onboarding (aura = kids) + remaining primitives

### Task 18: AvatarBloomGrid + ChoiceTimeline primitives
**Files:** Create `components/ui/diffuse/pickers/AvatarBloomGrid.tsx`, `ChoiceTimeline.tsx`. Reference: `.avgrid`/`.av`, `.choice`/`.choicecard`.
**Interfaces:** `AvatarBloomGrid({ options, value, onChange })` (4-col bloom circles + thin Lucide glyph, camera tile first, selected ink ring); `ChoiceTimeline({ options, value, onChange })` (connector line + ring nodes, selected wrapped in outline-ellipse).
- [ ] Build both → tsc → Commit `feat(diffuse): AvatarBloomGrid + ChoiceTimeline`.

### Task 19: Kids onboarding screen — compose
**Files:** Modify `app/onboarding/kids/index.tsx`. Reference: KIDS 01–09. Re-read live steps + preserve the multi-child loop.
- [ ] Diffuse branch, `auraMode="kids"`: how-many→`ArcDial`, child-name→`DiffuseField`, birthday→`DiffuseDotCalendar`, country→search `DiffuseField`+`BloomChips`(single), avatar→`AvatarBloomGrid`, allergies→`BloomChips`, conditions→`BloomChips`, add-partner→(as pregnancy), add-caregiver→`ChoiceTimeline`. Same `useKidsOnboardingStore` + multi-child navigation. Add `AURA.kids*` recipes.
- [ ] tsc → match each frame → round-trip → Commit `feat(diffuse): kids onboarding flow`.

---

## Phase 6 — Final sweep

### Task 20: Full flag round-trip + leak audit
- [ ] Toggle Dev Panel variant Current↔Diffuse across every auth + onboarding screen. Verify: Diffuse matches each HTML frame; Current is byte-for-byte the old cream-paper (no Diffuse leak); no cream-paper leak under Diffuse (no `#141313`, filled stickers, or `font.*` in any diffuse path — grep each modified file).
- [ ] `npx tsc --noEmit 2>&1 | grep -v lib/i18n | grep -c "error TS"` → `0`. `npx jest lib/__tests__/arcDial.test.ts lib/__tests__/orbit.test.ts lib/__tests__/metaball.test.ts` → all pass.
- [ ] Commit any fixes: `fix(diffuse): auth+onboarding round-trip polish`.
