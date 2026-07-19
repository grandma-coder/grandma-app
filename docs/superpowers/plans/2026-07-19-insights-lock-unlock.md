# Insights Lock→Unlock (Cycle template) — Implementation Plan

> **For agentic workers:** implement task-by-task; each task ends typecheck-clean + committed. Diffuse-only; cream + pregnancy + kids untouched (the shared-card change defaults inert).

**Goal:** Turn cold-start empty cycle-Insights metrics into warm locked tiles (blob + padlock + progress) that unlock as the user logs data, with a one-time "Unlocked" toast. Light — no points/badge economy.

**Spec:** docs/superpowers/specs/2026-07-19-insights-lock-unlock-design.md

## Global Constraints
- Diffuse variant only for new UI. `DiffuseStatCard`'s new `locked` prop MUST default to inert → pregnancy/kids/cream byte-identical.
- Design tokens only (dt.colors / diffuseFont / stickers). Padlock from existing `BadgesLockedState` (components/stickers/MissingStickers.tsx:626) or a small lock glyph.
- No hardcoded user-facing strings — all via `t()`, keys added to keys.ts + all 12 locale files (non-partial TranslationKeys). t() interpolation is DOUBLE-BRACE `{{name}}`.
- Persisted store MUST follow the useBadgeStore pattern: `persist` + `createJSONStorage(AsyncStorage)` + `hydrated` flag + `onRehydrateStorage → setHydrated(true)`. Gate on `hydrated` before deciding celebrated-state.
- tsc gate: `npm run typecheck 2>&1 | grep "error TS" | grep -vE "GarageScreen|community|village|channel/|CycleHome|CycleToday|CycleJourney"` must be EMPTY (those are foreign uncommitted files with a live render-loop — NOT ours; do not touch them).
- Commit per task, explicit file staging (never `git add -A`).
- STAY OUT of components/home/* (concurrent session actively editing + render-loop bug there). This pass is Insights only.

---

## Task 1: `useUnlockStore` (persisted celebrated-set) + unit test

**Files:** Create `store/useUnlockStore.ts`; Test `store/__tests__/useUnlockStore.test.ts` (or lib/__tests__ if store tests live there — check; put the PURE reducer logic where testable).

**Produces:**
- `useUnlockStore` with: `celebrated: string[]`, `hydrated: boolean`, `hasCelebrated(key: string): boolean`, `markCelebrated(key: string): void`, `markManyCelebrated(keys: string[]): void`, `setHydrated(h)`.
- keys are strings like `"cycle:regularity"`.

**Steps:**
1. Write failing test for the pure logic: markCelebrated adds a key; hasCelebrated true after; markManyCelebrated is idempotent (no dupes); markCelebrated on an existing key is a no-op. (Test the store's actions directly via `useUnlockStore.getState()`.)
2. Run `npm test -- useUnlockStore` → fails (no module).
3. Implement mirroring `store/useBadgeStore.ts` persist pattern exactly (persist name e.g. `'unlock-storage'`, `createJSONStorage(AsyncStorage)`, `hydrated:false`, `onRehydrateStorage` sets hydrated true). `markMany` dedupes via Set.
4. `npm test -- useUnlockStore` → pass.
5. `npm run typecheck` (filtered) clean.
6. Commit: `feat(insights): useUnlockStore — persisted per-metric unlock-celebration set`

---

## Task 2: `cycleUnlocks` pure helper + unit test

**Files:** Add to `lib/cycleAnalytics.ts` (or a new `lib/cycleUnlocks.ts` — prefer a new file, pure, no React); Test `lib/__tests__/cycleUnlocks.test.ts`.

**Produces:**
```ts
export type CycleMetricKey = 'cycleLength' | 'regularity' | 'fertile' | 'bbt' | 'pms' | 'mood' | 'intercourse'
export interface LockState { locked: boolean; current: number; target: number }  // target 1 for single-shot
export function cycleUnlocks(input: {
  cyclesClosed: number      // history.cycles.filter(lengthDays!=null).length
  periodsLogged: number     // history.cycles.length (any start)
  bbtReadings: number       // bbt.series.length
  symptomCount: number      // pms.topSymptoms reduce count, or a passed total
  moodCount: number         // mood.recent.length (or distribution total)
  intercourseCount: number  // intercourse.thisCycleCount (or total)
}): Record<CycleMetricKey, LockState>
```
Thresholds (from spec): cycleLength target1 (cyclesClosed≥1), regularity target3 (cyclesClosed≥3), fertile target1 (periodsLogged≥1), bbt target1 (bbtReadings≥1), pms target1 (symptomCount≥1), mood target1 (moodCount≥1), intercourse target1 (intercourseCount≥1). `locked = current < target`; clamp `current` to `target` for display.

**Steps:** TDD — test: zero input → all locked with current 0; regularity locked at 2 cycles (2 of 3) but cycleLength+fertile unlocked; all-unlocked when counts exceed. Run fail → implement → pass → typecheck. Commit: `feat(insights): cycleUnlocks — per-metric lock/progress from cycle data`

---

## Task 3: `DiffuseStatCard` locked state (shared primitive, inert by default)

**Files:** Modify `components/ui/diffuse/DiffusePrimitives.tsx` (DiffuseStatCard + StatCardProps).

**Steps:**
1. Add to `StatCardProps`: `locked?: boolean`, `lockProgress?: { current: number; target: number }`, `lockHint?: string`.
2. In the render, when `locked` is truthy, replace the value/emptyLabel block with a locked block:
   - the header `icon` renders dimmed (wrap in a View `opacity: 0.4`) with a small padlock overlaid bottom-right (a tiny `BadgesLockedState`-style lock or a lock glyph, ~14px, in `colors.ink3`).
   - body: `lockHint` (roleType.data mono, `colors.ink3`) + when `lockProgress` provided AND `target > 1`, a slim progress track (2px bar, `colors.line` bg, `colors.ink3` fill width = current/target) with a tiny "{current} of {target}" mono caption. For target 1, no bar — just the hint.
   - `onPress` still active.
3. When `locked` is falsy/undefined → existing behavior 100% unchanged (this is the back-compat guarantee — verify pregnancy/kids call sites pass nothing).
4. Padlock: import BadgesLockedState from '../../stickers/MissingStickers' OR draw a 14px lock inline with react-native-svg (simpler, tokenized). Choose whichever is cleaner; keep it small.
5. Typecheck (filtered) clean. Visual deferred.
6. Commit: `feat(insights): DiffuseStatCard locked state (blob+padlock+progress), inert by default`

---

## Task 4: Wire cycle tiles + Mood section + unlock detection (`CycleAnalytics.tsx`)

**Files:** Modify `components/analytics/CycleAnalytics.tsx`. Uses Task 1/2/3.

**Steps:**
1. Import `cycleUnlocks` (Task 2), `useUnlockStore` (Task 1). Compute `const unlocks = cycleUnlocks({...})` from the existing hook data (history, bbt, pms, mood, intercourse). Derive counts: cyclesClosed = closed cycles, periodsLogged = history.cycles.length, bbtReadings = bbt?.series.length ?? 0, symptomCount = pms?.topSymptoms.reduce((a,s)=>a+s.count,0) ?? 0, moodCount = mood?.recent?.length ?? 0 (or distribution total), intercourseCount = intercourse?.thisCycleCount ?? 0.
2. `GridTile` gains optional `lock?: LockState` + `lockHint?: string`. In its Diffuse branch pass to DiffuseStatCard: `locked={lock?.locked}`, `lockProgress={lock && lock.target>1 ? {current:lock.current,target:lock.target} : undefined}`, `lockHint={lockHint}`. When locked, still `value={undefined}` so the card shows the locked block.
3. At each of the ~7 tile call sites, pass the matching `unlocks[key]` + a `lockHint` t() string (per spec table). (Cervical mucus tile is cream-only already — no change.)
4. Mood **section**: currently `{diffuse && mood?.recent?.length > 0 && <Section>...}`. Add an ELSE: when diffuse && locked (moodCount===0), render a slim locked `Section` with title "Mood This Cycle", subtitle/hint "Log your mood to unlock", onPress → setDetailType('mood'), body = a compact locked prompt (a small locked row, NOT the MoodStrip). Keep it minimal.
5. **Unlock detection effect:** add
   ```
   const { hasCelebrated, markCelebrated, markManyCelebrated, hydrated } = useUnlockStore(...)
   const [toast, setToast] = useState<{metric:string}|null>(null)
   const seededRef = useRef(false)
   useEffect(() => {
     if (!hydrated) return
     const unlockedKeys = Object.entries(unlocks).filter(([,s]) => !s.locked).map(([k]) => `cycle:${k}`)
     if (!seededRef.current) {
       // first hydrated render: silently mark all currently-unlocked as celebrated (no spray)
       markManyCelebrated(unlockedKeys); seededRef.current = true; return
     }
     const fresh = unlockedKeys.find((k) => !hasCelebrated(k))
     if (fresh) { markCelebrated(fresh); setToast({ metric: fresh.split(':')[1] }) }
   }, [hydrated, /* stable dep on unlocked signature */ unlockedKeys.join(',')])
   ```
   (Compute `unlockedKeys` string outside for a stable dep; keep the effect minimal + correct.)
6. Render the unlock toast (Task 5 component) when `toast` set; auto-clear.
7. i18n: add the lock-hint keys + progress key + toast key (keys.ts + 12 locales). Reuse existing where wording fits.
8. `npm run typecheck` + `npm run i18n:check` clean (filtered).
9. Commit: `feat(cycle): locked tiles + Mood locked prompt + one-time unlock toast`

---

## Task 5: Unlock toast pill component

**Files:** Create `components/ui/diffuse/UnlockToast.tsx` (or inline in a shared spot). Consumed by Task 4 (build this BEFORE Task 4's step 6 references it, or fold into Task 4).

**Steps:**
1. A small Diffuse-styled pill: `UnlockToast({ metricLabel, onDone })` — absolutely-positioned near top or above tab bar, fades in, shows "Unlocked ✨ your {{metric}} is ready" (t()), auto-dismiss ~2.5s via setTimeout → onDone. Reanimated FadeIn/FadeOut or Animated. Tokens only.
2. Keep it presentational + self-contained. No store access.
3. Typecheck clean. Commit (fold with Task 4 if simpler): `feat(insights): UnlockToast pill`

> Execution note: Task 5's component is used by Task 4 — build Task 5 first, or combine 4+5 into one commit.

---

## Task 6: Cycle detail-sheet empty states → DiffuseEmptyState + CTA

**Files:** Modify `components/analytics/CycleDetailSheets.tsx`.

**Steps:**
1. In each body's `if (!data...) return <EmptyState copy=.../>`, replace (DIFFUSE branch) with `<DiffuseEmptyState icon={...} title={...} message={copy} ctaLabel={...} onCta={...} />`. Cream keeps the plain `EmptyState` text.
2. `icon` = the metric's blob (SymptomBlob/Character) or a lock glyph; `title` = the metric title; `message` = existing copy; `ctaLabel`/`onCta` = "Log a period"/etc routing via `router.push` to the relevant log entry (or closing the sheet + opening the log — check how the app opens a cycle log form; if no direct route, CTA can just close the sheet, keep it honest — do NOT invent a route that doesn't exist).
3. Verify DiffuseEmptyState import + its prop shape (DiffusePrimitives.tsx:449).
4. i18n for any new CTA labels.
5. Typecheck + i18n clean. Commit: `feat(cycle): rich DiffuseEmptyState (icon+CTA) in detail sheets`

---

## Self-review notes
- Spec coverage: store→T1, thresholds→T2, locked card→T3, wiring+detection+mood+toast→T4/T5, sheets→T6. Covered.
- Toast-spray guard = T4 step 5 seed-on-first-render. Hydration gate = T1 + T4 effect `if(!hydrated)return`.
- Back-compat: T3 `locked` defaults inert.
- Verification: unit tests (T1,T2); sim visual deferred until foreign Home render-loop clears (documented blocker).
