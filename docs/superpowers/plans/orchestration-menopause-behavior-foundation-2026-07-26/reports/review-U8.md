# Code Review — U8: MenopauseHome (stage hero, months counter, 12mo offer, quick-log, wisdom)

**Scope:** commit `1f09ec0` only (`git show 1f09ec0`)
**Files in commit:** `components/home/MenopauseHome.tsx` (new, 484 lines), `app/(tabs)/index.tsx` (+6/-1)
**Reviewer focus:** code correctness (visual/design fidelity is covered separately by design-critic)
**Method:** read every changed line plus every U1–U7 dependency it imports (`lib/menopauseStage.ts`, `store/useMenopauseStore.ts`, `lib/menopauseAnalytics.ts`, `lib/menopauseSymptoms.ts`, `lib/menopauseLogs.ts`, `components/menopause/{menoPalette,menopauseIcons,MenopauseLogForms}.ts(x)`, `components/calendar/LogSheet.tsx`, `components/characters/Characters.tsx`, `components/ui/{PaperCard,PillButton,BrandedLoader}.tsx`), cross-checked against the orchestration plan (Task 8) and ledger, and ran `npx tsc --noEmit` (clean, 0 errors) against the current tree.

**Findings:** 0 P0, 0 P1, 2 P2

---

## P2 — Quick-log chips don't carry the tapped symptom into the form

- **File:** `components/home/MenopauseHome.tsx:238-243` (chip render) and `:296-317` (`QuickChip`)
- **Issue:** Every `QuickChip` — regardless of which of the up-to-6 distinctly-labeled tracked symptoms it renders — is wired to the identical handler:
  ```tsx
  <QuickChip key={id} id={id} pal={pal} onPress={() => setActiveSheet('symptom')} />
  ```
  `id` is used only for the chip's icon/label/key, never passed onward. `setActiveSheet('symptom')` always opens the same `<MenopauseSymptomForm onSaved={...} />`, which mounts with `symptomId: null` and requires the user to re-pick from the full 13-symptom, 5-group list (`components/menopause/MenopauseLogForms.tsx:58-112`) — `MenopauseSymptomForm` has no prop to accept/preselect an id.
- **Impact:** Tapping "Hot flashes" and tapping "Night sweats" produce byte-identical UI. The section's own copy — "Tap a signal to note how you're feeling today." — implies the tap identifies the signal; it doesn't. Not a crash or data-integrity issue (the eventual save is still correct once the user re-selects), but it undercuts the "quick" framing that is the section's whole purpose, and it's the kind of thing a user will notice on the second tap.
- **Suggested fix (for the follow-up session, not applied here):** add an optional `initialSymptomId?: MenopauseSymptomId` to `MenopauseSymptomForm` and pass `onPress={() => { setPendingSymptomId(id); setActiveSheet('symptom') }}`, or open straight to the severity step when a chip supplies an id.
- **Verified:** read `QuickChip`'s full implementation and `MenopauseSymptomForm`'s props — confirmed no id is threaded through anywhere in the commit or in the U7 form it opens.

## P2 — `caregiverView` computed but unused for `mode === 'menopause'`

- **File:** `app/(tabs)/index.tsx:65-78`
- **Issue:** `behavior` (`CaregiverBehavior`) falls through to `'cycle'` for any mode that isn't `'kids'` or `'pregnancy'`, so when `mode === 'menopause'` the surrounding code still computes `caregiverView` via `visibleCards`/`hasCapability`/`isCaregiver` — then `<MenopauseHome />` is mounted with no props and never consumes it.
- **Impact:** Negligible at runtime (cheap pure-function calls on a small `activeChild` object), and matches the intended scope — the caregiver persona system (per CLAUDE.md) covers Kids/Pregnancy/Cycle only, and menopause is a personal (non-child-linked) profile behavior, so there's nothing to filter. Flagging only because the derivation silently mislabels menopause as `'cycle'` internally; if a future unit *does* wire caregiver support into `MenopauseHome`, this fallthrough would silently reuse Cycle's card-visibility rules instead of a menopause-specific set.
- **Not a defect against U8's stated scope** — no fix suggested for this commit; worth a one-line comment or a `'menopause'` fallthrough guard whenever caregiver support is scoped for this mode.

---

## Verified correct (no findings — checked against the brief's specific claims)

