# Code Review Fix Plan

**Branch:** main
**Scope:** single commit `cc2f57e` — "feat(menopause): symptom taxonomy (13 symptoms, 5 groups) + resolver (U3)"
**Date:** 2026-07-26
**Commits reviewed:** 1 (cc2f57e)
**Unit:** U3 of `docs/superpowers/plans/2026-07-25-menopause-behavior-foundation.md` (orchestration run `orchestration-menopause-behavior-foundation-2026-07-26`)

## Summary

U3 adds `lib/menopauseSymptoms.ts` — a static 13-entry symptom taxonomy across 5 groups (`vasomotor` ×2, `sleep` ×2, `mood` ×3, `physical` ×4, `genitourinary` ×2), a `menopauseSymptomLabel()` lookup, and a `resolveMenopauseSymptomId()` resolver that normalizes case/spacing/underscores/hyphens and falls back to a hand-written `ALIASES` map, returning `null` for unrecognized input. Re-ran the suite directly: `npx jest lib/__tests__/menopauseSymptoms.test.ts lib/__tests__/menopauseStage.test.ts` → 3/3 pass for this unit (6/6 combined with U4); `npx tsc --noEmit` → 0 errors. The taxonomy itself is internally consistent: 13 unique ids with no duplicates, the `MenopauseSymptomId` union and the `ALL_MENOPAUSE_SYMPTOMS` array are in exact 1:1 correspondence (no orphaned type members, no untyped array entries), and every entry's `group` is one of the 5 declared `MenopauseGroup` values.

The one real finding is in the resolver: I wrote a standalone script reproducing `NORMALIZE` + the `ALIASES` table and checked, for every alias key, whether it would already have matched via the `byId`/`byLabel` passes that run *before* `ALIASES` is ever consulted. Result: **12 of the 13 `ALIASES` entries are dead code** — unreachable because `NORMALIZE` (lowercase + strip `\s_-`) already collapses the id or label to the exact same string. Only `insomnia: 'sleep'` is a genuine, load-bearing synonym. This doesn't cause any wrong answers (the dead entries would resolve correctly anyway via `byId`/`byLabel`), but it directly contradicts the "no dead entries" bar this review was scoped against, and risks misleading a future maintainer into thinking the alias table is doing more work than it is.

**Findings:** 0 P0, 0 P1, 1 P2

---

## P2 Findings (should fix, non-blocking)

### P2-1: 12 of 13 `ALIASES` entries in `resolveMenopauseSymptomId` are unreachable dead code

- **File:** `lib/menopauseSymptoms.ts:44-56`
- **Issue:** `resolveMenopauseSymptomId` checks `byId` then `byLabel` (both via `NORMALIZE`) before falling back to `ALIASES`. Since `NORMALIZE` already strips `_`/`-`/whitespace and lowercases, any input that collapses to one of the ids-without-underscores or labels-without-spaces is already caught by `byId`/`byLabel`. I verified this programmatically (reimplementing the exact logic in a scratch script) against every key in `ALIASES`:

  | alias key | already caught by | dead? |
  |---|---|---|
  | `hotflash`, `hotflashes` | byId / byLabel (`hot_flash`) | dead |
  | `nightsweat`, `nightsweats` | byId / byLabel (`night_sweat`) | dead |
  | `sleeptrouble` | byLabel (`sleep`) | dead |
  | `insomnia` | — | **live (only real alias)** |
  | `lowmood` | byId+byLabel (`low_mood`) | dead |
  | `brainfog` | byId+byLabel (`brain_fog`) | dead |
  | `jointaches`, `jointpain` | byLabel / byId (`joint_pain`) | dead |
  | `weightchange` | byLabel (`weight`) | dead |
  | `vaginaldryness` | byId+byLabel (`vaginal_dryness`) | dead |
  | `lowlibido` | byLabel (`libido`) | dead |

- **Impact:** None functionally — every dead entry maps to the same id that `byId`/`byLabel` would have already returned. The impact is purely maintenance/clarity: the table reads as if it captures 12 distinct synonym cases when it only adds one. It also means if the taxonomy's ids/labels are ever renamed, these entries silently stop being redundant-but-harmless and could start being redundant-but-*wrong* (still resolving to the old id) with no test coverage calling them out, since the existing tests never exercise the `ALIASES` fallback path directly (the 3rd test's `'night sweats'` case is caught by `byLabel`, not `ALIASES`).
- **Fix:** Trim `ALIASES` down to genuine synonyms not derivable from id/label normalization (e.g. keep `insomnia: 'sleep'`; consider adding real synonyms like `flushes`/`flush` for `hot_flash` if product wants broader free-text matching), and add a test that exercises the `ALIASES` branch specifically (e.g. `resolveMenopauseSymptomId('insomnia')` — currently untested even though it's the one alias that matters).
- **Effort:** Small

---

## Additional observations (not filed as findings)

- **Naming overlap:** the `MenopauseGroup` value `'sleep'` and the `MenopauseSymptomId` value `'sleep'` (for "Sleep trouble") are the same literal string used for two different concepts. TypeScript keeps them safely distinct (confirmed via `tsc --noEmit`) and tests pass, so this isn't a defect — just a minor readability trap for anyone grepping the codebase for `'sleep'`. Not worth a dedicated fix, but worth a mental note if the taxonomy grows.
- **Domain categorization is a product judgment call, not a code defect:** grouping `fatigue` under `sleep` and `brain_fog` under `mood` (rather than e.g. a separate "cognitive" bucket) is a reasonable, defensible taxonomy choice consistent with common menopause-symptom framing; flagging only for visibility, not as an issue.

## What was verified and is clean

- **Taxonomy shape:** exactly 13 entries, exactly 5 distinct groups (`vasomotor` 2, `sleep` 2, `mood` 3, `physical` 4, `genitourinary` 2), no duplicate ids, `MenopauseSymptomId` union and array contents match 1:1.
- **`menopauseSymptomLabel`:** correct lookup with a safe `?? id` fallback that is effectively unreachable given the type/array are in sync.
- **Resolver core behavior:** id lookup, label lookup, case-insensitivity, and whitespace/underscore/hyphen normalization all verified correct by direct trace of the 4 test assertions plus the alias-reachability script above. Unknown input correctly returns `null`.
- **Tests:** `lib/__tests__/menopauseSymptoms.test.ts` — 3/3 pass (re-ran directly, not just trusting the reported 6/6).
- **Typecheck:** `npx tsc --noEmit` — 0 errors.

## Overall verdict

**Pass, with one non-blocking cleanup.** The taxonomy and resolver are correct and well-tested for everything the tests actually exercise. The only finding (P2-1) is dead code, not a functional bug — safe to ship as-is, but worth trimming `ALIASES` down to `insomnia` (plus any real synonyms product wants) before this file grows further, since every new "helpful-looking" alias added without checking reachability compounds the same problem.
