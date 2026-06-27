# Caregiver Phase 1 — Session Handoff

**Date:** 2026-06-26
**Branch:** `main` (user works directly on main — no branches/worktrees)
**Plan:** `docs/plans/2026-06-26-001-feat-caregiver-scoped-surface-plan.md`
**Follow-up backlog:** `docs/plans/2026-06-26-002-feat-caregiver-phase-1.5-followups.md`
**Origin brainstorm:** `docs/brainstorms/2026-06-26-caregiver-roles-child-record-requirements.md` (also in Skeleton → Grandma space → Brainstorms)

---

## TL;DR — where we are

Phase 1 of the caregiver / lifelong-child-record feature is **fully implemented and
committed to `main`** (8 commits, U1–U7 + F1/F2). All app code is shipped. The **only
remaining work is applying the 2 RLS migrations to the live DB and running the leak test** —
this is blocked solely because the Supabase MCP server was disconnected at the end of the
session. Nothing is lost.

---

## Committed to `main` (8 commits)

| Commit | Unit | Summary |
|--------|------|---------|
| `34f47b4` | U1 | Widen `CaregiverPermissions` (+edit_child/emergency/meta keys); `lib/caregiverPermissions.ts` helper (`hasCapability`/`isCaregiver`/`CAPABILITY`). 8 tests. |
| `db79b4c` | U2 | `store/useCaregiverStore.ts` (hydration-gated); boot writes persona, dead `userRole` removed; added to `lib/signOut.ts` clear-list. 6 tests. |
| `3bfe79e` | U3 | `supabase/migrations/20260626120000_caregiver_phi_gating.sql` — `get_caregiver_children()` SECURITY DEFINER RPC masks PHI; `app/_layout.tsx` boot calls RPC instead of `children(*)` embed. |
| `433f7ed` | U7 | `supabase/migrations/20260626130000_caregiver_read_gates.sql` — gate `chat_messages` SELECT on `chat` flag + owner `parent_id` branch; `view` resolved presentation-only. |
| `c51c5f3` | U4, U5 | `components/caregiver/{CaregiverHome,CaregiverChildPicker,CaregiverLogSheet}.tsx`; home-tab branch in `app/(tabs)/index.tsx`. Withheld affordances HIDDEN. |
| `014d669` | U6 | `accept-invite` preview mode (real granted perms, no PHI) in edge fn + screen; `invite-caregiver` sends role-default permissions. |
| `1a687cb` | F1, F2 | Switch-to-caregiver-child resets to home tab; CaregiverHome header a11y; Phase 1.5 backlog doc. |

**Verification done this session:** 14 new tests pass; all caregiver files typecheck clean.

**Pre-existing failures (NOT ours — do not "fix" as part of this work):**
- `lib/__tests__/cycleLogic.test.ts` fails, `scripts/__tests__/i18n-check.test.ts` fails.
- `tsc` errors in `components/home/KidsHome.tsx:7257` (`Cannot find name 't'`) and the whole
  `lib/i18n/*.ts` cascade (`kidsAnalytics_*` keys missing from locale files).
- These are in-flight cycle + i18n work that was uncommitted in the tree when this session
  began. Our 8 commits touch none of those files (verified via `git diff --name-only`).

---

## ▶️ NEXT ACTION (the only blocked item)

Apply the two RLS migrations to the live Supabase project, then run the leak test.

**Project:** `icohpzzfpabzvwuumcct` (single project — this IS prod; there is no separate dev).

### Step 1 — apply migrations

Two pending migration files, must apply in timestamp order:
1. `supabase/migrations/20260626120000_caregiver_phi_gating.sql`
2. `supabase/migrations/20260626130000_caregiver_read_gates.sql`

**Route A (CLI — the project's normal path):**
```
supabase db push
```
**Route B (Supabase MCP — was disconnected at session end; retry with `/mcp` reconnect):**
`apply_migration(project_id="icohpzzfpabzvwuumcct", name=..., query=<file contents>)` for each, in order.

### Step 2 — RLS leak test (plan's definition-of-done)

Use the `rls-tester` agent or a manual two-synthetic-user matrix on dev/staging
posture (NOT service role — test as each user's JWT):

**U3 (PHI masking via `get_caregiver_children()`):**
- Caregiver with `emergency:false` → `select * from get_caregiver_children()` returns
  `blood_type` NULL and `conditions/medications/allergies` empty arrays, `pediatrician` NULL.
- Caregiver with `emergency:true` (or `edit_child:true`) → those columns populated.
- Caregiver with `_paused:true` → row not returned at all.
- Parent → full row, all PHI populated.

**U7 (chat read gate on `chat_messages`):**
- Caregiver with `chat:false` → `SELECT` on `chat_messages` for that child returns **0 rows**.
- Caregiver with `chat:true` (accepted, non-locked, non-paused) → reads chat history.
- Parent → reads their own child's chat regardless of any permissions blob.

---

## Phase 1.5 backlog (deferred, non-blocking)

See `docs/plans/2026-06-26-002-feat-caregiver-phase-1.5-followups.md`:
- **F3** — `PaperAlertButton` interface omits `onPress` though `handle()` calls it; tighten the type.
- **F4** — i18n the caregiver-surface literal strings (CaregiverHome/LogSheet/accept-invite labels) in a future i18n wave.
- Remaining a11y polish on log-type tiles / focus order.

---

## Key design decisions (so a new session doesn't re-litigate)

- **Capability model:** extend the existing `permissions` JSONB, NOT a new `caregiver_capabilities`
  table (user-chosen). Keep 3 presets (View Only / Contributor / Full); per-activity toggle matrix
  deferred to 1.5.
- **PHI gating shape:** SECURITY DEFINER RPC that masks columns (user-chosen over a `child_health`
  split table), because the boot does `select('*')`/`children(*)` and RLS can't strip columns.
- **`view` key:** presentation-only — every preset sets `view:true`, so a SELECT gate would be a no-op.
- **Surface routing:** the caregiver home renders INSIDE the existing `index` (home) tab when the
  active child's `caregiverRole !== 'parent'` — no tab-set swap / navigator remount (Expo Router
  static `Tabs.Screen` children can't be branched). Gated on `useCaregiverStore.hydrated`.
- **Withheld affordances are HIDDEN, not disabled.**
- **RLS is the security boundary; the client `hasCapability` helper is UX only.**

---

## Important context for the new session

- **Stale brainstorm premise:** the origin brainstorm said permissions were "stored but not
  enforced." Research proved this OUT OF DATE — RLS already enforced `_paused`/`log_activity`/
  `edit_child`/`chat`-on-INSERT via the 06-15→06-17 migrations. Phase 1 was scoped to the genuine
  gaps: the caregiver UI surface (greenfield) + two read holes (PHI columns, chat SELECT).
- The chat-SELECT hole was a P0 the doc-review caught and we folded into the plan as U7 before building.
- User directive (standing): **work on `main`, never create branches/worktrees.** Commit
  per-unit, stage only that unit's files (never `git add .` — the tree has unrelated in-flight
  cycle/i18n work).
