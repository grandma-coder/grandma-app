# Code Review Fix Plan

**Branch:** main
**Scope:** single commit `bbff0c6` — "feat(menopause): stage store + months-since-period + 12mo offer logic (U4)"
**Date:** 2026-07-26
**Commits reviewed:** 1 (bbff0c6)
**Unit:** U4 of `docs/superpowers/plans/2026-07-25-menopause-behavior-foundation.md` (orchestration run `orchestration-menopause-behavior-foundation-2026-07-26`)

## Summary

U4 adds `lib/menopauseStage.ts` (`monthsSinceDate`, `shouldOfferMenopauseUpdate`) and `store/useMenopauseStore.ts` (a persisted Zustand store for `stage`/`lastPeriodDate` with a hydration gate). Re-ran the suite directly: `npx jest lib/__tests__/menopauseStage.test.ts` → 3/3 pass; `npx tsc --noEmit` → 0 errors.

I wrote a scratch script reimplementing `monthsSinceDate` exactly and exercised it against ~15 cases beyond the 3 in the test file: same-month boundaries (day short of / exactly / past a full month), a year rollover, and a leap-adjacent month-end case (Jan 31 crossing a non-leap February). **All standard-length-month and year-rollover cases are correct** — the `now.getDate() < d` adjustment does the right thing in every case I threw at it, including the exact 12-month boundary the store's core feature depends on. I found two lower-severity gaps, both verified against the running code rather than asserted: (1) the `!y || !m || !d` guard only rejects falsy/NaN components, not out-of-range ones, so a malformed date string like `'2026-13-01'` or `'2026-02-30'` silently produces a wrong number instead of `null`; and (2) day-of-month arithmetic for anchor dates on the 29th–31st under-counts by 1–3 days when the interval crosses a short February (a known, convention-dependent ambiguity in this class of algorithm, not a hard bug). `shouldOfferMenopauseUpdate` itself is correct and clean: fires only for `'peri'`, thresholds at `>= 12` months, is a pure predicate with no store writes anywhere in the file (never auto-applies). The store's hydration gate is a verified line-for-line match of `useBehaviorStore`'s canonical pattern, and the Zustand import is the correct v5 named import.

**Findings:** 0 P0, 0 P1, 2 P2

---

## P2 Findings (should fix, non-blocking)

### P2-1: `monthsSinceDate` doesn't validate month/day are in calendar range, only that they're non-zero

