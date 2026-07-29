# Final Whole-Feature Review — Menopause E1 Behavior (Cross-Unit Seams)

**Scope:** commits `853b830..c682a17` (U1–U10), all 10 units already individually
reviewed and gated (see `reports/review-U1.md` … `review-U10.md`). This pass does
**not** re-review individual diffs — it traces the 5 seams the per-unit reviews
structurally could not see (a reviewer scoped to one commit can't know whether a
"later task" it stubbed around ever actually landed, or whether a sibling unit
created a shared module it should have adopted). Every finding below was verified
by reading the current, post-fix state of the actual files — not the diffs, and
not assumed from the per-unit reports.

**Findings: 0 P0, 1 P1, 3 P2**

---

## P1 — The two production-mounted journey switchers still hard-exclude Menopause, even though the full onboarding→home→analytics flow is now shipped

- **Units:** U1 (built `HomeJourneySwitcher`/`MyJourneyPillGrid` with an explicit
  "until a later E1 task" stub) × U8 (mounted `HomeJourneySwitcher` into the new
  `MenopauseHome` without revisiting the stub) × U6 (shipped the real, fully
  enrollable Menopause onboarding flow that makes the stub's premise obsolete).
- **Files:**
  - `components/home/HomeJourneySwitcher.tsx:24-33` — `ICON_BY_BEHAVIOR.menopause: ModeTrying` (placeholder) and `const ORDER: Behavior[] = ['pre-pregnancy', 'pregnancy', 'kids']` (menopause omitted)
  - `components/profile/MyJourneyPillGrid.tsx:10-23` — identical pattern: `ICON_BY_BEHAVIOR.menopause: ModeTrying`, `PILL_ORDER` lists only the 3 legacy behaviors
  - `components/home/MenopauseHome.tsx:36,196` — `<HomeJourneySwitcher />` mounted unconditionally in the greeting's `trailing` slot (identical to `CycleHome`/`KidsHome`/`PregnancyHome`)
  - `app/(tabs)/settings.tsx:246` — `<MyJourneyPillGrid />`, the only "My Journey" switcher on the Profile tab
- **Issue:** Both `ORDER` (Home header dropdown) and `PILL_ORDER` (Profile "My
  Journey" grid) are plain arrays — not `Record<Behavior,...>` maps — so
  TypeScript's exhaustiveness checking (which U1's own review leaned on to verify
  every `Record<>` was total) cannot flag that Menopause never appears in either
  list. Both files carry the same comment: *"ORDER below still lists only the 3
  wired journeys... type-completeness only until a later E1 task."* That later
  task was this same orchestration run: U6 (onboarding), U8 (home), and U9
  (analytics) fully shipped Menopause as a real, independently-enrollable
  journey — but nothing went back to add it to the two switcher UIs the app
  actually mounts.
  - **Consequence 1 — icon mismatch on the user's own home screen:** `ActiveIcon
    = ICON_BY_BEHAVIOR[currentBehavior]` (`HomeJourneySwitcher.tsx:68`) is
    unconditional — not gated by `ORDER`. When `currentBehavior === 'menopause'`
    (the exact case for anyone on `MenopauseHome`), this resolves to
    `ModeTrying`, the Cycle/TTC flower icon. A Menopause user's own home header
    shows a Cycle icon in the switcher trigger.
  - **Consequence 2 — no way back once switched away:** Tapping the trigger
    opens a dropdown built from `ORDER.map(...)` — Menopause never renders as a
    row, active or not. A user enrolled in Menopause + any other behavior who
    switches to that other behavior (via this same dropdown, or via
    `MyJourneyPillGrid` on Profile — same exclusion) has no UI path back into
    Menopause mode. `journey.tsx`'s add-mode won't help either: Menopause is
    already enrolled, so `unenrolledBehaviors` never lists it as addable. The
    only ways back are the Dev Panel's `ModeButton target="menopause"` or manual
    store manipulation — neither available to a real user.
- **Impact:** Real, reachable, no crash/data loss, but a full-behavior
  navigation lockout for a shipped, working feature. Anyone who enrolls in
  Menopause alongside another journey (a fully supported flow per `journey.tsx`'s
  now-real Menopause card) and ever leaves Menopause mode cannot return to it
  through either of the app's two actual switcher UIs.
- **Fix:** Add `'menopause'` to `ORDER` and `PILL_ORDER` with a real icon (a
  Menopause `ModeTrying`-equivalent doesn't exist yet — needs its own sticker/
  Character, matching the "ember" mode color already wired via `getModeColor`/
  `getDiffuseAccent`), removing the "type-completeness only" comments now that
  the flow they were waiting on has shipped.

---

## P2 — `useMenoPalette`, `STICKER_SHADOW`, and `GROUP_META`/`GROUP_ORDER` are duplicated between U6's onboarding screen and U7's later shared modules

- **Units:** U6 × U7.
- **Files:**
  - `app/onboarding/menopause/index.tsx:88-95` (private `GROUP_META`/`GROUP_ORDER`), `:99-140` (private `useMenoPalette()`), `:586-595` (private `STICKER_SHADOW`)
  - `components/menopause/menoPalette.ts:27-95` (the shared, exported `STICKER_SHADOW` + `useMenoPalette()`)
  - `components/menopause/menopauseIcons.ts:17-25` (the shared, exported `GROUP_META`/`GROUP_ORDER`)
- **Issue:** U6 (commit `989d2ab`) hand-rolled all three of these directly inside
  the onboarding screen, before any shared menopause module existed. U7 (commit
  `8e097a4`, later the same day) then created `components/menopause/menoPalette.ts`
  and `menopauseIcons.ts` as the intended shared modules — and its own doc
  comment says so explicitly: *"Mirrors the identical helper in
  `app/onboarding/menopause/index.tsx` (U6) so every menopause surface reads the
  same ember treatment."* U7/U8/U9 all correctly import the shared versions
  (`MenopauseLogForms.tsx`, `MenopauseTimeline.tsx`, `MenopauseHome.tsx`,
  `MenopauseAnalytics.tsx`). U6's file was never refactored to import them —
  it's the one menopause surface still carrying its own frozen copy.
- **Impact:** No visible bug today — both copies currently resolve to identical
  values (same underlying `getModeColor`/`getDiffuseAccent`/theme calls, same
  literal group metadata). But it's real, acknowledged duplication with no
  static guard against drift: U6's local `useMenoPalette` has no return-type
  annotation against the shared `MenoPalette` interface, so a future edit to the
  shared palette (new field, renamed key, a real Diffuse `radius.full` token
  added) would silently not propagate to the onboarding screen, and nothing
  would catch it at compile time.
- **Fix:** Replace all three of `app/onboarding/menopause/index.tsx`'s local
  copies with imports from `components/menopause/menoPalette.ts` /
  `menopauseIcons.ts`. Low-risk, mechanical — the values already match.

---

## P2 — Onboarding transition screen still shows placeholder cycle-themed copy for Menopause, right before the real (differently-toned) Menopause intro screen

- **Units:** U1 × U6.
- **Files:**
  - `app/onboarding/transition.tsx:63-71` — `BEHAVIOR_CONTENT.menopause` (Moon icon, `t('onboardingTransition_cycle_heading')` / `_cycle_subtext`)
  - `lib/i18n/en.ts:2183-2184` — the reused strings: *"Now, let's understand your cycle"* / *"A little about your cycle so I can help you understand your body."*
  - `app/onboarding/menopause/index.tsx:61-66` — the real, already-shipped intro copy immediately after: *"A calmer space for this season"* / *"This is a place to notice how you feel and track what changes — gently, at your own pace. No labels, no diagnoses."*
- **Issue:** U1's stub comment: *"Menopause (U1): placeholder content (reuses
  cycle copy/keys) so the map stays total. A later E1 task adds the real
  screen, copy, and queue entry."* U6 was that later task — it built the real
  destination screen with deliberately distinct, non-clinical copy — but never
  circled back to give the transition screen its own content. This is
  concretely reachable: any first-time multi-select enrollment that includes
  Menopause plus at least one other journey (e.g. Menopause + Kids; PRIORITY
  sorts Kids=1 before Menopause=3) routes through
  `/onboarding/transition?next=menopause` between the two flows.
- **Impact:** A user in the middle of enrolling in Menopause is told "Now,
  let's understand your cycle" — cycle-tracking language — immediately before
  landing on a screen about perimenopause/menopause stage, symptoms, and HRT.
  Confusing and topically wrong, though not functionally blocking: `content.route`
  still correctly resolves to `/onboarding/menopause`, and the accent color is
  already correct (ember, via `getModeColor(nextBehavior, ...)` /
  `getModeField(nextBehavior, ...)`, both of which do resolve `'menopause'`
  properly) — only the heading/subtext/icon are stale.
- **Fix:** Add real `onboardingTransition_menopause_heading` /
  `_menopause_subtext` i18n keys and swap the icon away from `Moon`/`'night'`
  (already visually claimed by Cycle) to something menopause-appropriate.

---

## P2 (minor) — `getSubtitleFor('menopause')` still returns an empty string, though U8 already built the exact data it needs

- **Units:** U1 × U8.
- **File:** `lib/profileStatus.ts:59-72` — `getSubtitleFor`'s switch has
  `case 'menopause': return ''` with the comment *"no dedicated subtitle helper
  yet (E1 later tasks add the home surface). Neutral placeholder keeps the
  switch total."*
- **Issue:** `getKidsSubtitle`/`getPregnancySubtitle`/`getCycleSubtitle` each
  derive a short status line from the relevant store. U8 already computes the
  exact equivalent for Menopause inline in `MenopauseHome.tsx` (`stageLabel` +
  `monthsCaption`, from `useMenopauseStore` + `monthsSinceDate`) — but
  `profileStatus.ts` was never given a `getMenopauseSubtitle()` counterpart.
- **Impact:** Low — `app/(tabs)/settings.tsx:141` calls this and renders the
  result as the Profile header subtitle; a Menopause-active user just sees no
  subtitle text there (a blank, not wrong/garbled text), unlike every other
  enrolled behavior.
- **Fix:** Add `getMenopauseSubtitle()` mirroring `MenopauseHome`'s
  `stageLabel`/`monthsCaption` derivation and wire it into the switch.

---

## Seams checked and confirmed clean

**1. Enroll path (onboarding → DB CHECK → read-back).** The widened
`behaviors_type_check` (`supabase/migrations/20260726120000_menopause_logs.sql:45-47`,
`CHECK (type IN ('cycle','pregnancy','kids','menopause'))`) admits U6's
onboarding write (`type: 'menopause'`, `app/onboarding/menopause/index.tsx:227-231`).
The DB behavior type is consistently **1:1** `'menopause'` (no `'cycle'`-style
alias) across all four places that touch it: `store/useBehaviorStore.ts:22-27`
(`behaviorFromDbType` only special-cases `PRE_PREG_DB_TYPE = 'cycle'`, passes
everything else through raw), the onboarding upsert, `lib/devSeed.ts:849-854`'s
`DB_MAP` (`menopause: 'menopause'`), and `app/_layout.tsx:385-388`'s boot-time
`serverTypes` restore (same `behaviorFromDbType` call). No drift anywhere in
this chain.

**2. Mode/config exhaustiveness (beyond the switcher gap above).** Every
`Record<JourneyMode,...>` / `Record<Behavior,...>` map in the repo — `PILLARS_BY_MODE`,
`MODE_CONFIGS`, `BEHAVIOR_LABELS`, `BEHAVIOR_CONTENT`, `FIRST_ROUTE`,
`DIFFUSE_MODE`, `QUESTIONS_BY_MODE`/`CARDS_BY_MODE`, `GLYPH_BY_MODE`,
`PRIORITY` — carries a real `menopause`/`'menopause'` entry (verified by
grep + reading each file). `behaviorToMode()` in `app/notifications.tsx`
(U1 review's I1) is fixed — it now returns `'meno'` for `'menopause'`. Mount
sites (`app/(tabs)/index.tsx`, `agenda.tsx`, `vault.tsx`) all branch correctly
and exclusively on `mode === 'menopause'`, and `JourneyMode` has no `'care'`
member to fall through incorrectly. `ExamBehavior`/`MemoryBehavior`/
`CaregiverBehavior` intentionally omit menopause — these are separate,
narrower types for features explicitly out of E1 scope (exams, memories,
caregiver persona), not menopause-behavior maps that should be total.

**3. Stage machine consistency.** All four write sites — onboarding finish
(`app/onboarding/menopause/index.tsx:213-224`), home's 12-month-offer confirm
(`components/home/MenopauseHome.tsx:148-166`), the period log form
(`components/menopause/MenopauseLogForms.tsx:187-197`), and the dev panel's
stage/months tools (`app/dev-panel.tsx:236-269`) — now consistently write
**both** `useMenopauseStore` (the durable local source of truth, read directly
by `MenopauseHome`/`MenopauseAnalytics`/`MenopauseTimeline`) **and**
`profiles` via `.upsert(..., { onConflict: 'id' })` (never `.update()`),
best-effort with `console.warn` on failure. This was genuinely broken pre-fix
(U6 review P0-1, U7 review P1-1) but the fix commits (`a4535c2`, `f6d29ce`)
landed the same upsert pattern everywhere consistently — verified against the
current file contents, not the historical diffs. The months counter
(`MenopauseHome`), the 12-month offer gate (`shouldOfferMenopauseUpdate`), and
the analytics months-timeline (`MenopauseAnalytics`) all call the identical
`monthsSinceDate(lastPeriodDate, now)` from `lib/menopauseStage.ts` against the
same store fields — no divergent math anywhere. `MenopauseAnalytics`'s
hydration-gate gap (U9 review P1) is fixed (`aab7531`) — `lastPeriodDate` is
now gated behind `hydrated` exactly like `stage`.

**4. Data round-trip.** `saveMenopauseLog`'s insert shape
(`lib/menopauseLogs.ts:26-33`: `user_id, date, type, value, severity, notes`)
matches the migration's columns exactly and matches what both log forms
(U7) and `seedMenopauseData` (U10, `lib/devSeed.ts:242-264`) write — `type` is
always either a raw `MenopauseSymptomId` or the literal `'period'`, never a
label or alias. `useMenopauseLogs`'s select (`date, type, value, severity`)
supplies exactly what `computeSymptomStats`/`computeVasomotorFrequency` (U5),
`MenopauseTimeline.entryTitle`/`entrySubtitle` (U7), and `MenopauseAnalytics`'s
`severitySeries` (U9) all consume. Query key `['menopause-logs']` is identical
across the one writer (`saveMenopauseLog`) and all three readers. No
type/shape mismatch anywhere in the seed → save → read chain.

---

## Overall verdict

**No P0s. One P1 — a real navigation dead-end where a shipped, fully-working
Menopause behavior is unreachable from both of the app's actual journey
switchers once a user leaves it — should be fixed before this ships to real
users with multi-behavior enrollment.** The three P2s (duplicated palette/icon
helpers between U6 and U7, stale placeholder transition copy, and a blank
Profile subtitle) are all real, verified, low-blast-radius seams that fell
through the same crack: each was stubbed by an early unit with an explicit
"a later E1 task will fix this" comment, and that later task shipped the real
feature without closing the loop on its own stub. Every other seam requested
(enroll-path DB consistency, mode/config exhaustiveness elsewhere, the stage
machine's four write sites, and the full log data round-trip) was traced
against the current code and is clean.
