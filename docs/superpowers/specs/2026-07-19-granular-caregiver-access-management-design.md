# Granular Caregiver Access Management — Design

**Date:** 2026-07-19
**Status:** Approved (brainstorming) — ready for implementation plan
**Related:** `docs/superpowers/specs/2026-07-19-caregiver-experience-design.md`

## Goal

Give the account owner, from **Care Circle → Edit Member**, granular control over
exactly what each caregiver **sees** (per home card) and can **do**
(view / log / chat / emergency / **edit child**) — replacing today's coarse
3-tier permission picker. The whole granular surface sits behind a single master
feature flag so it can ship dark and be turned on without a rebuild.

## Motivation

The owner-facing Care Circle screen (`app/profile/care-circle.tsx`) already lets
an owner add, edit, pause/activate, remove, and re-invite members. But
`EditMemberSheet` only offers a coarse 3-preset permission picker
(`PERMISSION_LEVELS`: View / Contributor / Full). There is no way to say
"share the sleep card but not the mood card" or "let them log but not chat".

The granular editor for exactly this — `components/caregiver/ShareCardsEditor.tsx`
— is **already built and unit-tested but never mounted** anywhere in the app
(only referenced by its own test). CLAUDE.md flags this directly: mounting
`ShareCardsEditor` into `care-circle.tsx` was "pending a concurrent-branch merge."

This spec closes that gap: wire the existing granular editor into the owner's
edit flow, add `edit_child` as a controllable capability, and gate the whole
thing behind one feature flag.

## What already exists (reused, not rebuilt)

- **`components/caregiver/ShareCardsEditor.tsx`** — fully-controlled per-card +
  per-capability toggle UI. "What can they see?" (each home card) and "What can
  they do?" (log / emergency / chat). Derives ON set from `value._shared_cards`
  falling back to `roleDefaultCards`. Intimate cards render a "sensitive" tag.
  Has `components/caregiver/__tests__/ShareCardsEditor.test.tsx`.
- **`lib/caregiverCards.ts`** — `CAREGIVER_CARDS` vocabulary per behavior,
  `roleDefaultCards()`, sensitivity tiers.
- **`lib/caregiverPermissions.ts`** — `visibleCards()`, `hasCapability()`,
  `CAPABILITY`, the `_shared_cards` allowlist model.
- **`types/index.ts`** — `CaregiverPermissions` (already includes `edit_child`,
  `_shared_cards`, `_paused`, `_display_name`, `_photo_url`) and
  `CaregiverCapability`.
- **`child_caregivers.permissions` JSONB** — free-form, **no CHECK constraint**
  (verified: the CHECK-constrained `text[]` column is on the *legacy* `care_circle`
  table, which the live UI does not use). Already stores `_shared_cards`,
  `_paused`, `_display_name`, `_photo_url` today.
- **RLS** — honors `view` / `log_activity` / `chat` / `emergency` / `edit_child`.
  `edit_child` already appears in the `children` write path and the PHI-gating
  function (`20260616130000_p2_rls_db_hardening.sql`,
  `20260626120000_caregiver_phi_gating.sql`). **No migration is needed.**

## The gap being closed

`EditMemberSheet` (in `app/profile/care-circle.tsx`) writes only a coarse
`permLevel`. Its `updateMember` handler flattens permissions from the chosen
preset via `PERMISSION_LEVELS`, discarding any granular per-card selection. It
never touches `_shared_cards`.

## Non-goals (YAGNI)

- **No remote/server-controlled feature flags.** No such infra exists; a
  persisted dev-panel flag is enough to ship dark. (If remote config is added
  later, the flag store is the single swap point.)
- **No per-child *different* sharing within one member.** One `_shared_cards`
  map per member, applied to all their rows (consistent with how `_paused` is
  written to all `rowIds` today).
- **No caregiver-side child-edit screens.** Granting `edit_child` unmasks PHI
  and satisfies write RLS today, which is the security-meaningful part. Building
  the caregiver's own child-profile-edit UI that *consumes* `edit_child` is a
  separate follow-up.
- **No new database migration.** Column is free-form JSONB; RLS already backs
  every capability.

---

## Section 1 — Feature flag (master gate)

New tiny persisted Zustand store: **`store/useFeatureFlags.ts`**

```ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface FeatureFlagsState {
  granularCaregiverAccess: boolean
  hydrated: boolean
  setGranularCaregiverAccess: (v: boolean) => void
}

export const useFeatureFlags = create<FeatureFlagsState>()(
  persist(
    (set) => ({
      granularCaregiverAccess: false, // default OFF — ships dark
      hydrated: false,
      setGranularCaregiverAccess: (v) => set({ granularCaregiverAccess: v }),
    }),
    {
      name: 'feature-flags',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => { state && (state.hydrated = true) },
    },
  ),
)
```

- Follows the project's canonical persisted-store pattern: `hydrated` flag +
  `onRehydrateStorage` callback (per `.claude/rules/code-style.md`). Persisted
  stores must respect the hydration gate before deriving UI.
