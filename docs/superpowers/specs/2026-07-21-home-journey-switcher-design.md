# Home journey switcher — top-right dropdown

**Date:** 2026-07-21
**Status:** Approved, ready for implementation plan

## Problem

Switching the active journey (Cycle / Expecting / Raising) today requires leaving
Home, opening Settings/Profile, and tapping the "MY JOURNEY" grid
(`MyJourneyPillGrid`). That's a 3-tap detour for a common action. We want a
one-tap switcher on Home: a small button in the top-right of the header that opens
a dropdown of the user's journeys, tap to switch.

## Decision (locked)

- **New additive component** `components/home/HomeJourneySwitcher.tsx`. Self-contained
  (reads the stores itself). Purely additive — the old `ModeSwitcher` and the Profile
  `MyJourneyPillGrid` are untouched. No new store, no schema change.
- **Trigger** = the **active journey's mode sticker** in a ~40px paper circle, with a
  small chevron-down hint. Mounts inside the shared `HomeGreeting` as a trailing slot,
  so all three homes get it for free.
- **Dropdown shows all three journeys** — enrolled ones tap to switch, not-yet-started
  ones appear faded with a "+ Add" affordance (mirrors the grid's one-stop behavior).
- Interaction is a **popover** anchored under the trigger (not a bottom sheet), per the
  user's "beautiful dropdown" ask.

## Switching mechanics (the canonical path — do NOT reuse `ModeSwitcher`)

`ModeSwitcher` only flips `useModeStore.setMode` and would drift from the behavior
store. The canonical switch (from `MyJourneyPillGrid`) is:

- **Enrolled target** → `useBehaviorStore.switchTo(b)` **and** `useModeStore.setMode(b)`,
  then close the popover. **No navigation** — Home is already mounted, and the crossfade
  in `app/(tabs)/_layout.tsx` (which watches `currentBehavior`) plays the same smooth
  swap. (The grid additionally calls `router.navigate('/(tabs)')` only because it lives
  on the Profile tab; here we're already on Home, so we omit it.)
- **Not-enrolled target** → `router.push({ pathname: '/onboarding/journey', params: {
  addMode: 'true', preselect: b } })`, then close the popover.
- **Active target** → no-op (row is non-interactive).

## Component design

**File:** `components/home/HomeJourneySwitcher.tsx`

State/data read directly:
- `useBehaviorStore`: `currentBehavior`, `enrolledBehaviors`, `switchTo`
- `useModeStore`: `setMode`, `cycleIntent`
- `useChildStore`: `activeChild` (for the caregiver gate)
- `useTheme()` / `useDiffuseTheme()` / `useIsDiffuse()` for styling

**Self-gate to `null`** when in a caregiver context (`activeChild &&
activeChild.caregiverRole !== 'parent'`) — switching someone else's child's journey is
meaningless there. (When `enrolledBehaviors.length` is 1 the switcher still renders, so
the user can start another journey via "+ Add".)

**Journey list** (single source, reused for the ordering + labels):
`[{ behavior: 'pre-pregnancy', label }, { behavior: 'pregnancy', label: 'Expecting' },
{ behavior: 'kids', label: 'Raising' }]`, where the pre-pregnancy label is
`cycleIntent === 'ttc' ? 'Dreaming' : 'Cycle'`. Icons via
`{ 'pre-pregnancy': ModeTrying, pregnancy: ModePregnant, kids: ModeParent }` from
`components/stickers/RewardStickers`.

**Trigger button**
- ~40px round `Pressable`, showing the active behavior's mode sticker.
- Cream-paper: `colors.surface` bg + hairline `colors.border`. Diffuse: transparent +
  `dt.colors.line`, with a `SoftBloom` (accent = `getDiffuseAccent(behavior, isDark)`)
  behind the sticker to echo the grid.
- Small chevron-down glyph bottom-right to signal a menu.
- `accessibilityRole="button"`, `accessibilityLabel` ≈ "Switch journey, currently {label}".

**Popover**
- Opened via a transparent `Modal` (`animationType="none"`, `transparent`) with a
  full-screen dismiss scrim (`Pressable` → close).
- On open, measure the trigger with `measureInWindow` and store `{ x, y, width, height }`;
  position the card just below the trigger (`top = y + height + 6`), **right-aligned** to
  the screen edge with a ~16px margin (clamp so it never overflows left).
- Card animates in with fade + small scale (`react-native-reanimated`, respecting reduced
  motion — a plain fade is acceptable). Card = `radius.lg`, `colors.surface` /
  `dt.colors.surface`, hairline border, `shadows.card` (never `glow*`).
- Header micro-label "SWITCH JOURNEY" (mono-caps in Diffuse, `MonoCaps` otherwise).
- Rows (one per journey): sticker + label + trailing state:
  - **Active** → accent tint (`getModeColor` / `getDiffuseAccent`) + "ACTIVE" tag; not
    tappable.
  - **Enrolled, inactive** → tappable, neutral.
  - **Not enrolled** → dimmed (~0.5 opacity) + "+ Add" trailing affordance; tap routes to
    onboarding.

## Placement / wiring

- `HomeGreeting` gains an optional trailing slot. Preferred: add an optional
  `trailing?: React.ReactNode` prop rendered at the end of the header row
  (`justifyContent`/flex so the greeting text keeps `flex: 1` and the trailing sits
  right). The three homes pass `<HomeJourneySwitcher />`.
  - Rationale for a prop (vs. hardcoding the switcher inside `HomeGreeting`): keeps
    `HomeGreeting` presentational and lets a caller omit it, but the switcher's own
    caregiver self-gate means passing it unconditionally from all three homes is safe.
- `HomeGreeting` is only consumed by `CycleHome`, `PregnancyHome`, `KidsHome` — no other
  surface is affected.

## Both variants + tokens

- All colors/radii/fonts/shadows from `useTheme()` / `useDiffuseTheme()` — no raw hex.
- Accent via `getModeColor(behavior, isDark)` (current) and `getDiffuseAccent(behavior,
  dt.isDark)` (Diffuse). Stickers stay active under Diffuse (they are the icon system).

## Out of scope (YAGNI)

- `ModeSwitcher` (legacy; left as-is) and `MyJourneyPillGrid` (Profile switcher; unchanged).
- Any store or DB change.
- Reordering / renaming journeys, per-journey settings — not in this feature.
- A generic reusable popover primitive — build the popover inline for this one use; extract
  later only if a second caller appears.

## Success criteria

- A top-right button appears in the Home header for all three behavior homes (not in a
  caregiver context), showing the active journey's sticker.
- Tapping opens a dropdown listing all three journeys with correct active / enrolled /
  not-enrolled states and `cycleIntent`-aware labels.
- Tapping an enrolled, inactive journey switches the app (behavior + mode in sync) with the
  existing `_layout` crossfade and no manual navigation; the popover closes.
- Tapping a not-enrolled journey opens `/onboarding/journey` with `addMode` + `preselect`.
- Renders correctly in both cream-paper and Diffuse; tokens only; typecheck clean.
