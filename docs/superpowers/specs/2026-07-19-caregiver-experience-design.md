# Caregiver Experience — Design Spec

**Date:** 2026-07-19
**Status:** Approved design → ready for implementation plan
**Author:** Igor + Claude (brainstorm session)

---

## 0. Context & the stale-note correction

The project's `CLAUDE.md` describes `care` (Caregiver) as **"scaffold-only — tokens exist, but no screens/tabs/routes/store wiring."** **This is out of date and must be corrected as part of this work.** The reality:

- **`care` as a 4th `JourneyMode`** is genuinely scaffold-only (only Diffuse color tokens exist). We are **not** making `care` a JourneyMode.
- **Caregiver as a per-child role/persona** is already **fully built end-to-end**: invite → accept → scoped home, a permission model enforced in UI *and* Postgres RLS, PHI masking on boot, a dedicated `CaregiverHome`, multi-child switcher, and a recent-activity feed.

What has **never** happened: anyone has *walked through* the caregiver flow visually, because there's no easy way to become a caregiver in dev. And the existing `CaregiverHome` is **thin** (child header → "Log the day" → activity feed) — it does not reuse the rich behavior-home cards, has no wallet/essentials card, no pruned navigation, and is Kids-only.

This spec redesigns the caregiver experience around one principle:

> **A caregiver sees the *same home* the parent sees — same cards, same cream-paper style — filtered to exactly what the parent chose to share with that specific person.** Not a stripped-down bespoke surface.

---

## 1. Goals

1. **Same-style, curated home.** Reuse the real behavior-home cards (Kids / Pregnancy / Cycle). The caregiver's home is those cards, minus the ones the parent withheld. No new visual language.
2. **Per-section sharing at invite time.** The parent, when inviting someone, toggles individual home cards on/off for that person, plus what they can *do* (log / see emergency / chat).
3. **Unified "child essentials" wallet card.** One card component — pediatrician, allergies, emergency contact, insurance — that lives in **everyone's** wallet stack (parent + caregiver), one data source. Caregiver sees it pinned; insurance/emergency detail masked unless granted.
4. **Cross-behavior.** Works for Kids (log-capable), Pregnancy (viewer-default), and Cycle (viewer-default, with intimate signals OFF by default and flagged sensitive).
5. **Pruned caregiver navigation.** Caregiver tab bar = **Home / Grandma / Card / You** (Grandma only if `chat` granted). No Library/Garage/Vault clutter.
6. **Dev impersonation.** A Dev Panel toggle to become a nanny/family caregiver against a seeded child, so the whole flow is walkable without a second device.

### Non-goals

- Making `care` a real `JourneyMode`.
- Wiring the legacy `care_circle` table (we stay on `child_caregivers`). We may *mine* `care_circle` for the scheduled/temporary-access idea in a later phase, but not now.
- Scheduled/temporary caregiver access, `doctor` role, granular time-boxing — future.
- Any change to the RLS security boundary's *shape* (we extend the same JSONB keys; we do not weaken gates).

---

## 2. The share model (per-section toggles)

### 2.1 Data — extend the existing `permissions` JSONB

The caregiver permission model already lives in `child_caregivers.permissions` (JSONB), read by both `lib/caregiverPermissions.ts` (UX) and RLS (security). Today it holds capability booleans (`view`, `log_activity`, `chat`, `edit_child`, `emergency`) plus meta keys (`_paused`, `_display_name`, `_photo_url`).

We add **one meta key** for per-section visibility:

```jsonc
{
  "view": true,
  "log_activity": true,        // "can log the day"
  "chat": true,                // Grandma tab visible
  "edit_child": false,
  "emergency": false,          // sees insurance + emergency contacts in wallet
  "_paused": false,
  "_shared_cards": {           // NEW — per-behavior allowlist of home card ids
    "kids":      ["hero-tiles", "today-summary", "diaper", "reminders", "essentials"],
    "pregnancy": ["week-hero", "today_summary", "essentials"],
    "cycle":     ["journey_ring", "essentials"]
  }
}
```

**Semantics:**
- `_shared_cards[behavior]` is an **allowlist** of card ids that render on the caregiver's home for that behavior. Card ids reuse the **existing vocabulary** already in code (see §2.2).
- **Absent / null** `_shared_cards` → fall back to a **role default** (see §2.4), so old invites don't break.
- A capability flag (`log_activity`, `chat`, `emergency`) is orthogonal to card visibility: a card can be visible but read-only if `log_activity` is off; the `essentials` card shows its masked (lite) form unless `emergency` is on.
- `_shared_cards` is a **meta key** (underscore-prefixed) → it is *not* a capability and is *not* gated by RLS. **Visibility of a card is UX-only; the security boundary remains the per-capability RLS predicates on the underlying data (child_logs, chat, PHI RPC).** Hiding a card never grants data the RLS wouldn't already allow. This keeps the security model unchanged.

