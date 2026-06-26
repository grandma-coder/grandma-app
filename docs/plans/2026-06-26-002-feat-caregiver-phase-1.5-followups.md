---
title: "feat: Caregiver Phase 1.5 follow-ups"
type: feat
date: 2026-06-26
origin: docs/plans/2026-06-26-001-feat-caregiver-scoped-surface-plan.md
status: backlog
depth: lightweight
---

# feat: Caregiver Phase 1.5 Follow-ups

Small, non-blocking items surfaced during the Phase 1 build (doc-review +
implementation) that were deliberately deferred so Phase 1 could ship. None
gate Phase 1; each is independently shippable.

---

## Carry-over from Phase 1 (must happen before the security layer is live)

- **Push U3 + U7 migrations** — `supabase db push` applies
  `20260626120000_caregiver_phi_gating.sql` and `20260626130000_caregiver_read_gates.sql`.
- **`rls-tester` two-synthetic-user matrix** (Phase 1 definition-of-done):
  - caregiver without `emergency` reads NULL PHI from `get_caregiver_children()`;
  - `chat:false` caregiver reads zero `chat_messages` rows; owner unaffected;
  - revoke / downgrade takes effect on next read.

Until both run, the UI gating is live but the data-layer R3 guarantee is not.

---

## F1 — Warm-runtime persona flip: reset to home tab on caregiver-child switch

**Problem:** a user who is parent of child A and caregiver of child B can switch
the active child while focused on an owner-only tab (vault/library/agenda). The
home tab re-scopes correctly to `CaregiverHome`, but the user can remain on a tab
that has no caregiver meaning. KTD-6 covers the cold-start hydration flash; this
is the warm runtime transition.

**Approach:** when `setActiveChild` moves to a child whose `caregiverRole !== 'parent'`,
navigate to the home tab (`router.replace('/(tabs)')`) so the caregiver lands on
their scoped surface rather than a stale owner screen. Centralize in the
`CaregiverChildPicker` switch handler (and any other active-child switch entry point).

**Files:** `components/caregiver/CaregiverChildPicker.tsx`, possibly a small shared
`switchActiveChild` helper.

**Test scenarios:** switching parent→caregiver child while on vault lands on home;
switching caregiver→caregiver child stays on home and re-scopes; owner→owner switch
unchanged.

---

## F2 — Accessibility pass on the caregiver surface

**Problem:** the new components have partial a11y. `CaregiverChildPicker` already
sets `accessibilityRole`/`accessibilityState`/`accessibilityLabel`; the log-type
tiles in `CaregiverLogSheet` set role+label, but `CaregiverHome`'s CTA and header
and the sheet's emoji-only tiles could use fuller labels for screen readers.

**Approach:** add `accessibilityLabel` to the "Log the day" CTA and the child
header; confirm log-type tiles announce label not emoji; verify focus order in the
sheet. Follow whatever convention the existing owner home uses (no project a11y
standard is documented today — match existing components).

**Files:** `components/caregiver/CaregiverHome.tsx`, `components/caregiver/CaregiverLogSheet.tsx`.

---

## F3 — Tighten the `PaperAlertButton` type (incidental)

While wiring the denial alert in U5, the `PaperAlertButton` interface
(`components/ui/PaperAlert.tsx`) was found to omit the `onPress` field its own
`handle()` already calls (`b.onPress?.()`). Add `onPress?: () => void` to the
interface so per-button actions are type-safe. Pre-existing gap, low priority.

**Files:** `components/ui/PaperAlert.tsx`.

---

## F4 — i18n the caregiver surface strings

The Phase 1 caregiver components use literal English strings (CaregiverHome empty
state / role labels, CaregiverLogSheet titles + log-type labels, accept-invite
permission labels). Fold these into `lib/i18n` keys in a future i18n wave so the
caregiver surface localizes with the rest of the app. Deferred to match the
existing 7-wave i18n plan rather than adding ad-hoc keys now.

**Files:** `lib/i18n/en.ts` + `keys.ts` + the three caregiver components + `accept-invite.tsx`.
