# Code Review — U9: MenopauseAnalytics (vasomotor, symptom stats, trends)

**Scope:** commit `0cac21c` only (`git show 0cac21c`)
**Files in commit:** `components/analytics/MenopauseAnalytics.tsx` (new, 608 lines), `app/(tabs)/vault.tsx` (+6/-2)
**Reviewer focus:** code correctness (visual/design fidelity is covered separately by design-critic). U9 is billed as a pure-view over U5's already-tested hooks (`useMenopauseLogs`, `computeSymptomStats`, `computeVasomotorFrequency`) — no new business logic expected.
**Method:** read every changed line plus every dependency it imports (`lib/menopauseAnalytics.ts`, `lib/menopauseStage.ts`, `lib/menopauseSymptoms.ts`, `store/useMenopauseStore.ts`, `components/menopause/{menoPalette,menopauseIcons}.ts`, `components/charts/SvgCharts.tsx` `BarChart`/`LineChart`, `components/analytics/shared/AnalyticsHeader.tsx`), diffed against the sibling U7/U8 menopause surfaces for convention consistency, ran `npx tsc --noEmit` (clean, 0 errors, whole project), ran `npx eslint` on both changed files, and ran the existing U5 test suites (`menopauseAnalytics.test.ts`, `menopauseStage.test.ts` — 6/6 pass).

**Findings:** 0 P0, 1 P1, 4 P2

---

## P1 — `lastPeriodDate`/`months` read without the `hydrated` gate that the sibling home screen requires for the same data

- **File:** `components/analytics/MenopauseAnalytics.tsx:84-96`
  ```tsx
  const hydrated = useMenopauseStore((s) => s.hydrated)
  const storeStage = useMenopauseStore((s) => s.stage)
  const lastPeriodDate = useMenopauseStore((s) => s.lastPeriodDate)
  const stage = hydrated ? storeStage : null
  ...
  const months = monthsSinceDate(lastPeriodDate, new Date())
  ```
- **Issue:** `stage` is correctly gated behind `hydrated` before use, but `lastPeriodDate` (and therefore `months`, and therefore the hero line and the months-since-last-period pip timeline) is read raw from the persisted store with no equivalent gate. `useMenopauseStore` (`store/useMenopauseStore.ts`) is a `persist`-backed Zustand store whose initial in-memory state is `lastPeriodDate: null` until `AsyncStorage` rehydrates. Before rehydration completes, `monthsSinceDate(null, now)` returns `null`, so the hero line falls back to `"Tracking your symptoms over time"` instead of the real `"X months since your last period"` — a value that can flip the instant hydration finishes.
- **Why this is a real, verified gap and not speculation:** the sibling `components/home/MenopauseHome.tsx` (U8), which reads the exact same `hydrated`/`stage`/`lastPeriodDate` triple from the exact same store, has an explicit hard gate for this:
  ```tsx
  // Hydration gate — never render store-derived UI (stage / months / offer)
  // before AsyncStorage rehydrates, or the home flashes a null stage first.
  if (!hydrated) {
    return (
      <View style={[styles.root, styles.loaderRoot, { backgroundColor: pal.bg }]}>
        <BrandedLoader label="Loading" />
      </View>
    )
  }
  ```
  This is also the exact pattern CLAUDE.md/`.claude/rules/code-style.md` mandates project-wide ("Persisted stores MUST have a `hydrated` flag + `onRehydrateStorage` callback... Without it, the first render reads default state and flashes before AsyncStorage finishes — see the 'week 1 → week 40 flash' incident" / pre-write checklist item 7: "am I waiting on `store.hydrated` before rendering data-derived UI?").
