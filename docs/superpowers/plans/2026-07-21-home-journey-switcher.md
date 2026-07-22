# Home Journey Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a top-right button on the Home header that opens a dropdown to switch the active journey (Cycle / Expecting / Raising) in one tap.

**Architecture:** A new self-contained `HomeJourneySwitcher` component reads the behavior/mode/child stores directly, renders a sticker trigger, and opens a `Modal`-based popover listing all three journeys. It mounts through a new optional `trailing` slot on the shared `HomeGreeting`, which all three behavior homes pass. Switching uses the canonical `switchTo` + `setMode` pair (no navigation — the `(tabs)/_layout` crossfade handles the visible swap).

**Tech Stack:** React Native 0.81 + React 19, Expo Router v6, Zustand v5, TypeScript strict, Jest + `@testing-library/react-native`. RN's built-in `Animated` for the popover entrance (not reanimated — avoids mock ambiguity in tests).

## Global Constraints

- **Tokens only** — no raw hex/radius/font/shadow in JSX. Import from `constants/theme.ts`. Raw hex allowed only in sticker/illustration SVG path files.
- **Both variants** — cream-paper (`useTheme()`) and Diffuse (`useDiffuseTheme()` + `useIsDiffuse()`), never mixed. Stickers stay active under Diffuse.
- **Mode color** via `getModeColor(behavior, isDark)` / `getDiffuseAccent(behavior, isDark)` — never hardcode per mode. Soft tints via `getModeColorSoft` / `getDiffuseAccentSoft`.
- **Shadows** only `shadows.card / cardPop / pop / subtle` — never `glow*`.
- **Canonical switch** = `useBehaviorStore.switchTo(b)` **and** `useModeStore.setMode(b)`. Do NOT reuse `ModeSwitcher` (it only flips `setMode` and drifts).
- **No navigation on enrolled switch** — Home is mounted; `app/(tabs)/_layout.tsx` crossfades on `currentBehavior`. Non-enrolled → `router.push('/onboarding/journey', { addMode: 'true', preselect: b })`.
- **Self-gate** — render `null` in a caregiver context (`activeChild && activeChild.caregiverRole !== 'parent'`).
- **Labels honor `cycleIntent`** — pre-pregnancy label is `'Dreaming'` when `cycleIntent === 'ttc'`, else `'Cycle'`. Pregnancy = `'Expecting'`, kids = `'Raising'`.
- **Zustand v5 named import**; **Expo Router** `router.push` (never `navigation.navigate`).
- Commands: `npm test` (jest), `npm run typecheck` (tsc --noEmit).

---

### Task 1: `HomeJourneySwitcher` component

**Files:**
- Create: `components/home/HomeJourneySwitcher.tsx`
- Test: `components/home/__tests__/HomeJourneySwitcher.test.tsx`

**Interfaces:**
- Consumes: `useBehaviorStore` (`currentBehavior`, `enrolledBehaviors`, `switchTo`, type `Behavior`), `useModeStore` (`setMode`, `cycleIntent`), `useChildStore` (`activeChild`), theme helpers, `ModeTrying/ModePregnant/ModeParent` from `../stickers/RewardStickers`, `MonoCaps` from `../ui/Typography`, `SoftBloom`/`useIsDiffuse` from `../ui/diffuse/DiffuseKit`, `ChevronDown` from `lucide-react-native`, `router` from `expo-router`.
- Produces: `export function HomeJourneySwitcher(): JSX.Element | null` — takes no props; reads all state internally.

- [ ] **Step 1: Write the failing test**

