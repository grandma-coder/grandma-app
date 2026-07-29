# Code Review Fix Plan

**Branch:** main
**Scope:** single commit `989d2ab` — "feat(menopause): direct onboarding flow + ephemeral store + journey option (U6)"
**Date:** 2026-07-28
**Commits reviewed:** 1 (989d2ab)
**Unit:** U6 of `docs/superpowers/plans/2026-07-25-menopause-behavior-foundation.md` (orchestration run `orchestration-menopause-behavior-foundation-2026-07-26`)

## Summary

U6 adds `store/useMenopauseOnboardingStore.ts` (ephemeral answer buffer), `app/onboarding/menopause/index.tsx` (620-line stepped flow: intro → stage → last-period → symptoms → HRT → finish), a `menopause` option in `app/onboarding/journey.tsx`, and a 1-line `auraMode` type widening in `components/onboarding/OnboardingStep.tsx`. Focus per instructions was code correctness only (a design-critic pass already covered Diffuse/visual fidelity, not re-litigated here). Re-ran the new test directly (`npx jest store/__tests__/menopauseOnboardingStore.test.ts` → 1/1 pass) and a full project typecheck (`npx tsc --noEmit` → 0 errors, exit 0) — no type-level regressions.

The step/stage logic, the ephemeral store's collect/reset contract, the double-submit guard, and the enroll-before-setMode ordering are all correct and verified against the actual running code (details below). However, `saveAndFinish` (the finish handler) diverges from the sibling onboarding flows (`app/onboarding/cycle/index.tsx`, `kids/index.tsx`, `pregnancy/index.tsx`) in three ways I verified by reading those files line-for-line rather than assuming parity: it writes the `profiles` row with `.update()` instead of `.upsert(..., {onConflict:'id'})` **and never reads `useJourneyStore`** (so name/DOB captured in `about-you` is dropped too) — both of which silently no-op for any user whose first/only enrolled journey is Menopause, since nothing else creates that user's `profiles` row first; it never calls the shared `useOnboardingComplete()` / `completeCurrentFlow()` completion contract that all three siblings use, leaving the persisted onboarding queue store stale; and it has no `isDevModeActive()` dry-run short-circuit, unlike all three siblings, so a Dev Panel walkthrough of this flow writes real DB rows and leaves persisted stores mutated with no rollback on exit.

**Findings:** 1 P0, 2 P1, 1 P2

---

## P0 Findings (must fix before merge)

### P0-1: `profiles` write uses `.update()` instead of `.upsert()`, and never persists the `about-you` name/DOB — silently drops onboarding data for any user whose first/only journey is Menopause

- **File:** `app/onboarding/menopause/index.tsx:193-197`
  ```ts
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ menopause_stage: stage, last_period_date: lastPeriodDate })
    .eq('id', userId)
  ```
- **Issue:** Verified against the three sibling flows: `app/onboarding/cycle/index.tsx:176-178` uses `.from('profiles').upsert(profilePayload, { onConflict: 'id' })`, and `kids`/`pregnancy` follow the same pattern. I traced why: `app/onboarding/journey.tsx`'s `about-you` hand-off (`router.push({ pathname: '/onboarding/about-you', params: { next: FIRST_ROUTE[first] } })`, line 197-200) only writes captured name/DOB to the local `useJourneyStore` — I confirmed by grep that no `(auth)` screen and no `about-you` write ever touch Supabase `profiles` directly. The **first** per-mode `saveAndFinish` to run is what creates the user's `profiles` row, which is exactly why cycle/kids/pregnancy use `upsert`. Root routing (`app/_layout.tsx`, comment at top: "Logged in, no enrolled behaviors & no children → onboarding/journey") confirms a brand-new user reaches `journey.tsx` first, with no gating that prevents selecting **only** "Menopause" (the `JOURNEYS` array and `handleToggle` treat it identically to the other three options in both first-time multi-select and add-mode).
  - Consequence 1: for such a user, `.update(...).eq('id', userId)` matches **zero rows** (no `profiles` row exists yet). Supabase/PostgREST does not treat a zero-row `UPDATE` as an error, so `profileErr` is `null`/`undefined` — the `console.warn` guard never fires. The write is a **silent no-op**.
  - Consequence 2: `saveAndFinish` never reads `useJourneyStore.getState().parentName` / `.parentDob` at all (contrast `cycle/index.tsx:163-164`), so even fixing the upsert alone wouldn't recover the name/DOB captured on the shared `about-you` step for a Menopause-first user — that data is simply never sent to Supabase by this flow.