### 2.2 Card-id vocabulary (already exists in code — reuse verbatim)

**Kids** top-level: `hero-tiles`, `today-summary` · wallet: `goals`, `health`, `exams`, `diaper`, `growth_leap`, `reminders`, `ask_grandma`, `rewards`
**Pregnancy** top-level: `week-hero`, `daily_message`, `today_summary` · wallet: `appointment`, `week_tip`, `kicks`, `reminders`, `exams`, `birth_guide`, `ask_grandma`, `rewards`
**Cycle** top-level: `journey_ring`, `daily_message`, `today_summary` · wallet: `reminders`, `pillars`, `exams`, `ask_grandma`, `rewards`
**All behaviors** (new): `essentials` — the unified child-essentials wallet card (§4).

### 2.3 Sensitivity tiers (drive defaults + the invite UI)

Each card carries a **sensitivity tier** used only to (a) set safe defaults and (b) render a "sensitive" hint in the invite UI. This is presentation metadata, not a security gate.

- **`safe`** — educational/navigation: `ask_grandma`, `rewards`, `week_tip`, `birth_guide`, `pillars`, `daily_message`, `essentials` (lite form).
- **`child-health`** — child metrics/records: `hero-tiles`, `today-summary`, `health`, `exams`, `diaper`, `growth_leap`, `appointment`, `week-hero`, `today_summary` (pregnancy), `kicks`, `reminders`.
- **`intimate`** (Cycle only, OFF by default, flagged in UI): `journey_ring`, `today_summary` (cycle — intercourse/BBT/LH/cervical mucus/period). The `essentials` card's `emergency`/insurance detail is also treated as sensitive (gated by the `emergency` capability, not `_shared_cards`).

### 2.4 Role defaults (used when `_shared_cards` absent)

- **Nanny (Kids):** `hero-tiles`, `today-summary`, `diaper`, `reminders`, `essentials` + `log_activity: true`.
- **Family / grandparent (Kids):** `hero-tiles`, `essentials` + `log_activity: false` (viewer).
- **Pregnancy watcher:** `week-hero`, `today_summary` (view-only), `essentials` + `log_activity: false`.
- **Cycle watcher:** `journey_ring` (phase + period timing only), `essentials` + `log_activity: false`; **no `intimate` cards by default.**

---

## 3. Invite / share screen

The invite flow gains a **"What can [name] see?"** curation step. It is a per-recipient editor over the same model, reachable both at invite time and later (edit a member) from `app/profile/care-circle.tsx` (already the rich member editor) and `app/invite-caregiver.tsx`.

**Layout (cream-paper, existing components — `PaperCard`, toggle rows, `PillButton`):**

1. **Header:** recipient name + role (Nanny / Family) + "Caring for [child]".
2. **"Home cards they see"** — a list of toggle rows, one per card in the active behavior, grouped/labeled by human name (§2.2 labels). `intimate` cards render with a small "sensitive" flag and are OFF by default; toggling one on shows a one-line confirm ("This shares intimate fertility data").
3. **"What they can do"** — three toggles: **Can log** (`log_activity`), **See emergency & insurance** (`emergency`), **Chat with Grandma** (`chat`).
4. Presets as **quick-fill chips** (not the only path, since we chose per-section): "Viewer", "Helper", "Full" pre-check a sensible set, then the parent fine-tunes. (Optional nicety; per-section toggles are the source of truth.)

Writing this screen persists `permissions` (capabilities + `_shared_cards`) to `child_caregivers` — same write path the member editor already uses.

---

## 4. The unified "child essentials" wallet card (`essentials`)

A **new wallet card**, added to each behavior's wallet builder (`buildKidsWalletCards`, `buildWalletCards`, `buildCycleWalletCards`) as a card descriptor with a stable id `essentials`.

**Contents (two render forms):**
- **Lite form** (default / when `emergency` not granted): child name + photo, **allergies**, **pediatrician** (name + phone). Non-insurance, at-a-glance.
- **Full form** (when `emergency` granted — or always for the parent): lite + **emergency contact(s)** + **insurance** (provider, member id, phone).

**Data sources (all exist):** `children.pediatrician` (jsonb), child allergies, `emergency_contacts` + `insurance_plans` tables, and the emergency card fields. **Flag for the plan:** `emergency_cards` table is referenced by `lib/vault.ts` but has **no migration** and isn't in `schema.sql` — the plan must verify it exists in the dev DB or route the card to `emergency_contacts`/`insurance_plans` (per-user) + `children.pediatrician` (per-child) instead. Resolve before building.

**Placement:**
- **Parent:** appears in their normal wallet stack, reorderable via the existing `WalletPicker` / `enabledKeys`.
- **Caregiver:** rendered **pinned** (not reorderable) near the top of the caregiver home — honoring "the essentials a nanny needs, fast."
- One component (`EssentialsWalletCard`), one data hook; the pinned-vs-stack difference is a prop.

---

