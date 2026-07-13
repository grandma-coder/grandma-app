# Caregiver Mode — Completion Plan

**Date:** 2026-07-12
**Status:** Draft for review
**Author:** Claude (Opus 4.8)

## TL;DR

The Caregiver surface is **not scaffold-only** — the docs are stale. It is roughly
**80% built**: a wired home, a dedicated store, permission logic, an invite/accept
flow, and Diffuse-aware UI already exist. This plan reframes the work from "build
the caregiver view" to **"finish, harden, and productize what's there"** — and
resolves the one genuinely open *product* question (is caregiver a "mode" or a
"context"?).

---

## What already exists (verified in code)

| Piece | File | State |
|---|---|---|
| Scoped caregiver home | `components/caregiver/CaregiverHome.tsx` (217 lines) | ✅ built, **Diffuse-aware**, family/nanny personas, empty state, header card, CTA |
| Child picker (caregiver-scoped) | `components/caregiver/CaregiverChildPicker.tsx` | ✅ built |
| Quick-log sheet | `components/caregiver/CaregiverLogSheet.tsx` | ✅ built |
| Updates feed | `components/home/NannyUpdatesFeed.tsx` | ✅ built |
| Nanny notes panel | `components/agenda/NannyNotesPanel.tsx` | ✅ built |
| Account-role store | `store/useCaregiverStore.ts` | ✅ persisted + hydration-gated; holds `accountRole` (`parent`/`nanny`/`family`) |
| Per-child role | `useChildStore.activeChild.caregiverRole` | ✅ |
| Permission helpers | `lib/caregiverPermissions.ts` | ✅ `isCaregiver()`, `can()`-style checks, parent short-circuit |
| Home routing | `app/(tabs)/index.tsx:40-54` | ✅ renders `<CaregiverHome/>` when `activeChild.caregiverRole !== 'parent'`, gated on `caregiverHydrated` |
| Invite / accept flow | `app/invite-caregiver.tsx`, `app/manage-caregivers.tsx`, `app/accept-invite`, `supabase/functions/invite-caregiver` + `accept-invite` | ✅ token-based, JWT-verified |
| DB | `care_circle` table + `permissions[]`, RLS | ✅ |
| Diffuse `care` field tokens | `constants/theme.ts:660` (`diffuseFields.care`) + `getModeColor('care')` | ✅ teal palette |
| Notifications | `care_circle_invite`, `care_circle_accepted` | ✅ |

**Conclusion:** the raw materials are here and mostly wired. The gaps are
completion, consistency, and one architecture decision — not greenfield build.

---

## The one real product decision: "mode" vs "context"

Today caregiver is a **context**, not a mode: `useModeStore` only knows
`pre-pregnancy | pregnancy | kids`. The caregiver home is triggered by the
*active child's* `caregiverRole`, routed inside `app/(tabs)/index.tsx` — it is
**not** a fourth entry in `modeConfig`. That is arguably the right call:

- A caregiver's identity is **per-child** (I'm a nanny for Rio, but a parent of
  Bahia), so a global `useModeStore` mode can't express it.
- The current context-switch (pick a child you caregive → see caregiver home) is
  the correct mental model.

**Recommendation: keep caregiver as a per-child CONTEXT, not a global mode.** Do
*not* add `'care'` to `useModeStore`/`modeConfig`. Instead, invest in making the
context switch legible and the caregiver surfaces complete. (The `diffuseFields.care`
tokens still apply — they're keyed by field, not by `useModeStore`.)

> If product wants a dedicated "I am primarily a caregiver" account type with its
> own tab set, that's a larger v2 — out of scope here. This plan finishes the
> context model that already exists.

---

## Gaps to close (the actual work)

### Phase A — Audit & harden (small, do first)
1. **Permission enforcement pass.** Verify every caregiver-reachable action
   (`CaregiverLogSheet`, agenda logging, notes) checks `caregiverPermissions.can()`
   before writing, and that RLS backs it up. An RLS leak test with two synthetic
   users (owner + limited caregiver) — reuse the `rls-tester` agent.
2. **Empty / partial-permission states.** What does a caregiver with `permissions:
   ['view']` (read-only) see? Confirm log CTAs hide, not just fail on tap.
3. **Cold-start persona flash.** `index.tsx` already gates on `caregiverHydrated`;
   confirm `useChildStore` hydration is *also* gated so `activeChild.caregiverRole`
   can't read stale-default on first frame (the "week 1 → week 40 flash" class of bug).

### Phase B — Diffuse consistency
4. `CaregiverHome` is Diffuse-aware, but sweep the **satellites**:
   `CaregiverChildPicker`, `CaregiverLogSheet`, `NannyUpdatesFeed`,
   `NannyNotesPanel`, `invite-caregiver`, `manage-caregivers`, `accept-invite` for
   `useIsDiffuse()`/`useDiffuseTheme()` coverage now that Diffuse is default.
5. Icons: caregiver surfaces should use the **Character** family
   (`community`, `hug`, `note`, `bell`, `checkup`) per the icon rollout — map any
   remaining stickers/lucide.

### Phase C — Productize (needs product input)
6. **Onboarding an invited caregiver.** Today a caregiver accepts a token invite,
   but is there a first-run explainer ("You're caring for Rio — here's what you can
   see and do")? If not, design a 1–2 screen caregiver onboarding.
7. **The parent's control surface.** `manage-caregivers` exists — verify the parent
   can set granular `permissions[]` per caregiver (log feeding but not view medical,
   etc.) from a clear UI, and revoke.
8. **AI (Guru Grandma) context for caregivers.** Does `nana-chat` know the user is a
   nanny vs. parent? A nanny asking about a child should get caregiver-appropriate
   framing (no medical-decision advice, defer to parent). Check the edge-function
   prompt context.

---

## Suggested sequencing

1. **Phase A** first (correctness + security — highest risk, since this is
   cross-account data access under RLS).
2. **Phase B** next (cheap, mechanical, and Diffuse-default makes it visible now).
3. **Phase C** after a product conversation (scope depends on how much caregiver is
   a first-class persona vs. a helper role).

## Open questions for the user
- Is caregiver a **helper context** (current model, my recommendation) or should it
  become a **first-class account type** with its own tabs? (Changes B/C scope a lot.)
- Do caregivers need their **own onboarding**, or is the accept-invite flow enough?
- Should the AI treat caregivers differently from parents?

---

*Grounded in code as of 2026-07-12. If any file above has since changed under the
concurrent work stream, re-verify before executing.*
