# Caregiver Roles & The Lifelong Child Record — Requirements

**Date:** 2026-06-26
**Scope:** Deep — product
**Status:** Brainstorm complete, ready for planning

---

## Problem & Core Thesis

A child's early life is documented by many hands — parents and caregivers — but the
documentation scatters. Today a nanny sends the owner photos and "he ate / he didn't"
over WhatsApp every day, and none of it accumulates anywhere durable. The moments that
matter most (first time standing up, a new allergy, a vaccine, a memory) are lost in chat
history.

**The thesis:** concentrate everything about a child's early life — meals, photos,
memories, milestones, vaccines, allergies — into **one permanent record**, fed continuously
by the people who care for the child, that the child can one day export and carry forward
for life.

The **caregiver (nanny first)** is the daily data source that keeps this record alive. The
**owner** controls what each caregiver can see and do, via roles plus per-person feature
flags.

**Evidence this is real:** drawn from the author's own daily pain — a nanny currently
relays a child's day over WhatsApp with nothing persisting. This is a live counterfactual,
not a hypothetical persona.

---

## Primary Actors

- **Owner (parent):** owns the child record. Invites caregivers, assigns roles, grants/revokes
  capabilities, approves caregiver suggestions, exports the record.
- **Nanny:** a professional caregiver. A distinct product surface — sees the kid's important
  info, logs the day, coordinates schedules, has their own community. May care for multiple
  children across multiple families.
- **Family caregiver (grandparent, relative):** lighter-touch access — typically view +
  memories, less than a nanny, no professional-coordination surface.
- **Child (future):** the eventual owner of their own exported record. Out of scope to build
  a child-facing surface now, but the record is designed to be theirs eventually.

---

## The Access Model: Roles + Feature Flags

The owner's mental model: **"pick a role for this caregiver, then add or remove things as I need."**

### How it works
1. Owner assigns a **preset role** (e.g. Nanny, Family, Co-parent) when inviting a caregiver.
2. The role sets **sensible default permissions** — a starting capability set.
3. Owner then **toggles individual capabilities on/off** for that specific person (feature
   flags), layered over the role defaults.
4. **Permissions actually gate the UI and the data** — a limited caregiver sees a purpose-built
   view, never the full parent dashboard. (Today permissions are stored but not enforced; this
   is the central gap to close.)

### Capability units (the toggles)
The owner grants/revokes at the level of capabilities. Initial set (refine in planning):
- View basic info (name, age, photo)
- View & log **feeding / meals**
- View & log **sleep**
- View & log **diaper**
- View & log **mood**
- Log & view **photos / memories**
- Log & view **milestones** (e.g. first steps)
- View **medical** (vaccines, allergies, conditions) — sensitive, often withheld
- View **growth charts / analytics**
- View **today's schedule / agenda**
- Add **reminders**
- **Suggest** reminders to the parent (suggestion → approval)
- **Chat** (AI / family chat)
- Participate in **caregiver community**

### Multiplicity
- A child can have **multiple caregivers** (e.g. two nannies).
- A caregiver can be linked to **multiple children across multiple families**.
- Capabilities are scoped **per caregiver, per child**.

---

## The Nanny Experience (distinct surface)

A nanny opening the app does not see a restricted parent dashboard — they see a
caregiver-oriented surface scoped to the children and capabilities the owner granted.

- **Daily logging** — the core loop. Meals, photos, memories, milestones, sleep, diaper,
  mood — replacing the WhatsApp relay. The parent sees it live.
- **Multiple children** — a nanny working for two families sees both, cleanly separated.
- **Shared kids' agenda** — owner-gated. Nannies coordinating the same child (or a nanny
  who needs the schedule) can see/contribute to the child's agenda so everyone knows the
  routine.
- **Reminders & suggestions** — a nanny can add reminders and **suggest** reminders to the
  parent; suggestions require parent approval before becoming active.
- **Caregiver community** — nannies have their own channels/forums, separate from the parent
  community, to talk and share among caregivers.

---

## The Payoff Layers (downstream value)

These are why the record matters — captured here so planning sequences toward them, not
built first.

- **End-of-tenure recap** — when a nanny's time with a child ends, generate a full
  history/recap of their period with the child, exportable as **PDF or video**.
- **Lifelong export** — the child's whole timeline (memories, milestones, vaccines,
  allergies, meals) exportable in the future; designed so a future app could connect to
  these memories.
- **Future intelligence** (later) — recipe suggestions from "what they ate this week,"
  year-in-review recaps, medical-history support, allergy awareness in meal planning.

---

## What Already Exists (verified in codebase)

- `child_caregivers` table — junction of child ↔ caregiver with `role` enum
  (`parent` / `nanny` / `family`), a `permissions` JSONB (`{view, log_activity, chat}`),
  `invite_token`, `status` (pending/accepted/revoked), RLS policies.
  (`supabase/migrations/20260330010000_child_caregivers.sql`)