- **File:** `lib/menopauseStage.ts:5` — `if (!y || !m || !d) return null`
- **Issue:** This guard catches `NaN`/`0` (e.g. a totally empty or garbled string), but does not check `1 <= m <= 12` or that `d` is a valid day for month `m`. Verified with a scratch script against the real implementation:
  - `monthsSinceDate('2026-13-01', now)` → returns `0` (should be `null` — month 13 doesn't exist)
  - `monthsSinceDate('2026-02-30', now)` → returns `4` (should be `null` — Feb never has 30 days)
  - By contrast `monthsSinceDate('0-05-01', now)` → correctly returns `null` (year `0` is falsy)
- **Impact:** Low likelihood today — `lastPeriodDate` is presumably only ever written by a validated date-picker in a later unit (U6 onboarding / U7 log form, per the plan), so this path requires already-corrupted input (e.g. a hand-edited AsyncStorage blob, or a future write-path bug) to be reachable. But the failure mode isn't inert: `shouldOfferMenopauseUpdate` only guards on `months !== null && months >= 12`, so a corrupted `lastPeriodDate` that happens to compute a nonsensical value `>= 12` would incorrectly surface the "you may be reaching menopause" offer for a `peri` user, instead of safely no-oping via `null`.
- **Fix:** Extend the guard, e.g. `if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null`, or round-trip through `new Date(y, m - 1, d)` and compare the normalized components back against `y`/`m`/`d` to reject dates JS would silently roll over (catches Feb 30, Apr 31, etc. too).
- **Effort:** Small

### P2-2: Month-end anchor dates (29th–31st) under-count by 1–3 days when the interval crosses a short February

- **File:** `lib/menopauseStage.ts:5-9`
- **Issue:** Verified: `monthsSinceDate('2026-01-31', new Date('2026-02-28'))` → `0`, and doesn't reach `1` until `2026-03-01` (29 days later, not 31). This happens because `now.getDate() < d` compares raw day-of-month numbers (`28 < 31`) rather than accounting for February having fewer days than January. There's no single universally-"correct" convention for month-end date arithmetic (many libraries have the same shape of caveat), so this isn't a clear-cut bug — but it is a verified, real quirk: for a `lastPeriodDate` on the 29th/30th/31st, the 12-month mark used by `shouldOfferMenopauseUpdate` can land up to 3 days later than a "clamp to short month's last day" convention would give.
- **Impact:** Very low — at most a few days' delay in an advisory (non-diagnostic, never-auto-applied) prompt, and only for the subset of users whose last-period date falls on days 29–31 in a year where the 12-month mark crosses a 28/29-day February.
- **Fix:** Optional. If exact convention matters to product, consider clamping via `new Date(y, m, 0).getDate()` (last day of month `m`) when `d` exceeds it, or document the current behavior as an accepted caveat. Given the low impact, this is fine to leave as-is with a one-line code comment noting the tradeoff.
- **Effort:** Small (if pursued)

---

## What was verified and is clean

- **`monthsSinceDate` boundary math (core cases):** re-derived and independently re-ran ~10 additional cases beyond the 3 in the test file — one-day-short-of-a-month, exactly-one-month, one-month-plus-a-day, and a same-day-next-year case, plus year rollover (`2025-08-01` → `2026-07-25` = 11; `2025-07-26` → `2026-07-25` = 11, one day short of 12; `2025-07-25` → `2026-07-25` = exactly 12). All matched expected whole-month counts. `Math.max(0, months)` correctly clamps a future `fromISO` to `0` rather than going negative.
- **`shouldOfferMenopauseUpdate`:** confirmed by reading the full 8-line function — returns `false` immediately for any `stage !== 'peri'` (covers `'meno'` and `'post'`, only `'meno'` is directly tested but the guard is a single equality check so `'post'` is provably covered the same way), thresholds at `months >= 12` (not `>`), returns `false` on `null` months (no last-period date), and contains zero writes/mutations anywhere in `lib/menopauseStage.ts` — it's a pure predicate, confirming it can never auto-apply a stage change.
- **Store hydration gate:** diffed `store/useMenopauseStore.ts` line-for-line against `store/useBehaviorStore.ts` (the canonical pattern per `code-style.md`). Both: expose a `hydrated: boolean` defaulting to `false`, a `setHydrated` action, `partialize` that excludes `hydrated` from what's persisted, and — critically — flip `hydrated` via `useMenopauseStore.setState({ hydrated: true })` directly inside `onRehydrateStorage: () => () => {...}` rather than via the (possibly-undefined) `state` callback argument. `useMenopauseStore.ts`'s comment even explicitly references `useBehaviorStore`'s rationale for this. No deviations found (no missing `version`/`migrate` field either — `useBehaviorStore` doesn't have one, so nothing to match there).
- **Zustand v5 import:** `import { create } from 'zustand'` — correct named import, matches `package.json`'s `"zustand": "^5.0.12"` and the project's `useBehaviorStore` convention.
- **No premature wiring:** confirmed via repo-wide grep that neither `menopauseStage.ts` nor `useMenopauseStore.ts` is imported anywhere outside their own test files yet — consistent with this being a standalone pure-logic unit ahead of the consumer units (U6-U8).
- **Tests:** `lib/__tests__/menopauseStage.test.ts` — 3/3 pass (re-ran directly). **Typecheck:** `npx tsc --noEmit` — 0 errors.

## Overall verdict

**Pass, with two non-blocking robustness notes.** The boundary math is correct for every realistic case (including the year-rollover and standard month-boundary scenarios this review was specifically asked to stress), the "only peri at >=12mo, never auto-applies" contract is provably true by inspection, and the store's hydration gate is an exact match of the project's established `useBehaviorStore` pattern. P2-1 (missing range validation) is the more actionable of the two — cheap to fix and closes a real, if currently unreachable, gap. P2-2 (short-February edge case) is informational; fine to ship as-is.