- **12-month offer gating:** `showOffer = !offerDismissed && stage != null && shouldOfferMenopauseUpdate(stage, lastPeriodDate, now)`. `shouldOfferMenopauseUpdate` (`lib/menopauseStage.ts:22-30`) returns `false` for any `stage !== 'peri'` and requires `monthsSinceDate(...) >= 12`. Confirmed the offer can never appear for `meno`/`post`/`null` stage, and never for `peri` with `<12` months or a null `lastPeriodDate`.
- **Confirm action:** `confirmMenopause()` (`:127-141`) calls `useMenopauseStore.getState().setStage('meno')` synchronously (an explicit, user-tapped action — not automatic), then best-effort upserts `supabase.from('profiles').upsert({ id: userId, menopause_stage: 'meno' }, { onConflict: 'id' })` inside try/catch with `console.warn` on failure, never rethrown, never blocking the local stage flip. Matches the U7 period-form's identical best-effort upsert pattern (`MenopauseLogForms.tsx:192-196`).
- **Self-hide after confirm:** since `setStage('meno')` triggers Zustand's subscribers (including the `useMenopauseStore((s) => s.stage)` selector in this same component), the next render has `stage === 'meno'`, `shouldOfferMenopauseUpdate` returns `false`, and the offer card unmounts. No `useEffect`/polling/background logic exists anywhere in the file that could flip stage without the explicit tap — "never auto-flips" holds.
- **No unmounted-state-update bug:** `confirming` state lives in the top-level `MenopauseHome` (not inside the offer card subtree), so when the offer card's JSX branch stops rendering, the parent component itself stays mounted — the `finally { setConfirming(false) }` after the offer disappears is a harmless no-op, not a leak/warning.
- **Hydration gate:** every hook (`useSafeAreaInsets`, `useScrollBottomInset`, `useMenoPalette`, 3× `useMenopauseStore` selectors, `useMenopauseLogs`, 4× `useMemo`, 3× `useState`) executes unconditionally before the `if (!hydrated) return <BrandedLoader .../>` at `:157-163`. No conditional-hook-call violation; unhydrated renders only the loader inside `pal.bg`.
- **Months-since counter:** `monthsSinceDate(lastPeriodDate, now)` (`:110`), rendered as `months === null ? '—' : months` (`:186`) — explicit `=== null` check (not a falsy check), so `0` months correctly renders `"0"` rather than mis-firing the em-dash fallback. Singular/plural caption (`"month"` vs `"months"`) is also correctly branched.
- **Quick-log symptom derivation:** `trackedIds` (`:98-105`) = `computeSymptomStats(rows).map(id).filter(is valid MenopauseSymptomId).slice(0,6)`, falling back to `FALLBACK_SYMPTOMS = ['hot_flash','night_sweat','sleep']` only when nothing has been logged yet — matches "top-N derived from logs, vasomotor+sleep fallback" exactly. (`computeSymptomStats` already excludes `period`/`note`/unresolvable types per `lib/menopauseAnalytics.ts:11-24`.)
- **Log forms + save path:** both `<LogSheet>` instances render U7's `MenopauseSymptomForm`/`MenopausePeriodForm` verbatim with only `onSaved`/`title`/`visible`/`onClose` wired — no reimplementation. Both forms save via `saveMenopauseLog`, which inserts into `menopause_logs` and invalidates `['menopause-logs']` (`lib/menopauseLogs.ts`), so `useMenopauseLogs()` in `MenopauseHome` refetches and `rows`/`recent`/`trackedIds` update reactively after any save — no manual refetch needed and none was added redundantly.
- **Mount branch:** `{mode === 'menopause' && <MenopauseHome />}` added standalone (mirroring `CycleHome`/`PregnancyHome`, which also bring their own `ScrollView`); the fallback `ScrollView` block's guard was correctly extended to `mode !== 'pregnancy' && mode !== 'pre-pregnancy' && mode !== 'menopause'`, and the `{mode === 'kids' && <KidsHome .../>}` branch inside it is untouched and still only renders for `'kids'`. No mode's rendering path was altered by this diff other than adding the new exclusive branch.
- **Keys:** `QuickChip key={id}` (unique per `trackedIds`, itself deduplicated by construction) and `RecentRow key={`${r.date}-${r.type}-${i}`}` (index-suffixed, safe against same-day/same-type duplicates) — no key-collision risk.
- **Memoization / hook order:** `rows`, `microLabel`, `trackedIds`, `recent` are all `useMemo`'d with correct, minimal dependency arrays (`[data]`, `[]`, `[rows]`, `[rows]`); no derived list is recomputed on every render, no obvious perf red flag. `now = new Date()` is computed directly in the render body (not memoized) but is only used for two cheap synchronous comparisons — non-issue.
- **Cross-unit wiring:** all imports from U1 (`getModeColor`/`getDiffuseAccent` via `useMenoPalette`), U3 (`ALL_MENOPAUSE_SYMPTOMS`/`menopauseSymptomLabel`/`resolveMenopauseSymptomId`), U4 (`useMenopauseStore`, `monthsSinceDate`, `shouldOfferMenopauseUpdate`), U5 (`useMenopauseLogs`, `computeSymptomStats`), and U7 (`MenopauseSymptomForm`, `MenopausePeriodForm`, `saveMenopauseLog`, `LogSheet` reuse) resolve to real, currently-exported symbols with matching signatures — confirmed by reading each source file directly, not just the diff. `npx tsc --noEmit` is clean across the whole tree.
- **`profiles.menopause_stage` / `last_period_date` columns:** confirmed present via `supabase/migrations/20260726120000_menopause_logs.sql:38-39` (U2), so the upsert target columns exist.

## Note on the plan text vs. this brief (not a finding)

The original Task 8 spec text (`docs/superpowers/plans/2026-07-25-menopause-behavior-foundation.md:838-864`) describes the quick-log fallback as "the user's **onboarding-picked** symptoms (fallback to the top vasomotor+sleep set)." In practice, U6's onboarding store (`useMenopauseOnboardingStore`) collects `symptoms` but never persists them anywhere durable — the finish handler only writes `menopause_stage`/`last_period_date` to `profiles` and then calls `.reset()`, discarding the picked symptoms. U8 correctly adapted to this reality by deriving tracked symptoms from actual logged history (`computeSymptomStats`) instead, which is what this review brief asked to verify and is the only data source that actually exists post-onboarding. This is a sensible, self-consistent adaptation, not a bug — flagged here only for plan/implementation traceability.

---

## Verdict

**Pass, advisory-only.** No P0 or P1 findings — the 12-month offer gating/confirm/self-hide flow, hydration gate, months-since counter, quick-log data derivation, save path, and the home-screen mount branch all behave exactly as specified and were independently verified against the current source (not just the diff), with a clean `tsc --noEmit`. The two P2s are minor: one real (if small) UX/completeness gap in the quick-log chips not threading the tapped symptom into the form, and one near-zero-impact dead computation in the mount site. Neither blocks merge; both are reasonable follow-up items.