Create `components/home/__tests__/HomeJourneySwitcher.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native'
import { HomeJourneySwitcher } from '../HomeJourneySwitcher'
import { useBehaviorStore } from '../../../store/useBehaviorStore'
import { useModeStore } from '../../../store/useModeStore'
import { useChildStore } from '../../../store/useChildStore'

const pushMock = jest.fn()
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => pushMock(...a) } }))

function seed({
  enrolled = ['pre-pregnancy', 'pregnancy'],
  current = 'pre-pregnancy',
  caregiverRole,
}: { enrolled?: string[]; current?: string | null; caregiverRole?: string } = {}) {
  useBehaviorStore.setState({ enrolledBehaviors: enrolled as never, currentBehavior: current as never })
  useModeStore.setState({ mode: (current ?? 'kids') as never, cycleIntent: 'tracking' })
  useChildStore.setState({ activeChild: caregiverRole ? ({ id: 'c1', caregiverRole } as never) : null })
}

afterEach(() => {
  pushMock.mockClear()
  useBehaviorStore.setState({ enrolledBehaviors: [], currentBehavior: null })
  useModeStore.setState({ mode: 'kids', cycleIntent: 'tracking' })
  useChildStore.setState({ activeChild: null, children: [] })
})

describe('HomeJourneySwitcher', () => {
  it('renders a trigger labelled with the active journey', () => {
    seed({ current: 'pre-pregnancy' })
    const { queryByLabelText } = render(<HomeJourneySwitcher />)
    expect(queryByLabelText(/Switch journey, currently Cycle/)).toBeTruthy()
  })

  it('renders null in a caregiver context', () => {
    seed({ caregiverRole: 'nanny' })
    const { queryByLabelText } = render(<HomeJourneySwitcher />)
    expect(queryByLabelText(/Switch journey/)).toBeNull()
  })

  it('opens a dropdown listing all three journeys', () => {
    seed()
    const { getByLabelText, queryByText } = render(<HomeJourneySwitcher />)
    fireEvent.press(getByLabelText(/Switch journey/))
    expect(queryByText('Cycle')).toBeTruthy()
    expect(queryByText('Expecting')).toBeTruthy()
    expect(queryByText('Raising')).toBeTruthy()
  })

  it('switches behavior + mode when tapping an enrolled journey', () => {
    seed({ enrolled: ['pre-pregnancy', 'pregnancy'], current: 'pre-pregnancy' })
    const { getByLabelText } = render(<HomeJourneySwitcher />)
    fireEvent.press(getByLabelText(/Switch journey/))
    fireEvent.press(getByLabelText('Switch to Expecting'))
    expect(useBehaviorStore.getState().currentBehavior).toBe('pregnancy')
    expect(useModeStore.getState().mode).toBe('pregnancy')
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('routes to onboarding when tapping a not-enrolled journey', () => {
    seed({ enrolled: ['pre-pregnancy'], current: 'pre-pregnancy' })
    const { getByLabelText } = render(<HomeJourneySwitcher />)
    fireEvent.press(getByLabelText(/Switch journey/))
    fireEvent.press(getByLabelText('Start Raising journey'))
    expect(pushMock).toHaveBeenCalledWith({
      pathname: '/onboarding/journey',
      params: { addMode: 'true', preselect: 'kids' },
    })
    expect(useBehaviorStore.getState().currentBehavior).toBe('pre-pregnancy')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- HomeJourneySwitcher`
Expected: FAIL — `Cannot find module '../HomeJourneySwitcher'`.

- [ ] **Step 3: Write the component**

Create `components/home/HomeJourneySwitcher.tsx`:

