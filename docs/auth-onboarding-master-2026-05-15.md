# Auth + Onboarding Master Audit — grandma.app — 2026-05-15

**Auditors:** code-reviewer × 3, mode-consistency-checker × 1 (parallel)
**Scope:** Authentication flow + journey/mode selection + all three mode-specific onboarding flows (pre-pregnancy, pregnancy, kids).
**Per-area deep dives:**
- [auth-audit-2026-05-15.md](auth-audit-2026-05-15.md)
- [onboarding-shared-audit-2026-05-15.md](onboarding-shared-audit-2026-05-15.md)
- [onboarding-prepreg-audit-2026-05-15.md](onboarding-prepreg-audit-2026-05-15.md)
- [onboarding-pregnancy-audit-2026-05-15.md](onboarding-pregnancy-audit-2026-05-15.md)
- [onboarding-kids-audit-2026-05-15.md](onboarding-kids-audit-2026-05-15.md)

---

## Executive Summary

**Verdict: Needs major fixes before next TestFlight.**

The auth + onboarding pipeline has **15 P0 blockers**, **40+ P1 correctness/UX issues**, and **30+ P2 polish items** across the 5 areas audited. Three categories dominate:

1. **OAuth correctness is broken.** Apple's nonce flow is cryptographically wrong; Google's PKCE flow falls through to a thrown error on every successful sign-in. Both bugs are masked only because something downstream tolerates them.
2. **Mode-system wiring is fragile.** `useOnboardingComplete` derives the target mode from `enrolledBehaviors[0]`, which is unreliable. Multiple flows can complete with `useModeStore` defaulting to `'kids'`, landing the user on `KidsHome` regardless of intent. `profiles.journey_mode` is rarely written, so every cold restart can flip mode back to the migration default.
3. **Data persistence is full of holes.** Critical onboarding answers (parent name, baby name, partner name, tracked activities, cycle preferences, due date for Entry A, child photo, partner from kids) are collected but never written to Supabase — they live in non-persisted Zustand or JSON blobs that nothing reads back. Reinstall = data loss.

The single most impactful bug: **the pregnancy week formula is off by one for every user** (week 23 displayed when the user is in week 22). This affects the week ring, baby-size card, weekly content, and any AI insight keyed on week.

---

## Cross-Cutting Themes

### Theme 1 — Sign-out & cache hygiene (PII / privacy risk)
None of the 4 sign-out paths clear React Query cache or reset persisted Zustand stores. **Stale private data is visible to the next user on a shared device.** Fix: single `lib/signOut.ts` helper.

### Theme 2 — Mode flip silently fails
The `useOnboardingComplete` → `setMode(enrolledBehaviors[0])` pattern depends on `useBehaviorStore.enroll(<mode>)` having been called earlier. The per-mode `saveAndFinish` functions don't always call `enroll()`. Fresh installs end up in default mode (`'kids'`) regardless of which onboarding they completed.