- **Dev Panel** (`app/dev-panel.tsx`) gets a toggle row for
  `granularCaregiverAccess`, placed near the existing "Simulate Caregiver" /
  "Design Variant" sections. Same visual language as other dev-panel rows.
- **`care-circle.tsx`** reads `useFeatureFlags((s) => s.granularCaregiverAccess)`
  (respecting `hydrated`). Flag **OFF** → `EditMemberSheet` shows today's 3-tier
  picker, unchanged. Flag **ON** → `EditMemberSheet` shows the granular editor.

One flag gates the entire granular surface. Turned on/off from the Dev Panel with
no rebuild.

## Section 2 — Wiring the granular editor into Edit Member

`EditMemberSheet` gains, **only when the flag is ON**:

1. After the existing name / photo / role inputs, an **"Access & sharing"** block
   (replacing the `PERMISSION_LEVELS` preset list for the ON path).
2. A member can span multiple children across behaviors (kids / pregnancy /
   cycle). The editor renders **one `ShareCardsEditor` per behavior the member has
   children in**, derived from `member.childIds` → each child's behavior. A
   member with only kids children sees only the kids editor.
   - Behavior for a child is resolved from the child records already loaded in
     `useChildStore` (the same source `care-circle.tsx` uses for
     `getChildNames`). If a behavior can't be resolved for any child, fall back
     to the active `mode` for that grouping.
3. **`edit_child`** is added as a **4th capability row** in the "What can they
   do?" section of `ShareCardsEditor` (currently log / emergency / chat), with a
   caption like "can edit child profile & health info".
4. Local state holds the working `CaregiverPermissions` object, seeded from
   `member.permissions`. Each `ShareCardsEditor`'s `onChange` merges into it.
5. On **Save**, the full granular permissions object is passed to `updateMember`.

### Data flow

```
Edit sheet (flag ON)
  → working CaregiverPermissions object (capabilities + _shared_cards)
  → onSaved({ ..., permissions })
  → updateMember(member, { permissions })
  → supabase.from('child_caregivers').update({ role, permissions }) per rowId
  → loadMembers()
```

The caregiver's own app already reads these via `visibleCards()` /
`hasCapability()`, so grants take effect on the caregiver's next load. RLS is the
true boundary throughout — the editor is UX only.

## Section 3 — `updateMember` refactor + edge cases

- **Signature:** extend `updateMember`'s `updates` param with an optional
  `permissions?: CaregiverPermissions` (full object).
  - When **present** (flag-ON path): write it verbatim, after merging the
    preserved meta keys (`_paused`, `_display_name`, `_photo_url`) exactly as the
    current handler already computes them for name/photo. `_shared_cards` and all
    capability booleans come from the passed object.
  - When **absent** (flag-OFF path): current `permLevel`-preset behavior is
    completely untouched. **No regression when the flag is off.**
- **Multi-child members:** the same merged permissions object is written to every
  `rowId` for the member (consistent with how `_paused` is written to all rows
  today).
- **`edit_child`:** granting it is honored by existing RLS on `children` +
  PHI-gating; no new migration. Consuming it in a caregiver-side child-edit UI is
  out of scope (see non-goals).
- **Intimate cycle cards:** stay OFF by default and show the "sensitive" tag
  (existing `ShareCardsEditor` behavior — unchanged).
- **Hydration gate:** `care-circle.tsx` must not branch on the flag until
  `useFeatureFlags` is hydrated, to avoid a flash of the wrong editor.

## Testing

- **`ShareCardsEditor.test.tsx`** — extend for the new `edit_child` capability
  row: toggling it flips `value.edit_child` via `onChange`.
- **`updateMember` granular path** (new test): given a full permissions object
  with `_shared_cards` + `edit_child`, asserts the object written to
  `child_caregivers` includes the granular selections AND the preserved meta keys
  (`_paused` / `_display_name` / `_photo_url`).
- **Flag-off regression test:** with the flag OFF, `updateMember` still writes
  the flattened preset (existing behavior), and the sheet still renders the 3-tier
  picker.

## Files touched

| File | Change |
|------|--------|
| `store/useFeatureFlags.ts` | **New** — persisted flag store with hydration gate |
| `app/dev-panel.tsx` | Add `granularCaregiverAccess` toggle row |
| `app/profile/care-circle.tsx` | Flag-gated branch in `EditMemberSheet`; mount `ShareCardsEditor` per behavior; extend `updateMember` to accept + write full permissions object |
| `components/caregiver/ShareCardsEditor.tsx` | Add `edit_child` capability row |
| `components/caregiver/__tests__/ShareCardsEditor.test.tsx` | Cover `edit_child` row |
| (test) | New `updateMember` granular-path + flag-off regression tests |

**No migration.** `child_caregivers.permissions` is free-form JSONB and RLS
already backs every capability including `edit_child`.

## Design-system notes

- `ShareCardsEditor` already uses `useTheme()` tokens (PaperCard, sticker
  palette, `radius`, `font`). The `edit_child` row must follow the same pattern
  (no raw hex, pills at `radius.full`).
- The dev-panel toggle follows existing dev-panel row styling.
- Reuse `LogSheet` for the Edit sheet container (already used) — no new modal
  primitive.
