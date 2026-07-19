# Insights Empty → Locked → Unlocked — Design (Cycle template)

**Date:** 2026-07-19
**Status:** Approved (design), pending plan + implementation
**Scope THIS pass:** CYCLE Insights only (surface tiles + detail sheets + the one Mood section). Built as reusable primitives so pregnancy / kids / Home reuse them in later passes with no rework.
**Variant:** Diffuse only (default). Cream/current path preserved unchanged throughout.

## Problem

For a new user with no logged data, Insights cold-start is inconsistent and uninviting:
- Empty tiles show a dead `'—'` (cycle overrides `DiffuseStatCard`'s built-in `'Tap to log'` emptyLabel with `'—'`).
- Sections hide entirely when empty → the user never learns the feature exists.
- Detail sheets use bare centered text (`"Log your first period…"`), no icon/CTA — unlike Kids, which already uses the rich `DiffuseEmptyState`.

There's no sense of progression — nothing tells the user *what* to log or that value is *coming*.

## Solution (light unlock — no points/badge economy)

Reframe every empty metric as **locked → in-progress → unlocked**, with a small one-time unlock celebration. Reuse existing pieces: `DiffuseStatCard`, `DiffuseEmptyState`, the locked-padlock visual (`app/profile/badges.tsx` / `BadgesLockedState`), the reward-reveal tone, and the already-shipped "Locked"/"To unlock" i18n vocabulary. Do NOT wire into `useBadgeStore`/points.

### Unlock thresholds (from real code — progress copy must be truthful)
| Cycle metric | Unlock condition | Locked copy |
|---|---|---|
| Cycle Length | ≥1 closed cycle | "Log a period to unlock" |
| Regularity | ≥3 cycles | "3 cycles · {n} of 3" |
| Fertile Window | ≥1 period logged | "Log a period to unlock" |
| Basal Temp | ≥1 BBT reading | "Log your temperature to unlock" |
| Cervical Mucus (cream only tile) | ≥1 mucus log | (cream path; unchanged) |
| Symptom Days | ≥1 symptom | "Log a symptom to unlock" |
| Mood (section) | ≥1 mood | slim locked prompt (not hidden) |
| Intercourse (TTC tile) | ≥1 intercourse log | "Log intimacy to unlock" |

Single-shot metrics (≥1) show "Log X to unlock"; multi-count metrics (regularity ≥3) show "{n} of 3" progress.

## Components / files

### New primitives (reusable across behaviors)
1. **Locked state on `DiffuseStatCard`** — extend, don't replace. Add optional props:
   - `locked?: boolean`
   - `lockProgress?: { current: number; target: number }` (omit for 1-shot)
   - `lockHint?: string` (e.g. "Log a period to unlock")
   When `locked`, the card renders: the metric's own `icon` **dimmed** (opacity ~0.4) with a **small padlock badge** overlaid, the `label` as usual, and in place of the value: the `lockHint` (mono/italic, ink3) + a slim progress line ("{current} of {target}") when `lockProgress` given. Same footprint/bloom (softened, per the earlier bloom work). Still `onPress`-able. Default (`locked` false/undefined) = exactly current behavior → pregnancy/kids unaffected.
   - Padlock: reuse `BadgesLockedState` (components/stickers/MissingStickers.tsx:625) or a small lock glyph; tinted from tokens.

2. **`useUnlockStore`** (new tiny Zustand persisted slice, or extend an existing store) — tracks which metric unlocks have already been *celebrated*, so the toast fires once:
   - state: `celebrated: string[]` (keys like `"cycle:regularity"`)
   - `hasCelebrated(key): boolean`, `markCelebrated(key): void`
   - persisted (AsyncStorage) with a `hydrated` flag + `onRehydrateStorage` (per repo Zustand convention).

3. **Unlock toast** — a small Diffuse-styled pill/toast: "Unlocked ✨ — your {metric} is ready". Reuse `SavedToast`'s modal-pill pattern OR a lightweight inline animated pill; auto-dismiss ~2.5s. Presentational; fired by the surface when a newly-crossed unlock is detected AND not yet celebrated.

### Cycle wiring (`components/analytics/CycleAnalytics.tsx`)
- Compute per-tile `locked` + `lockProgress` + `lockHint` from the existing hooks (`history.cycles.length`, `bbt.series.length`, `pms`, `mood`, `intercourse`, `fertile`). A small local `cycleUnlocks(...)` helper returns the lock state per metric (pure; unit-testable).
- Pass locked props into each `GridTile` → `DiffuseStatCard`.
- Mood **section**: when `mood.recent.length === 0`, render a slim locked `Section` prompt ("Mood — log your mood to unlock") instead of hiding.
- **Unlock detection:** in an effect, when a metric's `locked` flips false and `!hasCelebrated(key)`, enqueue the toast + `markCelebrated(key)`. Guard against firing on first-load-with-data (a brand-new install with seeded data shouldn't spray toasts): only celebrate an unlock observed to *transition* within a session, OR seed `celebrated` with all currently-unlocked keys on first hydrated render so only genuinely new unlocks toast. (Decision: on first hydrated render, mark all already-unlocked metrics as celebrated silently; thereafter real transitions toast.)