```tsx
/**
 * HomeJourneySwitcher — top-right Home header control that opens a dropdown to
 * switch the active journey (Cycle / Expecting / Raising). Additive; the Profile
 * MyJourneyPillGrid remains the canonical full switcher.
 *
 * Self-gates to null in a caregiver context — switching someone else's child's
 * journey is meaningless there.
 */
import { useRef, useState } from 'react'
import { View, Text, Pressable, Modal, StyleSheet, Animated, Easing } from 'react-native'
import { ChevronDown } from 'lucide-react-native'
import { router } from 'expo-router'
import {
  useTheme, useDiffuseTheme, diffuseFont, shadows,
  getModeColor, getModeColorSoft, getDiffuseAccent, getDiffuseAccentSoft,
} from '../../constants/theme'
import { useIsDiffuse, SoftBloom } from '../ui/diffuse/DiffuseKit'
import { useBehaviorStore, type Behavior } from '../../store/useBehaviorStore'
import { useModeStore } from '../../store/useModeStore'
import { useChildStore } from '../../store/useChildStore'
import { ModeTrying, ModePregnant, ModeParent } from '../stickers/RewardStickers'
import { MonoCaps } from '../ui/Typography'

const ICON_BY_BEHAVIOR = {
  'pre-pregnancy': ModeTrying,
  pregnancy: ModePregnant,
  kids: ModeParent,
} as const

const ORDER: Behavior[] = ['pre-pregnancy', 'pregnancy', 'kids']

export function HomeJourneySwitcher() {
  const { colors, radius, isDark, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()

  const currentBehavior = useBehaviorStore((s) => s.currentBehavior)
  const enrolled = useBehaviorStore((s) => s.enrolledBehaviors)
  const switchTo = useBehaviorStore((s) => s.switchTo)
  const setMode = useModeStore((s) => s.setMode)
  const cycleIntent = useModeStore((s) => s.cycleIntent)
  const activeChild = useChildStore((s) => s.activeChild)

  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState({ top: 96, right: 20 })
  const triggerRef = useRef<View>(null)
  const anim = useRef(new Animated.Value(0)).current

  // Caregiver context: switching another family's journey is meaningless.
  const isCaregiverContext = !!activeChild && activeChild.caregiverRole !== 'parent'
  if (isCaregiverContext || !currentBehavior) return null

  const ink = diffuse ? dt.colors.ink : colors.text
  const inkMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const cardBg = diffuse ? dt.colors.surface : colors.surface
  const line = diffuse ? dt.colors.line : colors.border

  const labelFor = (b: Behavior) =>
    b === 'pre-pregnancy'
      ? (cycleIntent === 'ttc' ? 'Dreaming' : 'Cycle')
      : b === 'pregnancy' ? 'Expecting' : 'Raising'

  const ActiveIcon = ICON_BY_BEHAVIOR[currentBehavior]

  function openMenu() {
    // Drop the card just beneath the trigger, right-aligned. Guard measureInWindow
    // so the component stays testable (host instances may lack it under jest).
    const node = triggerRef.current
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((_x, y, _w, h) => setAnchor({ top: y + h + 6, right: 20 }))
    }
    setOpen(true)
    anim.setValue(0)
    Animated.timing(anim, {
      toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start()
  }

  function handleSelect(b: Behavior) {
    setOpen(false)
    if (b === currentBehavior) return
    if (!enrolled.includes(b)) {
      router.push({ pathname: '/onboarding/journey', params: { addMode: 'true', preselect: b } })
      return
    }
    // Canonical switch: behavior + mode in sync. No navigation — we're already on
    // Home and (tabs)/_layout crossfades when currentBehavior changes.
    switchTo(b)
    setMode(b)
  }

  return (
    <>
      <Pressable
        ref={triggerRef}
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel={`Switch journey, currently ${labelFor(currentBehavior)}`}
        hitSlop={8}
        style={[styles.trigger, { backgroundColor: diffuse ? 'transparent' : colors.surface, borderColor: line }]}
      >
        {diffuse ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <SoftBloom color={getDiffuseAccent(currentBehavior, dt.isDark)} opacity={dt.isDark ? 0.4 : 0.5} spread={0.5} radius="60%" />
          </View>
        ) : null}
        <ActiveIcon size={26} />
        <View style={[styles.chevronDot, { backgroundColor: cardBg, borderColor: line }]}>
          <ChevronDown size={9} color={inkMuted} strokeWidth={2.5} />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close journey switcher" />
          <Animated.View
            style={[
              styles.card,
              shadows.cardPop,
              {
                top: anchor.top, right: anchor.right,
                backgroundColor: cardBg, borderColor: line, borderRadius: radius.lg,
                opacity: anim,
                transform: [
                  { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
                  { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
                ],
              },
            ]}
          >
            {diffuse ? (
              <Text style={[styles.header, { fontFamily: diffuseFont.mono, color: inkMuted, letterSpacing: 1.6 }]}>SWITCH JOURNEY</Text>
            ) : (
              <MonoCaps color={inkMuted} style={styles.header}>SWITCH JOURNEY</MonoCaps>
            )}
            {ORDER.map((b) => {
              const Icon = ICON_BY_BEHAVIOR[b]
              const isActive = b === currentBehavior
              const isEnrolled = enrolled.includes(b)
              const accent = diffuse ? getDiffuseAccent(b, dt.isDark) : getModeColor(b, isDark)
              const accentSoft = diffuse ? getDiffuseAccentSoft(b, dt.isDark) : getModeColorSoft(b, isDark)
              return (
                <Pressable
                  key={b}
                  onPress={() => handleSelect(b)}
                  disabled={isActive}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isActive ? `${labelFor(b)}, current journey`
                    : isEnrolled ? `Switch to ${labelFor(b)}`
                    : `Start ${labelFor(b)} journey`
                  }
                  style={({ pressed }) => [
                    styles.row,
                    { opacity: isActive ? 1 : isEnrolled ? (pressed ? 0.55 : 1) : 0.5 },
                  ]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: isActive ? accentSoft : 'transparent' }]}>
                    <Icon size={24} />
                  </View>
                  <Text
                    style={[styles.rowLabel, { color: ink, fontFamily: diffuse ? diffuseFont.display : font.display }]}
                    allowFontScaling={false}
                  >
                    {labelFor(b)}
                  </Text>
                  <View style={{ flex: 1 }} />
                  {isActive ? (
                    <Text style={[styles.tag, { color: accent, fontFamily: diffuse ? diffuseFont.mono : font.body }]}>ACTIVE</Text>
                  ) : !isEnrolled ? (
                    <Text style={[styles.tag, { color: inkMuted, fontFamily: diffuse ? diffuseFont.mono : font.body }]}>+ ADD</Text>
                  ) : null}
                </Pressable>
              )
            })}
          </Animated.View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  chevronDot: {
    position: 'absolute', right: -1, bottom: -1,
    width: 16, height: 16, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  overlay: { flex: 1 },
  card: { position: 'absolute', width: 236, borderWidth: 1, padding: 8 },
  header: { fontSize: 10, letterSpacing: 1.2, marginHorizontal: 8, marginTop: 4, marginBottom: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 8, borderRadius: 14,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 16, fontWeight: '600' },
  tag: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
})
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- HomeJourneySwitcher`
Expected: PASS — all 5 tests green. (A `useNativeDriver` console warning from jest is harmless.)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/home/HomeJourneySwitcher.tsx components/home/__tests__/HomeJourneySwitcher.test.tsx
git commit -m "feat(home): journey switcher dropdown component"
```

---

### Task 2: Mount the switcher via a `HomeGreeting` trailing slot

**Files:**
- Modify: `components/home/HomeGreeting.tsx`
- Test: `components/home/__tests__/HomeGreeting.test.tsx` (create)
- Modify: `components/home/CycleHome.tsx:176`
- Modify: `components/home/PregnancyHome.tsx:303-307`
- Modify: `components/home/KidsHome.tsx:1515-1518`

**Interfaces:**
- Consumes: `HomeJourneySwitcher` from Task 1; existing `HomeGreeting` props (`name`, `microLabel`, `size`, `showLogo`, `logoSize`).
- Produces: `HomeGreeting` gains optional `trailing?: ReactNode` rendered right-aligned in the header row.

- [ ] **Step 1: Write the failing test**

Create `components/home/__tests__/HomeGreeting.test.tsx`:

```tsx
import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { HomeGreeting } from '../HomeGreeting'