## 5. Caregiver home (the filtered surface)

Replace the thin `CaregiverHome` with a **filtered behavior home**:

1. Determine the child's behavior (Kids/Pregnancy/Cycle) from the child record / active behavior.
2. Render the behavior's real home component, but **filter its card list** through `_shared_cards` (resolved with role defaults per §2.4).
3. Every rendered card respects capabilities: log entry points are inert (display-only) unless `log_activity`; the `essentials` card shows lite vs full per `emergency`.
4. Pin the `essentials` card at the top for caregivers.
5. Keep the existing **identity header** (child name + "Caring as Nanny/Family") and **multi-child switcher**.

**Implementation approach:** rather than fork each home, thread an optional `visibleCards: Set<string> | null` (null = owner, all) + a `readOnly`/`canLog` context into the existing home components, so `KidsHome` / `PregnancyHome` / `CycleHome` filter their own card render list. This keeps **one** home per behavior (no per-persona siblings) — consistent with the repo rule "don't create per-mode siblings unless the difference is large."

---

## 6. Caregiver navigation (tabs)

Caregiver tab bar = **Home / Grandma / Card / You**:
- **Home** — the filtered behavior home (§5), with "Log the day" inside it when `log_activity`.
- **Grandma** — the AI chat (`/grandma-talk`), **only if `chat` granted**.
- **Card** — opens the `essentials` wallet as a full sheet (the "ID card you pull out").
- **You** — settings/profile (scoped).

The current tab system (`lib/modeConfig.ts`) is a **fixed 6-slot structure** (`index/agenda/library/vault/exchange/settings`). The caregiver set doesn't map onto those slots cleanly, so we add a **`getCaregiverTabConfig(permissions)`** that returns the caregiver tab set, and `app/(tabs)/_layout.tsx` selects it when the active child is a non-owner caregiver relationship (gated on `useCaregiverStore.hydrated`). Grandma tab visibility keys off `chat`.

---

## 7. Dev impersonation

Add a **Dev Panel** section "SIMULATE CAREGIVER" (`app/dev-panel.tsx`), following the existing `ActionRow` + `lib/devSeed.ts` helper pattern:

- **Become Nanny (Kids)** — seeds/links a `child_caregivers` row for the current account against a seeded child with a nanny default permission set (incl. a sample `_shared_cards`), sets `useChildStore.activeChild.caregiverRole = 'nanny'`, and (optionally) `useCaregiverStore.setAccountRole('nanny')`.
- **Become Family (viewer)** — same with the family/viewer default set.
- **Become Pregnancy watcher** / **Become Cycle watcher** — same for the other behaviors.
- **Edit shared cards** — jumps to the invite curation screen (§3) pre-loaded for the simulated relationship, so you can toggle cards and watch the home change live.
- **Reset to parent** — clears the simulation (restores `caregiverRole: 'parent'`).

All dev-only (`__DEV__`-guarded, uses `useDevStore` snapshot/restore like the rest of the panel). This is the lever you use to *walk and polish* the whole flow.

---

## 8. Build order (for the plan to expand)

1. **Data + defaults:** `_shared_cards` semantics in `lib/caregiverPermissions.ts` (a `visibleCards(child, behavior)` resolver with role defaults); sensitivity-tier + card-label metadata table.
2. **`essentials` wallet card:** resolve the emergency-data source question, build `EssentialsWalletCard` (lite/full), add `essentials` to all three wallet builders.
3. **Filtered homes:** thread `visibleCards` + `canLog` into `KidsHome` / `PregnancyHome` / `CycleHome`; pin `essentials` for caregivers; replace thin `CaregiverHome` routing.
4. **Caregiver tabs:** `getCaregiverTabConfig`, wire into `(tabs)/_layout.tsx`.
5. **Invite curation screen:** per-section toggle editor in `care-circle` / `invite-caregiver`; persist `_shared_cards`.
6. **Dev impersonation:** dev-seed helpers + Dev Panel section.
7. **Polish pass:** walk each behavior as each role via dev toggle; fix visual/UX; iterate.
8. **Docs:** correct the stale `care` "scaffold-only" note in `CLAUDE.md` to describe the real caregiver persona system + this share model.

---

## 9. Privacy & security notes (must hold)

- **RLS is unchanged as the boundary.** `_shared_cards` is UX-only; hiding a card never exposes data. Every data read a caregiver makes is still gated by the existing capability RLS predicates (`log_activity`, `chat`, `emergency`/`edit_child` PHI RPC).
- **Cycle intimate signals** (`intercourse`, `BBT`, `LH`, `cervical mucus`, `period`) are **OFF by default**, flagged when toggled on, and never in a role default set.
- **Essentials `emergency`/insurance** detail is gated by the `emergency` capability (RLS-backed via the PHI RPC), not by card visibility.
- **Free-tier seats** still gate invites (existing `TIER_SEAT_LIMIT` / paywall path) — unchanged.
```