- **Impact:** For any user whose first (or only) enrolled behavior is Menopause — a fully reachable path via the standard root-onboarding redirect, not an edge case — `menopause_stage`, `last_period_date`, and their captured name/DOB are never persisted to Supabase, with zero error surfaced anywhere (no console.warn, no thrown exception). The user is left thinking onboarding succeeded (they land on `/(tabs)` normally) while their `profiles` row doesn't exist at all until some other write path happens to create it.
- **Fix:** Mirror the sibling pattern: `supabase.from('profiles').upsert({ id: userId, menopause_stage: stage, last_period_date: lastPeriodDate, ...(name && { name }), ...(dob && { dob }) }, { onConflict: 'id' })`, reading `parentName`/`parentDob` from `useJourneyStore.getState()` the same way `cycle/index.tsx:163-164` does.
- **Effort:** Small

---

## P1 Findings (should fix before merge)

### P1-1: `saveAndFinish` never calls the shared `useOnboardingComplete()` completion contract — persisted onboarding queue is never cleared, and a future re-priority could silently drop a queued next flow

- **File:** `app/onboarding/menopause/index.tsx:210-215`
  ```ts
  if (stage) useMenopauseStore.getState().setStage(stage)
  useMenopauseStore.getState().setLastPeriodDate(lastPeriodDate)
  useBehaviorStore.getState().enroll('menopause')
  useModeStore.getState().setMode('menopause')
  useMenopauseOnboardingStore.getState().reset()
  router.replace('/(tabs)')
  ```
- **Issue:** `cycle/index.tsx:105,148,159,226`, `kids/index.tsx:141,189,199,464`, and `pregnancy/index.tsx:134,178,199,305` all funnel their finish path through `hooks/useOnboardingComplete.ts`'s `handleComplete(behavior)`, which (a) calls `useOnboardingStore.getState().completeCurrentFlow()` to pop the just-finished behavior off the **persisted** `queue`/`currentOnboarding` (`store/useOnboardingStore.ts`, backed by AsyncStorage), (b) routes to `/onboarding/transition` if another behavior is queued, and only (c) falls through to `switchTo`/`setModeUnsafe`/`router.replace('/(tabs)')` when the queue is actually empty. U6's `saveAndFinish` reimplements only step (c) — it never calls `completeCurrentFlow()` and always hardcodes `router.replace('/(tabs)')`, regardless of queue state.
  - Currently this can't visibly drop a *subsequent* flow, because `store/useOnboardingStore.ts:18-23`'s `PRIORITY` map sorts `menopause: 3` — the highest number, i.e. always last — so there's never a queued item after Menopause today. I verified this by reading the sort in `buildQueue`.
  - But the **queue-never-cleared** part is real regardless: `journey.tsx`'s `buildQueue([behavior])` call (both add-mode line 175 and first-time line 188) always seeds the persisted queue, including for a solo Menopause selection. Since Menopause's finish never calls `completeCurrentFlow()`, `queue`/`currentOnboarding` are left as `['menopause']` / `'menopause'` in AsyncStorage after every Menopause onboarding completion, and `completedOnboarding` never records `'menopause'` — until the next `buildQueue()` call overwrites it wholesale on some later onboarding session. `context/DevPanelContext.tsx:97` and `store/useDevStore.ts`'s snapshot/restore both read this queue, so the stale value is at minimum a visible inconsistency in dev tooling, and it's a latent trap if `PRIORITY` is ever reordered or a new behavior with a higher priority number is added later.
- **Impact:** No currently-reachable user-facing break (menopause always sorts last), but it's a real deviation from the one completion contract every other onboarding flow follows, leaves persisted state dangling, and would silently start dropping queued flows the moment the priority ordering changes.
- **Fix:** Replace the manual tail with `const { handleComplete } = useOnboardingComplete(); ...; handleComplete('menopause')`, matching the sibling flows exactly (keep the `useMenopauseStore`/`useMenopauseOnboardingStore` writes before calling it, since those are Menopause-specific and outside the shared hook's scope).
- **Effort:** Small

### P1-2: Missing `isDevModeActive()` dry-run short-circuit — the one onboarding flow that writes real data and mutates persisted stores during a Dev Panel walkthrough

- **File:** `app/onboarding/menopause/index.tsx` (absent entirely — no import of `isDevModeActive` from `store/useDevStore`)
- **Issue:** `store/useDevStore.ts:1-17` documents this as a mandatory, explicit contract: *"Every onboarding `saveAndFinish()` short-circuits BEFORE any Supabase write... Use `isDevModeActive()` at the top of any side-effecting save path... Net effect: dev mode is a true dry-run... DB untouched, persisted stores untouched."* I verified all three siblings honor it: `cycle/index.tsx:146-149`, `kids/index.tsx:187ff`, `pregnancy/index.tsx:175ff` each check `isDevModeActive()` first and return early before any Supabase call. `app/onboarding/menopause/index.tsx` has no such check anywhere in `saveAndFinish`.
  - Compounding this: `useDevStore.ts`'s `Snapshot` type (lines 30-40) — the state it restores on `exit()` — covers `journey`, `onboarding`, `cycle`, `pregnancy`, `kids`, `behavior`, `mode`, `child`, `pregnancyStore`, but **not** `useMenopauseOnboardingStore` or `useMenopauseStore`. Even if the dev-mode check were added, a Menopause dry-run wouldn't roll back its local store mutations the way the other three flows do — that's a gap in the Dev Panel plumbing itself (outside this commit's file set, but relevant context for whoever picks up the fix).
