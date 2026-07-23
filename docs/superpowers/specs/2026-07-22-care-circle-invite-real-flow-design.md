# Care Circle Invite — Real Connection & Flow — Design

**Date:** 2026-07-22
**Status:** Approved (pending spec review)
**Author:** Igor + Claude

## Problem

The caregiver / care-circle invite flow looks complete in the UI but does not actually connect people. A full trace (see gaps below) found:

1. **No email/SMS is ever sent by the backend.** Both edge functions send nothing; "delivery" is the owner's own device opening a `mailto:`/`sms:`/share sheet. The **"Invite Sent!" toast fires regardless** — it lies. If the owner dismisses the compose sheet, a `pending` row exists in the DB but the invitee never hears about it.
2. **Broken deep link.** `app/invite-caregiver.tsx` builds `grandma-app://invite/${token}` — there is **no `invite/` route**, so those links open nothing. The Care Circle path correctly uses `grandma-app://accept-invite?token=`.
3. **Two divergent creation paths.** `app/profile/care-circle.tsx` writes `child_caregivers` **directly via the client SDK** (bypassing the `invite-caregiver` edge function's ownership/dedup checks); `app/invite-caregiver.tsx` goes **through** the edge function. They can drift.
4. **`expired` invite status is defined but never set** — lapsed `pending` invites display as PENDING forever (expiry is only checked lazily inside `accept-invite`).
5. **Two overlapping management screens** — `care-circle.tsx` (full CRUD, grouped by email) and `manage-caregivers.tsx` (per-child, revoke-only).

## Goal

Make the invite flow a real, reliable connection: one server-side creation path that actually emails the caregiver a working link, honest UI feedback, expired invites that read as expired, and a single management surface.

## Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| Email provider | **Resend** (Supabase edge function → Resend API; secret `RESEND_API_KEY`, verified sender domain) |
| Creation path | **Unify on the edge function.** Extend `invite-caregiver` to accept **multiple childIds** + full permissions + display name; both screens call it; it does creation + dedup + seat checks + email in one place |
| Email content | **Grandma-branded, names the inviter + child** — "[Parent] invited you to help care for [child] on Grandma." Needs verified sender domain |
| Invite link | **Universal https link** `https://grandma.app/invite?token=…` — opens app if installed, else install page. `grandma-app://accept-invite?token=` stays as fallback scheme |
| Web landing page | **Config app-side now, page later** — wire associated-domains + linking + email link this pass; the `grandma.app/invite` web page is a separate deploy (noted as a dependency; app-installed users work immediately) |
| Delivery honesty | Toast reflects real result: "Invite emailed to X" (emailSent) vs "Invite link ready — share it" (link/SMS or email failure) + always a **copy-link** fallback |
| Expiry | **Lazy on read** — Care Circle marks past-`invite_token_expires_at` pending rows as EXPIRED and opportunistically flips them to `status:'expired'`; an Expired invite offers Resend. No cron |
| Management screens | **`profile/care-circle.tsx` is canonical.** Remove `manage-caregivers.tsx` + `app/invite-caregiver.tsx`; redirect their entry points into Care Circle |

## Non-goals (this pass)

- Building the `grandma.app/invite` web landing page (separate repo/deploy; only the app-side link handling + email link are in scope).
- Changing RLS policies (they remain the real security boundary; the client no longer relies on the direct-write path, but the policy stays as defense-in-depth).
- SMS transactional sending (SMS stays share-sheet based; only email becomes transactional).
- Reworking the accept screen UX or PHI-masking (already correct).

## Architecture

### Edge function: `invite-caregiver` (extended — the single creation path)

New request contract (backward-thoughtful — old single-child callers are being removed, so no compat shim needed):
```ts
// POST invite-caregiver  (JWT required)
{
  childIds: string[]        // one or more children to grant
  email: string             // real address, or placeholder (''/@invite.local/@pending) for link/SMS
  role: 'nanny' | 'family'
  permissions: Record<string, boolean | string>  // full JSONB incl. _display_name/_photo_url meta
  deliverEmail?: boolean    // default true; false for link/SMS-only invites
}
→ 200 {
  inviteToken: string       // the shared token (same across all childIds for this invitee)
  acceptUrl: string         // https://grandma.app/invite?token=<token>
  emailSent: boolean        // true only if a real email was actually dispatched via Resend
  rows: number              // how many child_caregivers rows created/reactivated
}
```
Behavior:
- Verify JWT; service-role client.
- Verify caller owns **every** childId (`children.parent_id = user.id`) — reject the whole request if any isn't owned.
- For each childId: dedup/reactivate exactly as the current single-child logic (accepted→error, pending→reuse token, revoked/expired→reactivate to pending), sharing ONE `invite_token` across the invitee's rows (reuse the token from the first pending/created row so the email carries a single link).
- Compose `acceptUrl = https://grandma.app/invite?token=<token>` (base URL from an env/config constant so it's swappable).
- If `deliverEmail` and email is a real address: call **Resend** (`RESEND_API_KEY`) with the Grandma-branded template (inviter name from the caller's profile, child name(s), accept button → acceptUrl). Wrap in try/catch — **email failure must NOT fail row creation**; set `emailSent:false` and let the client fall back to share/copy.
- Return the payload. Never return PHI.

### Client — `care-circle.tsx` AddMemberSheet
- Replace the direct `child_caregivers` insert/upsert in `handleSendInvite` with a single `supabase.functions.invoke('invite-caregiver', { body: { childIds, email, role, permissions, displayName, photoUrl, deliverEmail } })`.
- Toast from the result: `emailSent` → "Invite emailed to {email}"; else open share sheet with `acceptUrl` + show "Invite link ready".
- Add a **Copy link** affordance (uses `acceptUrl`).
- `resendInvite` also routes through the edge function (re-emits + rotates token via the pending-lifecycle trigger).

### Client — expiry (lazy on read)
- In `loadMembers`, compute `isExpired = status === 'pending' && invite_token_expires_at < now`. Render an **EXPIRED** badge (distinct from PENDING). Best-effort `.update({ status: 'expired' })` on encountered expired rows (owner-owned, RLS-allowed; ignore failures). Expired member card shows **Resend** (→ edge function).

### Removals / consolidation
- Delete `app/invite-caregiver.tsx` and `app/manage-caregivers.tsx`.
- Remove their `<Stack.Screen>` entries in `app/_layout.tsx`.
- Repoint entry points: `app/notifications.tsx:194` (`/manage-caregivers`) → `/profile/care-circle`; `app/dev-panel.tsx:88-89` legacy links → `/profile/care-circle` (or drop).
- Care Circle's "ADD TO CARE CIRCLE" remains the single create entry.

### Universal link handling (app-side)
- `app.json`: add `ios.associatedDomains: ["applinks:grandma.app"]` and Android `intentFilters` for `https://grandma.app/invite` (autoVerify). Keep `scheme: grandma-app`.
- Map `https://grandma.app/invite?token=…` **and** `grandma-app://accept-invite?token=…` to the `accept-invite` route (expo-router linking / `getStateFromPath` or the `Linking` prefix list). `accept-invite.tsx` already reads `token` from params — ensure both shapes deliver `token`.
- **Dependency (out of scope):** the actual `grandma.app/invite` web page (install/open fallback) is a separate deploy. Until it exists, tapping the https link on a device *without* the app shows whatever grandma.app serves; app-installed users are handled by associated domains.

## Testing / verification

- **Edge function:** validate input (missing childIds/email/role → 400); ownership rejection when a childId isn't the caller's; dedup/reactivate per child; Resend wrapped so a thrown email error still returns `emailSent:false` + created rows. (Deno test or a documented manual invoke.)
- **Client:** typecheck; Care Circle create → one email, toast reflects `emailSent`; copy-link works; resend rotates token; expired badge shows for a row with past expiry.
- **Manual (owed, needs device + Resend key):** real send to a test inbox; tap universal link on a device with the app → accept screen → accept → scoped child appears PHI-masked; tap on a device without the app → (pending web page).
- **Regression:** removing the two screens doesn't break notifications/dev-panel navigation; `accept-invite` still works via both link shapes; RLS unchanged.

## Rollout notes / dependencies

- **Secret:** `supabase secrets set RESEND_API_KEY=…` + verify the sender domain in Resend before email works in prod.
- **Native rebuild:** associated-domains + intent filters are native config → require an EAS dev-client/prod rebuild to take effect (JS-only changes reload normally).
- **Web page:** `grandma.app/invite` landing is a follow-up deploy (separate project).
