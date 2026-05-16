# Shared Onboarding Audit — 2026-05-15

**Scope:** `app/onboarding/_layout.tsx`, `journey.tsx`, `parent-name.tsx`, `transition.tsx`, `activities.tsx`, `baby-name.tsx`, `child-profile.tsx`, `due-date.tsx`; `store/useJourneyStore.ts`, `useOnboardingStore.ts`, `useModeStore.ts`, `useBehaviorStore.ts`.

---

## Routing Flowchart (actual, live code)

**Fresh user, first launch:**
```
_layout.tsx route guard
  → /onboarding/journey                       (mode picker)
      ├─ user selects 1+ behaviors → buildQueue + enroll + setMode + switchTo
      └─ router.push(FIRST_ROUTE[first])
           ├─ pre-pregnancy → /onboarding/cycle/index
           ├─ pregnancy     → /onboarding/pregnancy/index
           └─ kids          → /onboarding/kids/index
                ↓ saveAndFinish → useOnboardingComplete
                hasNext? → /onboarding/transition?next=<behavior>
                              ↓ auto-advance or "Let's go"
                              → FIRST_ROUTE[next]  (loops)
                !hasNext → /(tabs)
```

**Add-mode (from Profile, `?addMode=true`):** `journey → enroll + buildQueue + setMode + switchTo → router.replace(FIRST_ROUTE[behavior])`.

**Five screens have ZERO inbound navigation:** `parent-name`, `baby-name`, `activities`, `due-date` (as shared), `child-profile`. They exist but no live path reaches them.

---

## P0 — Blockers

### P0-1 — Five shared screens are unreachable (dead code or broken intent)
**Files:** `parent-name.tsx`, `baby-name.tsx`, `activities.tsx`, `due-date.tsx`, `child-profile.tsx`

`journey.tsx` jumps directly into mode-specific `index.tsx`. Nothing pushes to these screens. If they were ever meant to be a shared prefix, the wiring is missing. Decide: delete or wire.

### P0-2 — `activities.tsx:86` hardcodes `router.push('/onboarding/child-profile')`
Mode-agnostic — would drop pre-preg / pregnancy users into a kids child-profile form that inserts a `children` row. Currently latent because unreachable.

### P0-3 — `useOnboardingStore` is not persisted; multi-mode queue lost on app kill
**File:** `store/useOnboardingStore.ts:37-80`

Plain `create<>()` with no `persist`. User kills app between mode 1 of 2 and mode 2 → guard sees `enrolledBehaviors.length>0` → routes to `/(tabs)` → mode 2 is silently skipped (no data ever collected). Either persist the store, or have the root guard re-queue any enrolled behavior that has no matching `behaviors` Supabase row.

### P0-4 — `child-profile.tsx:45` treats pre-pregnancy as pregnancy
```ts
const isPregnancy = mode === 'pregnancy' || mode === 'pre-pregnancy'
```
Then inserts `children` row with name `"Baby"`. A pre-pregnancy user has no baby. Phantom child rows pollute kids-mode home if mode is ever switched.

### P0-5 — `parentName` never written to `profiles.name`
None of the three per-mode `saveAndFinish` paths read `useJourneyStore.parentName` or upsert it to `profiles`. Grandma references the user's name from a memory-only store; on reinstall the name is gone.

### P0-6 — `trackedActivities` excluded from `partialize`; never reaches Supabase
**File:** `store/useJourneyStore.ts:56`. Collected for show, dropped on app restart, never sent to nana-chat / insights. Zero downstream effect.

---

## P1 — Correctness / UX

### P1-1 — Auto-advance timer in `transition.tsx` captures stale closure
**File:** `app/onboarding/transition.tsx:84-91` — `setTimeout` captures `nextBehavior` at mount; if the component remounts in place (same stack position) the old timer can fire against the wrong behavior.

### P1-2 — `router.replace('/(tabs)')` called during render
**File:** `transition.tsx:129` — triggers React's "cannot update during render" warning in strict mode + double-nav risk on React 19 concurrent. Wrap in `useEffect`.

### P1-3 — Step counters contradict each other
`child-profile.tsx:142` shows "4 / 10"; `due-date.tsx:90` shows "4 / 10"; `baby-name.tsx:60` shows "5 / 10" (pregnancy) or "4 / 10" (kids). Inconsistent for a flow that doesn't actually run.

### P1-4 — Root guard considers onboarding complete after one `toggleBehavior` tap
**File:** `app/_layout.tsx:252`
```ts
const hasCompletedOnboarding = enrolledBehaviors.length > 0 || hasChildren
```
`journey.tsx:91` calls `toggleBehavior(b)` on every card press (writes to persisted `useBehaviorStore`). User taps "kids" → kills app → guard considers them done → lands in `/(tabs)` in kids mode with no data. Should also require a matching `behaviors` row in Supabase, or an explicit `onboardingCompleted` boolean set only inside `saveAndFinish`.

### P1-5 — `child-profile.tsx:144` "Skip" calls `save()` (writes a phantom child)
Skip should `router.replace('/(tabs)')` without writing.

### P1-6 — First-time `journey.tsx` mutates persisted store optimistically
Add-mode buffers selections into local state (`newSelections`); first-time flow doesn't. Mid-flow deselects briefly persist into `enrolledBehaviors`.

### P1-7 — `due-date.tsx` parses date strings as UTC
**File:** `due-date.tsx:37-43`. `new Date('2025-11-01')` = UTC midnight → off-by-one week for evening users west of UTC. Use `toDateStr` + `'T00:00:00'` suffix.

### P1-8 — Hardcoded `#141313` and `#FFFFFF`
`transition.tsx:264-265` (`borderColor`, `shadowColor`), `transition.tsx:274` + each completion screen (`color: '#FFFFFF'`). Use `colors.text` / `PillButton`.

### P1-9 — Completion CTAs use `radius.lg` not `radius.full`
`pregnancy/index.tsx:651`, `kids/index.tsx:1044`. Buttons must be pills.

### P1-10 — `journey.tsx` uses `as any` to satisfy router types
`router.push(FIRST_ROUTE[first] as any)` — drops typed-route safety; non-null assertion on `currentOnboarding` will crash if `selections` is empty due to deselection race.

---

## P2 — Polish

- Redundant `isDark ? colors.bg : '#F3ECD9'` patterns across all 4 screens — `colors.bg` already returns the right value.
- `activities.tsx` header has no step counter while every other screen does.
- `journey.tsx` introduces a parallel `modeKey: 'pre' | 'preg' | 'kids'` alias vocabulary — drop and use canonical `Behavior` ids.
- `transition.tsx` and completion screens hardcode `fontFamily: 'Fraunces_600SemiBold'` instead of `font.display`.
- `useJourneyStore.Journey` type still lists `'newborn' | 'toddler'` (vestigial; never set).
- `cycle/index.tsx:111-113` inserts `behaviors.type = 'cycle'`; `_layout.tsx:225` remaps `'cycle' → 'pre-pregnancy'`. Two vocabularies bridged by a fragile remap.
- No i18n on any shared onboarding screen.
- No `accessibilityLabel` on `journey.tsx` cards or `transition.tsx` CTA.

---

## Mode-Contract Verdict

- **Mode-safe** for the reachable screens (`journey.tsx`, `transition.tsx`, three per-mode steppers).
- **Not mode-safe** for the 5 dead-end shared screens (`child-profile.tsx` is actively wrong).

**6 P0 issues — fix before shipping.**