### Theme 3 — Local vs UTC date math
Audit confirmed (and the project's existing memory already flags) that `new Date('YYYY-MM-DD')` parses as UTC midnight. Pregnancy week math, cycle calc, and `pregnancySeeds.ts` all use this pattern → off-by-one for evening users west of UTC. Use `new Date(str + 'T00:00:00')` or `toDateStr()`.

### Theme 4 — Dead code in shared onboarding
Five screens (`parent-name`, `baby-name`, `activities`, `due-date` as shared, `child-profile`) are unreachable from any live route. They appear to be a deprecated shared prefix. `child-profile.tsx` is actively wrong (treats pre-preg as pregnancy, inserts phantom kids). Decide: delete or wire.

### Theme 5 — Write-only data
- Pre-preg: 8 of 10 collected fields are in a JSON blob nothing reads.
- Pregnancy: birth place, care provider, first-pregnancy boolean, partner name — JSON blob only.
- Kids: partner name, child photo — never reach Supabase.
- Shared: `parentName`, `trackedActivities` — never reach Supabase.

### Theme 6 — Design-system token drift
`#FFFFFF`, `#141313`, `'Fraunces_600SemiBold'`, neon hex (`#FF6B6B`, `#A2FF86`, `#B983FF`, `#F4FD50`), and `radius.lg` on CTAs appear throughout. Completion CTAs across all three onboarding flows are non-pill buttons with hardcoded white text. Pre-preg onboarding uses global purple `colors.primary` for all active states instead of the rose mode color.

### Theme 7 — i18n & a11y are absent everywhere
Zero `t()` calls across all 5 audited areas. Zero `accessibilityLabel` on icon-only `Pressable`s. Multiple touch targets under 44pt.

---

## Master P0 List (15 blockers)

### Auth (6)
1. Apple nonce cryptographically incorrect (`lib/auth-providers.ts:16-19,35`)
2. Google OAuth misses PKCE query params; every sign-in throws (`lib/auth-providers.ts:69-84`)
3. `accept-invite.tsx` reachable without auth (`app/accept-invite.tsx:14-36`)
4. Non-null assertions on env vars (`lib/supabase.ts:11-12`)
5. Sign-out doesn't clear cache/stores — PII leak on shared device (all 4 sign-out paths)
6. SecureStore 2KB chunking missing (active warning in terminal)

### Shared onboarding (6)
7. Five shared screens unreachable; `child-profile.tsx` actively wrong (treats pre-preg as pregnancy)
8. `activities.tsx:86` unconditionally pushes to kids `child-profile.tsx`
9. `useOnboardingStore` not persisted; multi-mode queue lost on app kill
10. `child-profile.tsx:45` `isPregnancy` lumps pre-preg with pregnancy
11. `parentName` never written to `profiles.name` anywhere
12. `trackedActivities` excluded from `partialize`; never persisted, never read

### Pregnancy (3)
13. **Week formula off by one** in 3 files — every pregnant user sees wrong week
14. `behaviors.insert` creates duplicate rows on re-entry
15. Mode may not flip to `'pregnancy'`; completion lands users on `KidsHome`

### Kids (overlapping P0s, counted in §Kids)
- `behaviors.insert` error silently swallowed (`kids/index.tsx:128`)
- `saveAndFinish` clears data and navigates after fatal error — destroys draft
- Multiple `any` casts mask schema typos (`birth_date` vs `birthDate`)

### Pre-preg (overlapping P1)
- `profiles.journey_mode` never written → mode resets to `'kids'` on every cold restart

---

## Prioritized Fix Plan

### 🔴 Sprint 1 — must-fix before TestFlight (P0)

**Auth foundation**
1. **Fix Apple nonce** (`lib/auth-providers.ts`) — true random hex → hash once → raw to Apple, hash to Supabase
2. **Fix Google PKCE** — use `supabase.auth.exchangeCodeForSession(result.url)`; remove manual hash parsing
3. **Create `lib/signOut.ts`** — single helper: `signOut` + `queryClient.clear()` + reset Zustand persisted stores + navigate
4. **Gate `accept-invite.tsx`** on active session; preserve token through sign-in
5. **Install chunked SecureStore adapter**
6. **Replace env-var `!` assertions** with explicit guards

**Onboarding correctness**
7. **Fix pregnancy week formula** in `app/onboarding/pregnancy/index.tsx:85`, `lib/pregnancyData.ts:75`, `lib/pregnancyWeeks.ts:67` → `40 - Math.ceil(daysLeft / 7)`
8. **Fix mode-flip** in `hooks/useOnboardingComplete.ts` — accept explicit `completedBehavior` arg; each `saveAndFinish` calls `onboardingComplete(<mode>)`
9. **Fix `kids/saveAndFinish` error path** — move cleanup inside `try` success; show retry `Alert` on catch
10. **Write `journey_mode` to `profiles`** in all 3 per-mode `saveAndFinish` paths
11. **Use `upsert` (not `insert`) for `behaviors`** in all 3 onboarding flows; add unique constraint `(user_id, type)`
12. **Persist `useOnboardingStore`** (or have root guard re-queue missing behaviors)
13. **Write `parentName` to `profiles.name`** in each `saveAndFinish`
14. **Decide on the 5 dead-end shared screens** — delete or wire; fix `child-profile.tsx` `isPregnancy` lumping
15. **Consolidate pregnancy due-date entry points** — either remove Entry A as pregnancy path, or have it write to `usePregnancyStore`

### 🟡 Sprint 2 — P1 correctness & UX

16. Add `try/finally` to `sign-in.tsx`
17. Implement password-reset flow (`forgot-password.tsx` + `resetPasswordForEmail`)
18. Add client-side validation to sign-in / sign-up
19. Move profile/children/behaviors load into `onAuthStateChange` for `SIGNED_IN` (kills the race condition)
20. Fix all UTC date parsing — `new Date(str + 'T00:00:00')` + `toDateStr`
21. Upload child photo to Supabase Storage; persist URL
22. Wire partner-name (kids) — either to `care_circle` or remove the step
23. Migrate cycle preferences (`cycleLength`, `conditions`, `tempUnit`, TTC) out of `cycle_logs.notes` JSON into queryable columns; read them in `CycleHome`
24. Write due-date + baby-name + partner-name to `profiles` columns
25. Carry LMP from pre-preg → pregnancy onboarding
26. Fix `WEEK_FOCUS` fallback for weeks 1–3 and 41–42
27. Fix `getBirthFocusForWeek`, `getWeekData` clamping
28. Fix `pregnancySeeds.ts` UTC date bug
29. Apply `getModeColor('pre-pregnancy', isDark)` (rose) to pre-preg onboarding active states + CTA — currently all global purple
30. Replace completion CTAs across 3 flows with `PillButton` (kills `radius.lg` + `#FFFFFF` violations in one stroke)
31. Consolidate `GROWTH_LEAPS` — delete `KidsHome.tsx:72-248` local copy, use canonical `lib/growthLeaps.ts`
32. Seed kids vaccine schedule at onboarding (or via DB trigger)
33. Fix `transition.tsx` — `router.replace` in `useEffect`, not render body
34. Fix shared `_layout.tsx` onboarding completion guard — require server-side `behaviors` row
35. First-time `journey.tsx` should buffer selections like add-mode does
36. Reduce sign-out implementations from 4 to 1 (subset of fix #3)

### 🟢 Sprint 3 — P2 polish

37. Wire all auth + onboarding strings to `lib/i18n/` (12 locales)
38. Add `accessibilityLabel` + `accessibilityRole` to all `Pressable` icons
39. Bump back-button visual to 44×44pt (sign-in, sign-up)
40. Restyle `accept-invite.tsx` to current design system
41. Standardize on `colors.bg` / `colors.surface` (drop redundant `isDark ? colors.bg : '#F3ECD9'`)
42. Drop `as any` casts in router calls and child store mapping
43. Persist onboarding draft stores (pregnancy + kids `useXOnboardingStore`)
44. Standardize on `font.display` token (kill inline `'Fraunces_600SemiBold'`)
45. Replace neon legacy hex in `cycleLogic.ts` with sticker tokens
46. Add `nestedScrollEnabled` to nested `ScrollView`s on Android
47. Remove vestigial types (`'newborn'|'toddler'` in `useJourneyStore`)
48. Drop the `'cycle'` → `'pre-pregnancy'` remap by inserting the canonical value
49. `accept-invite.tsx`: SafeArea, stickers, mode color, PaperCard

---

## What's Working Well

To be balanced about it:
- **Mode store + brand color system** are clean abstractions; the bugs are wiring, not architecture.
- **DatePickerField** ranges are correctly bounded on the LMP and due-date pickers.
- **Kids multi-child stepper** is well-structured and handles back-navigation across child boundaries via a flat-indexed step list.
- **`pregnancy_logs.notes` JSON blob** preserves a copy of everything for forensic recovery, even where columns are missing.
- **`useOnboardingComplete`** correctly delegates `switchTo` + `setMode` to behavior store (when `enrolledBehaviors` happens to be populated).
- **Three per-mode onboarding flows landing on the right home screen** is the right end-state architecture — just needs the persistence/mode fixes above.

---

## Recommended Sequencing

This audit produced 49 actionable items. A pragmatic sequencing:

**Week 1 (Sprint 1):** Items 1–6 (auth foundation) + 7 (week formula). One PR per item, small surface area each.

**Week 2 (Sprint 1 continued):** Items 8–15 (onboarding correctness). Heavier — touches multiple files per item. Recommend bundling 8+10+11 (mode-flip + journey_mode + behaviors upsert) into a single "fix onboarding completion" PR.

**Week 3–4 (Sprint 2):** P1 batch, grouped by area (auth UX, onboarding UX, design tokens, persistence migration).

**Week 5 (Sprint 3):** Polish — i18n wave, a11y pass.

---

**Total: 49 prioritized recommendations across 5 audit areas. 15 P0, ~24 P1, ~10 P2.**