### Cycle detail sheets (`components/analytics/CycleDetailSheets.tsx`)
- Replace the bare `EmptyState` (centered text) in each body with `DiffuseEmptyState` (Diffuse) — icon (the metric's SymptomBlob/Character or a lock), title, message, and a **tap-to-log CTA** routing to the relevant log form (period / bbt / symptom / mood). Cream keeps the plain text.
- Keep the existing per-body data gates; only the empty presentation upgrades.

## i18n
New keys (keys.ts + all 12 locales, English placeholders in non-English):
- `cycleInsights_lock_period`, `_temperature`, `_symptom`, `_mood`, `_intimacy` (the "Log X to unlock" hints)
- `cycleInsights_lock_progress` ("{{n}} of {{target}}")
- `cycleInsights_unlocked_toast` ("Unlocked ✨ your {{metric}} is ready")
- detail-sheet CTA labels (e.g. `cycleDetail_cta_logPeriod`) — or reuse existing log-form labels if present.
Reuse existing `badges_locked`/`dailyRewards_toUnlock` where wording fits.

## Non-goals
- No badge/points/leaderboard wiring (light unlock only).
- No pregnancy/kids/Home changes this pass (primitives built reusable for later).
- No DB/schema changes (all from existing hooks).
- No cream-variant changes.

## Risks / watch-items
- **Toast spray on cold start:** the "mark already-unlocked as celebrated on first hydrated render" rule is essential — verify a seeded account doesn't fire a burst of toasts on open.
- **Hydration gate:** `useUnlockStore` must respect its `hydrated` flag before deciding celebrated-state (repo's "week 1 flash" incident rule).
- **Concurrent session** is actively editing Cycle Home files + there's a live render-loop bug there — stay OUT of Home this pass; touch only Insights files.
- **DiffuseStatCard is shared** — the `locked` prop must default to inert so pregnancy/kids tiles are byte-identical.
- Design tokens only; padlock/lock visuals from existing sticker assets.
- Verify on simulator once the foreign Home render-loop clears (blocks navigation today).

## Success criteria
1. A no-data cycle user sees warm **locked tiles** (blob + padlock + "Log X to unlock" / "n of 3"), not dead dashes; Mood shows a locked prompt, not a hidden gap.
2. Tapping a locked tile opens a detail sheet with a rich `DiffuseEmptyState` + tap-to-log CTA.
3. Crossing a threshold fires a single "Unlocked ✨" toast, once (never re-fires, never sprays on cold start).
4. `DiffuseStatCard` default behavior unchanged → pregnancy/kids/cream untouched.
5. tsc + i18n parity clean; lock-state helper unit-tested.