- **Impact:** Anyone using the Dev Panel to demo or QA the Menopause onboarding flow (the exact intended use of Dev Mode, per its own doc comment) will write real `profiles`/`behaviors` rows and leave `useBehaviorStore`/`useModeStore`/`useMenopauseStore` mutated in production-adjacent local state — none of which is the "zero state changes anywhere" guarantee every sibling flow provides.
- **Fix:** Add the same guard used by the siblings at the top of the Supabase-writing section, e.g. `if (isDevModeActive()) { useMenopauseOnboardingStore.getState().reset(); return handleComplete('menopause') }` (or equivalent early return before the `supabase.auth.getSession()` call). Separately (not blocking this unit, but worth flagging to whoever owns U10/Dev Panel): extend `useDevStore`'s `Snapshot` to include the menopause stores so `exit()` actually rolls them back.
- **Effort:** Small (the in-file guard); Medium (extending the snapshot type, cross-cutting into U10's territory)

---

## P2 Findings (fix now or follow-up)

### P2-1: No test coverage for `saveAndFinish` — the one function where all three findings above live

- **File:** `store/__tests__/menopauseOnboardingStore.test.ts` (the only test this commit adds)
- **Issue:** The added test (`npx jest store/__tests__/menopauseOnboardingStore.test.ts` → 1/1 pass, re-ran directly) only covers the ephemeral store's collect/reset contract, which is correct and clean. There's no test anywhere for `saveAndFinish`'s ordering guarantees (enroll-before-setMode), the upsert-vs-update behavior, or the completion-contract call — exactly the surface where P0-1 and P1-1 live. `cycle`/`kids`/`pregnancy` don't appear to have finish-handler tests either (this project verifies onboarding finish paths via the `/grandma-verify` acceptance-criteria gate rather than unit tests), so this isn't a unique gap introduced by U6, but a targeted test asserting "profiles upsert called with `onConflict:'id'`" and "`completeCurrentFlow`/`handleComplete` called on finish" would have caught both P0-1 and P1-1 mechanically.
- **Impact:** Low on its own; it's the reason the two higher-severity findings shipped without a safety net.
- **Fix:** Optional for this unit given the project's existing verify-gate convention, but worth a mocked-Supabase test if/when the fixes above land.
- **Effort:** Small

---

## What was verified and is clean

- **Enroll-before-setMode ordering:** `saveAndFinish` calls `useBehaviorStore.getState().enroll('menopause')` (line 212) before `useModeStore.getState().setMode('menopause')` (line 213). Read `store/useModeStore.ts:31-40`: the guarded `setMode` rejects the target mode when `enrolled.length > 0 && !enrolled.includes(mode)`. Since `enroll()` is idempotent and synchronous, and `journey.tsx`'s own `handleContinue` already enrolls+`setModeUnsafe`s the first-selected behavior before routing here, this ordering is correct and satisfies the guard in every reachable path (first-time solo/multi-select and add-mode).
- **Best-effort DB wrap:** The `try { ... } catch (e) { console.warn(...) }` block (lines ~189-208) wraps only the Supabase calls; the local `useMenopauseStore` writes, `enroll`, `setMode`, `reset`, and `router.replace` all execute unconditionally afterward, on both the success and catch paths — a network failure still enrolls the user locally and navigates them forward, matching `cycle/index.tsx`'s established non-blocking-finish pattern.
- **Double-submit guard:** `savingRef.current` re-entrancy check (mirrors `cycle/index.tsx:139-141` exactly, including the "never released, because every path navigates away" rationale in the comment) — verified correct, no reset needed since the component unmounts on navigation.
- **`behaviors` upsert shape:** `{ user_id: userId, type: 'menopause', active: true }` with `{ onConflict: 'user_id,type' }` matches `cycle/index.tsx:183-190`'s shape exactly, correctly diverging only on `type` (literal `'menopause'` vs. the aliased `PRE_PREG_DB_TYPE = 'cycle'`), per the code's own comment. Confirmed the DB side is ready: `supabase/migrations/20260726120000_menopause_logs.sql` widens the `behaviors_type_check` CHECK constraint to admit `'menopause'` and adds `profiles.menopause_stage`/`profiles.last_period_date` columns — this migration's own header comment explicitly notes it exists *because* U6 writes `type='menopause'`.
- **Stage/step logic:** `getSteps(stage)` (lines ~130-136) includes `'last_period'` for every stage except `'post'` — correct per the intended "postmenopause users are already 12mo+ past their last period, skip the date question" rule. Traced `goNext`/`goBack`/`currentIndex` against dynamic step-list changes (e.g., user backs up and changes stage from `'post'` to `'peri'` after having advanced past where `last_period` would now be) — `goNext` always re-derives the step list from `useMenopauseOnboardingStore.getState().stage` (the live value, not a stale closure), so forward/back navigation stays correctly aligned with the current step list; no state leak found.
- **Symptom typing:** `symptoms: MenopauseSymptomId[]` end-to-end — store field, `setSymptoms` signature, and the `toggle(id: MenopauseSymptomId)` handler in `StepSymptoms` all agree; `lib/menopauseSymptoms.ts`'s `MenopauseSymptomId`/`ALL_MENOPAUSE_SYMPTOMS`/`MenopauseGroup` exports match what's imported.
- **Ephemeral store contract:** `store/useMenopauseOnboardingStore.ts` — correct Zustand v5 named import (`import { create } from 'zustand'`), no `persist` middleware (intentionally non-persisted per its own doc comment), `reset()` clears all 4 fields to their initial defaults. Matches the documented pattern of `useCycleOnboardingStore`.
- **Cross-unit wiring:** `MenopauseStage`/`MenopauseSymptomId` imports resolve correctly to U3/U4's files; `getModeColor`/`getModeColorSoft`/`getModeField`/`getDiffuseAccent`/`getDiffuseAccentSoft` all correctly resolve `'menopause'`/`'meno'` (checked `resolveFieldKey` in `constants/theme.ts:673-680`); the widened `auraMode?: '... | 'menopause'` prop in `OnboardingStep.tsx` is correctly consumed via `getModeField(mode, dt.isDark)` in the Diffuse branch. `Character` icon names used (`sun`, `phase`, `star`, `temperature`, `sleep`, `mood`, `activity`, `heart`, `selfcare`, `calendar`, `health`, `medicine`) are all valid `CharacterName` members.
- **Typecheck & tests:** `npx tsc --noEmit` — 0 errors, exit 0, across the whole project (including the `DatePickerField.onChange: (dateString: string) => void` vs. `setLastPeriodDate: (iso: string | null) => void` pairing, which type-checks fine via parameter contravariance). `npx jest store/__tests__/menopauseOnboardingStore.test.ts` — 1/1 pass.

## Overall verdict

**Do not merge as-is — one P0 blocks.** The onboarding UI, step machine, ephemeral store, and the parts of the finish handler this task explicitly asked to check (enroll/setMode ordering, best-effort DB wrap, double-submit guard, behaviors upsert shape, stage/step skip logic, symptom typing) are all correct and verified clean against the actual code, not assumed. But the finish handler was rewritten from scratch instead of reusing the established sibling pattern, and that rewrite silently drops the entire onboarding write (name, DOB, stage, last-period date) for any user whose first or only journey is Menopause — a fully reachable path via normal root routing, with zero error surfaced anywhere (P0-1). It also bypasses the shared `useOnboardingComplete()` completion contract (P1-1) and skips the project-wide Dev Mode dry-run guarantee (P1-2). All three stem from the same root cause: `saveAndFinish` should have been written as a thin Menopause-specific wrapper around the same primitives `cycle`/`kids`/`pregnancy` already use (`useJourneyStore` read + `profiles.upsert` + `useOnboardingComplete().handleComplete` + `isDevModeActive()` guard), not a parallel reimplementation. Fix P0-1 before merge; P1-1/P1-2 should also land in this unit since the fix is small and the sibling pattern to copy from is right there in the same repo.