- **Impact:** In practice this is low-visibility — `useMenopauseStore` is created (and starts its AsyncStorage read) at module load, well before a user is likely to tap into the Vault/Analytics tab, so rehydration will almost always have completed by the time this screen mounts. It's most likely to actually flash on a cold start that lands directly on this tab (deep link / restored last-tab) or during Fast Refresh in dev. Low severity in practice, but it's a documented "MUST" rule with a named precedent this exact commit chain already fixed once (U8), so it's flagged at P1 rather than P2.
- **Suggested fix (not applied — report only):** either gate the whole screen behind `if (!hydrated) return <Loader/>` (mirroring `MenopauseHome`), or at minimum compute `months` from a hydration-gated `lastPeriodDate` the same way `stage` already is: `const effectiveLastPeriodDate = hydrated ? lastPeriodDate : null` is not actually sufficient by itself (it's already effectively `null` pre-hydration) — the real fix is the same pattern `MenopauseHome` uses: don't render the *derived* copy at all until `hydrated` is true.
- **Verified:** read `store/useMenopauseStore.ts` in full (confirms `lastPeriodDate: null` initial state + async `onRehydrateStorage`), and `components/home/MenopauseHome.tsx:104-176` in full (confirms the sibling's explicit gate + comment naming this exact failure mode).

---

## P2 — `severitySeries()` (new pure function) has no unit test coverage

- **File:** `components/analytics/MenopauseAnalytics.tsx:56-74`
- **Issue:** Unlike `computeSymptomStats`/`computeVasomotorFrequency` (U5, covered by `lib/__tests__/menopauseAnalytics.test.ts`), the per-day mean-severity helper that drives the Sleep & Mood trend charts is new logic introduced by U9 and lives inline in the component file — it is not exported, and has no test file.
- **I manually verified the math is correct:** groups by `date` into `{sum, n}`, only increments when `r.type === type && r.severity != null`, divides `sum/n` (never 0/0 since a map entry only exists after at least one increment), sorts dates ascending via `localeCompare` (safe for `YYYY-MM-DD` strings), and is consumed only through `TrendRow`, which itself gates `series.data.length >= 2` before calling `LineChart` (which independently also returns `null` for `<2` points) — so the <2-points guard is double-covered. No divide-by-zero, no off-by-one found.
- **Impact:** Low — logic is simple and was verified by reading, but it's untested, unlike every other piece of math this unit consumes.
- **Not fixed here** (report only, per instructions).

## P2 — `s.id as MenopauseSymptomId` is an unsafe type-assertion surfaced (not introduced) by this unit

- **File:** `components/analytics/MenopauseAnalytics.tsx:182`
  ```tsx
  label={menopauseSymptomLabel(s.id as MenopauseSymptomId)}
  ```
- **Issue:** `SymptomStat` (`lib/menopauseAnalytics.ts:6`) types `id` as plain `string`, even though `computeSymptomStats` only ever populates it via `resolveMenopauseSymptomId(r.type)`, which returns `MenopauseSymptomId | null` and is only stored on the non-null branch — so at runtime `s.id` is always a valid `MenopauseSymptomId`, but the type system doesn't know that, forcing this `as` cast to satisfy `menopauseSymptomLabel`'s narrower parameter type. `symptomBlob(s.id)` two lines up needs no cast because it accepts plain `string` with a `'note'` fallback for unknowns — the inconsistency is between the two helper signatures, not this call site.
- **Impact:** Runtime-safe today (verified: every call path into `SymptomStat.id` is gated), purely a static-soundness gap. The type itself belongs to U5's already-shipped `lib/menopauseAnalytics.ts`, so this isn't a new defect introduced by U9, just newly exercised by it.
- **Not fixed here** (report only, per instructions; the real fix — narrowing `SymptomStat.id` to `MenopauseSymptomId` — belongs in U5's file, out of this unit's scope).

## P2 — 6 `i18next/no-literal-string` ESLint errors (matches the rest of the un-i18n'd menopause feature — not a new regression)

- **File:** `components/analytics/MenopauseAnalytics.tsx:120, 173, 366, 392-393, 416, 419` (`"YOUR MENOPAUSE"`, `"Top symptoms"`, `"SINCE YOUR LAST PERIOD"`, the clinician note, `"No patterns yet"`, the empty-state body)
- **Issue:** `npx eslint components/analytics/MenopauseAnalytics.tsx` reports 7 errors, 6 of which are `i18next/no-literal-string` for hardcoded English copy.
- **Not a U9-specific regression:** `npx eslint components/home/MenopauseHome.tsx` (U8, already merged) reports 10 of the identical errors, and `MenopauseLogForms.tsx` (U7) carries an explicit code comment: *"English literals — no menopause i18n keys exist yet."* This is a known, accepted, feature-wide gap across the whole menopause behavior, not something U9 introduced or made worse proportionally.
- **Impact:** Real lint failures if `i18next/no-literal-string` is enforced in CI; zero functional impact.
- **Not fixed here** (report only; consistent with prior units' scope).

## P2 — new clinician-note copy uses a raw apostrophe where the sibling U8 file consistently escapes it

- **File:** `components/analytics/MenopauseAnalytics.tsx:393`
  ```tsx
  Many people consider 12 months a natural milestone — it's a conversation to have with your clinician, not a diagnosis here.
  ```
  `react/no-unescaped-entities` (ESLint) flags the raw `'` in `it's`.
- **Issue:** This has no runtime effect in React Native (unlike web-DOM JSX, an unescaped apostrophe inside `<Text>` renders fine on-device — this lint rule is a carry-over from web configs), so it is **not a functional bug**. It is flagged only because the sibling `components/home/MenopauseHome.tsx` (U8) consistently escapes the same kind of copy (`"It&apos;s been 12 months..."`, `"you&apos;re feeling today"`), so this is a small style inconsistency specific to the new U9 text, not present elsewhere pre-existingly.
- **Impact:** Cosmetic/lint-only.
- **Not fixed here** (report only).

---

## Verified correct (no findings — checked against the brief's specific claims)

- **Vasomotor per-day counts** (`computeVasomotorFrequency`, `lib/menopauseAnalytics.ts:27-34`): `Map`-accumulated per `date` for `type ∈ {hot_flash, night_sweat}`, sorted ascending by date string. Consumed at `MenopauseAnalytics.tsx:155-165`: `vaso.length >= 1` renders `BarChart`, else a `FallbackLine`. `BarChart` (`components/charts/SvgCharts.tsx:294`) independently guards `data.length === 0` → `null`, and its own `scaleMax = ticks[...] || 1` prevents a divide-by-zero on an all-zero series — the two guards line up (`>=1` in the consumer matches `>0` required by the chart) with no gap or overlap bug.
- **Top-symptom stats — count + avg severity** (`computeSymptomStats`, `lib/menopauseAnalytics.ts:11-24`): groups via `resolveMenopauseSymptomId`, correctly excludes `period`/`note`/unresolvable types, `avgSeverity = count ? sev/count : 0` (defensively guarded even though `count` is always ≥1 by construction), sorted descending by count, sliced to top 6 in the grid (`MenopauseAnalytics.tsx:177-186`). Confirmed severity is always populated on symptom-log rows (`components/menopause/MenopauseLogForms.tsx:62,120`: `StepSlider min={1} max={5}`, default 3 — never 0/null for this write path), so the `avgSeverity > 0` UI branch (`:184`) that falls back to `"N times"` is unreachable under current data-entry constraints but correctly defensive, not a bug.
- **Sleep/mood per-day mean severity** (`severitySeries`, local to this file — see P2 above for the test-coverage note): math independently re-derived and confirmed correct by hand; guarded for `<2` points both in `TrendRow` (`:331`) and inside `LineChart` itself (`SvgCharts.tsx:121`).
- **Empty state:** `hasData = rows.length > 0` (`:94`) renders `EmptyState` when `false` — this also covers the in-flight-loading window (before `useMenopauseLogs()`'s `data` resolves, `rows` is `[]` via the `data ?? []` fallback at `:82`), which is the same convention `CycleAnalytics.tsx:148` uses (`hasData = (history?.cycles.length ?? 0) > 0`, no separate loading state) — not a regression, matches the established sibling pattern the file's own header comment says it mirrors.
- **`useMenopauseLogs().data` undefined handling:** `const rows = useMemo<MenopauseLogRow[]>(() => data ?? [], [data])` (`:82`) — safe for `undefined` (pre-fetch), `[]` (fetched-empty), and populated arrays alike; every downstream computation only ever sees a real array.
- **Months-since-last-period timeline (peri only) + non-diagnostic guardrail:** `MonthsTimeline` renders only when `stage === 'peri'` (`:141`), reads `months` from `monthsSinceDate(lastPeriodDate, new Date())` (`lib/menopauseStage.ts:4-19`, itself already unit-tested and clamped to `Math.max(0, months)` with an invalid-date round-trip guard), and the ≥12-month note only appears when `months != null && months >= MONTH_PIPS(12)` (`:391-395`) with copy — *"Many people consider 12 months a natural milestone — it's a conversation to have with your clinician, not a diagnosis here."* — that is explicitly non-diagnostic/referral-framed, matching the project's documented vaccine/menopause reframe-compliance stance (never a verdict, always "talk to your clinician").
- **`vault.tsx` branch correctness:** `else if (mode === 'menopause') inner = <MenopauseAnalytics />` inserted between the unchanged `pregnancy` branch and the unchanged final `else` (kids catch-all). `pre-pregnancy` and `pregnancy` branches are untouched by the diff; `kids` still resolves via the same `else` it always did. `'menopause'` is a valid `JourneyMode` (`types/index.ts:31`). `npx eslint "app/(tabs)/vault.tsx"` reports zero errors. The pre-existing `examBehavior` ternary (unchanged by this diff, predates commit `0cac21c`) doesn't have a `'menopause'` case and would fall through to `'kids'` — but `MenopauseAnalytics` never receives or calls `onExamsPress`/`handleExams` (unlike `PregnancyAnalytics`, which does), so that pre-existing fallthrough is dead code for this mode and out of scope for what U9 changed.
- **Isolation from the concurrent Kids session:** `git diff 0cac21c~1 0cac21c --name-only` shows only `app/(tabs)/vault.tsx` and `components/analytics/MenopauseAnalytics.tsx` in this commit. `MenopauseAnalytics.tsx` contains zero references to `analyticsData`, `KidsAnalytics`, or any `i18n` import — grep confirms no match. The working tree's concurrent Kids-session changes (`lib/analyticsData.ts`, `lib/__tests__/kidsScoring.test.ts`, new `lib/kidsPillarInsights.ts`) are untouched, uncommitted, and untouched by this commit.
- **No key warnings:** `key={s.id}` on the top-symptoms grid (unique per `SymptomStat.id`, deduplicated by the source `Map`), `key={i}` on the fixed-length-12 `MONTH_PIPS` pip row (static array, safe index key).
- **Memoization:** `rows`, `vaso`, `symptomStats`, `sleepSeries`, `moodSeries` are all `useMemo`'d with correct, minimal dependencies (`[data]`, `[rows]` ×4) — no derived list recomputes on every render; `rows`'s own referential stability (memoized off `[data]`) means the four downstream memos only re-run when the query result identity actually changes.
- **No perf issue over the log list:** every derivation (`computeVasomotorFrequency`, `computeSymptomStats`, `severitySeries` ×2) is a single `O(n)` `Map`-accumulation pass plus an `O(k log k)` sort over the small number of distinct days/symptoms (not `O(n²)`) — consistent with the already-shipped U5 hooks' complexity, no N+1 or per-row Supabase call (data is fetched once via `useMenopauseLogs()`, all math is client-side/in-memory).
- **`npx tsc --noEmit`:** clean, 0 errors, across the whole project (including the `as MenopauseSymptomId` cast noted above, which is type-sound even though loosely typed at the source).
- **U5 regression check:** `npx jest lib/__tests__/menopauseAnalytics.test.ts lib/__tests__/menopauseStage.test.ts` — 2 suites, 6 tests, all pass. U9 did not modify U5's files, and nothing here broke them.

---

## Verdict

**Pass, advisory-only.** No P0s. One P1 — a real, verified gap where `lastPeriodDate`/`months` skip the `hydrated` gate that this exact store's sibling consumer (`MenopauseHome.tsx`, U8) explicitly applies for the identical fields, with a code comment naming the precise failure mode this could reproduce — flagged at P1 on documented-rule + sibling-precedent grounds even though real-world visible risk is low (the store hydrates well before a user typically reaches this tab). Four P2s: no test coverage for the one genuinely new pure function (`severitySeries`, though manually verified correct), an unsafe type cast whose root cause lives in U5's already-shipped types, and two lint findings (6 un-i18n'd literal strings matching the feature-wide known gap, plus one new unescaped apostrophe inconsistent with the sibling file's own convention — both cosmetic, no runtime effect). All of the review brief's explicit correctness claims — vasomotor/symptom/sleep-mood math, divide-by-zero and `<2`-point guards, empty-state and `data`-undefined handling, the non-diagnostic ≥12-month clinician note, the `vault.tsx` branch, keys, memoization, list-perf, and isolation from the concurrent Kids session — check out. Nothing here blocks merge.