describe('HomeGreeting', () => {
  it('renders the greeting name', () => {
    const { queryByText } = render(<HomeGreeting name="Ada" showLogo={false} />)
    expect(queryByText('Ada')).toBeTruthy()
  })

  it('renders a trailing slot when provided', () => {
    const { queryByText } = render(
      <HomeGreeting name="Ada" showLogo={false} trailing={<Text>TRAIL</Text>} />
    )
    expect(queryByText('TRAIL')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- HomeGreeting`
Expected: FAIL — the `trailing` test fails (prop not rendered); TS also flags the unknown `trailing` prop.

- [ ] **Step 3: Add the `trailing` prop to `HomeGreeting`**

In `components/home/HomeGreeting.tsx`:

Add the React type import at the top (after the existing imports):

```tsx
import type { ReactNode } from 'react'
```

Add `trailing` to the props interface (inside `interface HomeGreetingProps { ... }`):

```tsx
  /** Optional right-aligned control (e.g. the journey switcher). */
  trailing?: ReactNode
```

Add `trailing` to the destructured params (in `export function HomeGreeting({ ... })`):

```tsx
  trailing,
```

Render it as the last child of the header row — immediately after the closing `</View>` of the `<View style={{ flex: 1 }}>` text column and before the `</View>` that closes `styles.wrap`:

```tsx
        {trailing ? <View style={{ flexShrink: 0 }}>{trailing}</View> : null}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- HomeGreeting`
Expected: PASS — both tests green.

- [ ] **Step 5: Pass the switcher from CycleHome**

In `components/home/CycleHome.tsx`, add the import alongside the existing `HomeGreeting` import:

```tsx
import { HomeJourneySwitcher } from './HomeJourneySwitcher'
```

Change line 176 from:

```tsx
          <HomeGreeting name={displayName} microLabel={microLabel} />
```

to:

```tsx
          <HomeGreeting name={displayName} microLabel={microLabel} trailing={<HomeJourneySwitcher />} />
```

- [ ] **Step 6: Pass the switcher from PregnancyHome**

In `components/home/PregnancyHome.tsx`, add the import alongside the existing `HomeGreeting` import:

```tsx
import { HomeJourneySwitcher } from './HomeJourneySwitcher'
```

Change the greeting block (lines 303-307) from:

```tsx
          <HomeGreeting
            name={displayName}
            microLabel={t('pregnancy_weekDay', { week: weekNumber, weekday: weekdayLabel })}
          />
```

to:

```tsx
          <HomeGreeting
            name={displayName}
            microLabel={t('pregnancy_weekDay', { week: weekNumber, weekday: weekdayLabel })}
            trailing={<HomeJourneySwitcher />}
          />
```

(The `caregiverView ? <CaregiverIdentityHeader /> : <HomeGreeting .../>` branch is unchanged — the switcher also self-gates, so this is belt-and-suspenders.)

- [ ] **Step 7: Pass the switcher from KidsHome**

In `components/home/KidsHome.tsx`, add the import alongside the existing `HomeGreeting` import:

```tsx
import { HomeJourneySwitcher } from './HomeJourneySwitcher'
```

Change the greeting block (lines 1515-1518) from:

```tsx
        <HomeGreeting
          name={firstName}
          microLabel={subtitleForRange(dateRange, child.name, customRange)?.toUpperCase?.()}
        />
```

to:

```tsx
        <HomeGreeting
          name={firstName}
          microLabel={subtitleForRange(dateRange, child.name, customRange)?.toUpperCase?.()}
          trailing={<HomeJourneySwitcher />}
        />
```

- [ ] **Step 8: Typecheck + full test run**

Run: `npm run typecheck && npm test`
Expected: no TS errors; all tests green (including the two new suites).

- [ ] **Step 9: Commit**

```bash
git add components/home/HomeGreeting.tsx components/home/__tests__/HomeGreeting.test.tsx \
  components/home/CycleHome.tsx components/home/PregnancyHome.tsx components/home/KidsHome.tsx
git commit -m "feat(home): mount journey switcher in all three home headers"
```

---

### Task 3: Manual verification (simulator, both variants)

**Files:** none — verification only.

This UI spans three homes and two theme variants that aren't unit-tested; verify by hand.

- [ ] **Step 1: Launch the app**

Run: `npm start` (then open on the iOS Simulator). If a native rebuild is needed: `npm run eas:install:sim`.

- [ ] **Step 2: Verify the trigger + dropdown (cream-paper)**

With ≥1 journey enrolled, on each home (Cycle, Pregnancy, Kids):
- A round sticker button with a small chevron appears at the top-right of the header.
- Tapping it drops a card beneath the button, right-aligned, listing Cycle / Expecting / Raising.
- The active journey shows the "ACTIVE" tag and its accent-tinted icon; enrolled ones are tappable; not-enrolled ones are dimmed with "+ ADD".
- Tapping an enrolled journey closes the card and crossfades Home into that journey (no flash, no manual nav).
- Tapping "+ ADD" opens `/onboarding/journey` with the correct journey preselected.
- Tapping outside the card (scrim) dismisses it.

- [ ] **Step 3: Verify the Diffuse variant**

Dev Panel → DESIGN VARIANT → Diffuse. Repeat Step 2: trigger is transparent with a soft accent bloom behind the sticker; card uses Diffuse paper/hairline; labels use the Diffuse fonts. No cream-paper bleed-through.

- [ ] **Step 4: Verify the caregiver gate**

Dev Panel → "Simulate Caregiver" (or switch the active child to one you're a caregiver for). Confirm the switcher button does **not** appear on the caregiver home.

- [ ] **Step 5: Verify `cycleIntent` label**

With `cycleIntent === 'ttc'`, confirm the pre-pregnancy row/label reads "Dreaming"; otherwise "Cycle".

---

## Self-Review

**Spec coverage:**
- New `HomeJourneySwitcher`, additive, no store/schema change → Task 1. ✅
- Trigger = active journey sticker + chevron, paper circle / Diffuse bloom → Task 1 Step 3. ✅
- Dropdown lists all three; active/enrolled/not-enrolled states; "+ Add" routes to onboarding → Task 1 Step 3 + tests. ✅
- Popover anchored under trigger, right-aligned, scrim dismiss, entrance animation → Task 1 Step 3. ✅
- Canonical `switchTo` + `setMode`, no navigation on enrolled switch → Task 1 `handleSelect` + test. ✅
- Self-gate in caregiver context → Task 1 early return + test; also PregnancyHome already branches. ✅
- Mounts via `HomeGreeting` trailing slot in all three homes → Task 2. ✅
- Both variants, tokens only, `getModeColor`/`getDiffuseAccent` → Task 1 + Global Constraints; verified in Task 3. ✅
- `cycleIntent`-aware labels → `labelFor` + Task 3 Step 5. ✅

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every command has expected output. ✅

**Type consistency:** `Behavior` literal used throughout; `getModeColor`/`getModeColorSoft`/`getDiffuseAccent`/`getDiffuseAccentSoft` accept the behavior literal (verified against `constants/theme.ts`); `HomeJourneySwitcher` is prop-less in Task 1 and consumed prop-less in Task 2; `trailing?: ReactNode` defined in Task 2 Step 3 and passed as `trailing={<HomeJourneySwitcher />}` in Steps 5-7. ✅