- `profiles.user_role` column (defaults `parent`).
- Invite/accept/manage flow: `app/invite-caregiver.tsx`, `app/accept-invite.tsx`,
  `app/manage-caregivers.tsx`, `app/profile/care-circle.tsx`.
- Caregiver-flavored UI already exists in places: `components/agenda/NannyNotesPanel.tsx`,
  `components/home/NannyUpdatesFeed.tsx`.
- Edge functions: `invite-caregiver`, `accept-invite`.

**The critical gap:** the `permissions` JSONB is **stored but essentially not enforced** —
no real UI/data gating was found keying off `permissions.view / log_activity / chat`. The
`care-circle.tsx` screen uses the JSONB for display-name and pause state, not access control.
So caregivers currently get a near-full experience. **Making roles + flags actually gate the
experience is Phase 1's center of gravity** — the schema is partly there; the enforcement and
the caregiver-scoped surface are not.

---

## Implementation Phases

Ordered so each phase is independently shippable and the earliest phase kills the real pain.

### Phase 1 — The daily nanny→record loop (kills the WhatsApp pain)
The smallest thing that delivers the core value.
- Expand the role + capability model: richer capability set (above), per-caregiver-per-child
  flags, beyond the current 3-key JSONB.
- **Enforce permissions** — both RLS (data) and UI (a caregiver-scoped surface that shows
  only granted capabilities). This is the load-bearing work.
- Caregiver home/surface: a nanny sees their assigned child(ren) and can log the granted
  activity types (meals, photos, memories, milestones, sleep, diaper, mood).
- Owner sees the caregiver's logs live in the child's record.
- Owner UI to assign role + toggle capabilities per caregiver.

### Phase 2 — Shared agenda & coordination
- Owner-gated sharing of a child's agenda/schedule with caregivers.
- Multiple caregivers coordinating the same child see/contribute to the agenda.

### Phase 3 — Reminders & suggestions
- Caregiver adds reminders.
- Caregiver **suggests** reminders to the parent; parent approval flow.

### Phase 4 — Caregiver community
- Channels/forums for caregivers, separate from the parent community.

### Phase 5 — Recap & lifelong export
- End-of-tenure recap of a caregiver's time with a child → PDF / video export.
- Lifelong export of the child's full timeline.

### Phase 6 — Future intelligence (vision, not committed)
- Recipe suggestions from meal history, year-in-review recaps, medical-history support.

---

## Success Criteria

- A nanny can be invited with a role, and the owner can add/remove individual capabilities;
  the nanny's in-app experience reflects exactly those capabilities (nothing more).
- A nanny logs a child's day (meal, photo, memory, milestone) and the parent sees it in the
  child's record — replacing the WhatsApp relay for at least one real family.
- A withheld capability (e.g. medical) is genuinely inaccessible — not just hidden in UI but
  enforced at the data layer (RLS).
- The record persists and is structured to be exportable later.

---

## Scope Boundaries

**In (this initiative):** role + feature-flag access model with real enforcement; nanny
daily-logging surface; multi-child / multi-family caregiving; shared agenda; reminder
suggestions; caregiver community; recap & lifelong export.

**Deferred for later:** future intelligence (recipes, year-in-review, medical AI). Child-facing
app/surface. Cross-app memory connection.

**Outside this product's identity:** turning the parent app into a generic team-permissions
platform. The roles exist to serve the child record and the caregiver relationship, not to be
an arbitrary RBAC system.

---

## Dependencies & Assumptions

- **Assumption:** the existing `child_caregivers` schema is the right foundation to extend
  (not replace). Planning should confirm whether the 3-key `permissions` JSONB evolves into a
  richer structure or a new table.
- **Assumption:** RLS is the enforcement boundary for sensitive data (e.g. medical) — UI
  gating alone is insufficient. (Consistent with project's RLS-everywhere rule.)
- **Dependency:** video recap (Phase 5) needs a generation/export path not yet in the app;
  PDF is lower-lift and may ship first.
- **Open:** how a caregiver who serves multiple families switches context cleanly (account
  model — one caregiver account linked to many children vs. separate links).

---

## Outstanding Questions (for planning)

1. Does the richer capability model extend the `permissions` JSONB or move to a dedicated
   `caregiver_capabilities` table?
2. What are the exact default capability sets per preset role (Nanny vs Family vs Co-parent)?
3. Caregiver multi-family context-switching: one account ↔ many children, and how the UI
   surfaces the switch.
4. Suggestion-approval flow: where parents review/approve caregiver-suggested reminders.
5. Recap export: PDF first (lower-lift) with video as a later enhancement?
6. Does the caregiver community reuse the existing channels system or need a separate space?
