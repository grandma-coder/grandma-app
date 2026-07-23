# Care Circle Invite — Real Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the care-circle invite a real connection — one server-side creation path that emails the caregiver a working universal link via Resend, with honest UI, lazy invite expiry, and a single management surface.

**Architecture:** The `invite-caregiver` edge function becomes the sole creation path (multi-child, sends Resend email, returns a universal accept URL + honest `emailSent`). `care-circle.tsx` calls it instead of writing the DB directly; the redundant `manage-caregivers.tsx` + `invite-caregiver.tsx` screens are removed. Expiry is computed lazily on read. Universal `https://grandma.app/invite?token=` links are wired app-side (web page is a separate deploy).

**Tech Stack:** Supabase Edge Functions (Deno), Resend API, React Native 0.81 + Expo SDK 54, expo-router linking, TypeScript strict.

## Global Constraints

- **Email provider: Resend.** Secret `RESEND_API_KEY` (Supabase secret). Sender: `Grandma <invites@grandma.app>` (verified domain). Email send is best-effort: a thrown/failed send MUST NOT fail row creation — return `emailSent:false`.
- **Accept URL:** `https://grandma.app/invite?token=<token>` (universal link). Base is a single constant in the edge function so it's swappable. `grandma-app://accept-invite?token=` stays as fallback scheme.
- **One shared `invite_token` per invitee** across all their childIds in a single invite call (email carries one link).
- **Edge function is the only creation path.** No client-side `child_caregivers` insert for invites after this.
- **RLS unchanged** — still the security boundary; do not weaken policies.
- **Data shapes unchanged:** `child_caregivers` columns, `permissions` JSONB (incl. `_display_name`/`_photo_url`/`_paused`), enum values `pending|accepted|revoked|expired`. No migration needed (schema already supports all of this).
- **Brand name** in user-facing copy is "Grandma" (not "grandma.app"); domains/paths exempt.
- TypeScript strict; design tokens only in any touched UI; run `npx tsc --noEmit` (0 errors) before each commit; Deno syntax for edge functions.
- Native config changes (associated domains / intent filters) require an EAS rebuild — note in the task, don't attempt to rebuild.

---

## File Structure

- **Modify** `supabase/functions/invite-caregiver/index.ts` — multi-child contract + Resend email + universal acceptUrl (Task 1).
- **Create** `supabase/functions/invite-caregiver/email.ts` — Resend send helper + HTML template (Task 1).
- **Modify** `app/profile/care-circle.tsx` — `handleSendInvite` + `resendInvite` call the edge fn; honest toast + copy-link; expiry badge in `loadMembers`/member card (Tasks 2, 3).
- **Modify** `app.json` — `ios.associatedDomains` + Android intent filters for `grandma.app/invite` (Task 4).
- **Modify** `app/_layout.tsx` — remove `manage-caregivers` Stack.Screen; ensure universal-link prefix reaches `accept-invite` (Task 4).
- **Delete** `app/manage-caregivers.tsx`, `app/invite-caregiver.tsx` (Task 5).
- **Modify** `app/notifications.tsx` (line ~194) + `app/dev-panel.tsx` (lines ~88-89) — repoint entry points to `/profile/care-circle` (Task 5).

---

### Task 1: Extend invite-caregiver edge function (multi-child + Resend email)

**Files:**
- Modify: `supabase/functions/invite-caregiver/index.ts`
- Create: `supabase/functions/invite-caregiver/email.ts`

**Interfaces:**
- Consumes: JWT auth, service-role client (existing).
- Produces (new response contract):
  ```ts
  // Request:  { childIds: string[], email: string, role: 'nanny'|'family',
  //            permissions: Record<string, boolean|string>, deliverEmail?: boolean }
  // Response: { inviteToken: string, acceptUrl: string, emailSent: boolean, rows: number }
  ```
- Produces (email.ts): `export async function sendInviteEmail(opts: { to: string; inviterName: string; childNames: string[]; acceptUrl: string }): Promise<boolean>` — returns true on 2xx from Resend, false on any failure (never throws).

- [ ] **Step 1: Write the Resend email helper**

Create `supabase/functions/invite-caregiver/email.ts`:
```ts
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM = 'Grandma <invites@grandma.app>'

export async function sendInviteEmail(opts: {
  to: string
  inviterName: string
  childNames: string[]
  acceptUrl: string
}): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[invite] RESEND_API_KEY not set — skipping email send')
    return false
  }
  const kids = opts.childNames.filter(Boolean)
  const who = kids.length === 1 ? kids[0] : kids.length > 1 ? `${kids.slice(0, -1).join(', ')} and ${kids[kids.length - 1]}` : 'their little one'
  const subject = `${opts.inviterName} invited you to help care for ${who} on Grandma`
  const html = `
    <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#141313">
      <h1 style="font-size:22px;margin:0 0 12px">You're invited to a Care Circle 💛</h1>
      <p style="font-size:15px;line-height:1.5;color:#4a4643">
        <strong>${opts.inviterName}</strong> invited you to help care for <strong>${who}</strong> on Grandma.
      </p>
      <a href="${opts.acceptUrl}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#141313;color:#fff;border-radius:999px;text-decoration:none;font-weight:600">Accept invite</a>
      <p style="font-size:12px;color:#8a8481">If the button doesn't work, open this link:<br/>${opts.acceptUrl}</p>
      <p style="font-size:12px;color:#8a8481">This invite expires in 7 days.</p>
    </div>`
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [opts.to], subject, html }),
    })
    if (!res.ok) {
      console.warn(`[invite] Resend failed ${res.status}:`, await res.text())
      return false
    }
    return true
  } catch (e) {
    console.warn('[invite] Resend threw:', e)
    return false
  }
}
```

- [ ] **Step 2: Rewrite the request handler body for multi-child + email**

In `supabase/functions/invite-caregiver/index.ts`, replace the single-child body (currently lines ~58-123) with the multi-child version. Keep the existing auth block (lines 45-56) and CORS. Add `import { sendInviteEmail } from './email.ts'` at top.

```ts
    const { childIds, email, role, permissions, deliverEmail = true } = await req.json()
    if (!Array.isArray(childIds) || childIds.length === 0 || !email) {
      throw new Error('childIds (non-empty) and email are required')
    }
    const lowerEmail = String(email).toLowerCase()
    const safeRole = ['nanny', 'family'].includes(role) ? role : 'family'
    const perms = permissions ?? { view: true, log_activity: true, chat: true }

    // Verify caller owns EVERY child — reject the whole request otherwise.
    const { data: ownedChildren } = await supabaseAuth
      .from('children')
      .select('id, name')
      .in('id', childIds)
      .eq('parent_id', user.id)
    const ownedIds = new Set((ownedChildren ?? []).map((c: any) => c.id))
    for (const cid of childIds) {
      if (!ownedIds.has(cid)) throw new Error('You are not the parent of one of these children')
    }

    // Create/reactivate one row per child; share a single token across them.
    let sharedToken = ''
    let rows = 0
    for (const childId of childIds) {
      const { data: existing } = await supabaseAuth
        .from('child_caregivers')
        .select('id, status, invite_token')
        .eq('child_id', childId)
        .eq('email', lowerEmail)
        .maybeSingle()

      if (existing?.status === 'accepted') {
        throw new Error('This person already has access to one of these children')
      }
      if (existing) {
        // pending OR revoked/expired → (re)set to pending; lifecycle trigger
        // rotates the token + 7-day expiry when a row (re)enters pending.
        const { data: updated } = await supabaseAuth
          .from('child_caregivers')
          .update({ status: 'pending', role: safeRole, permissions: perms })
          .eq('id', existing.id)
          .select('invite_token')
          .single()
        sharedToken = sharedToken || updated.invite_token
        rows++
      } else {
        const { data: inserted, error: insErr } = await supabaseAuth
          .from('child_caregivers')
          .insert({ child_id: childId, email: lowerEmail, role: safeRole, permissions: perms, invited_by: user.id })
          .select('invite_token')
          .single()
        if (insErr) throw insErr
        sharedToken = sharedToken || inserted.invite_token
        rows++
      }
    }

    const acceptUrl = `https://grandma.app/invite?token=${sharedToken}`

    // Best-effort email — a real address + deliverEmail. Placeholder emails
    // (link/SMS invites) skip send and rely on the returned acceptUrl.
    const isPlaceholder = lowerEmail === '' || lowerEmail.endsWith('@invite.local') || lowerEmail.endsWith('@pending')
    let emailSent = false
    if (deliverEmail && !isPlaceholder) {
      const { data: profile } = await supabaseAuth
        .from('profiles').select('name').eq('id', user.id).single()
      emailSent = await sendInviteEmail({
        to: lowerEmail,
        inviterName: profile?.name || 'A parent',
        childNames: (ownedChildren ?? []).filter((c: any) => childIds.includes(c.id)).map((c: any) => c.name),
        acceptUrl,
      })
    }

    return new Response(JSON.stringify({ inviteToken: sharedToken, acceptUrl, emailSent, rows }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
```

- [ ] **Step 3: Verify the function typechecks under Deno**

Run: `deno check supabase/functions/invite-caregiver/index.ts`
Expected: no errors. (If `deno` isn't installed, skip and rely on deploy-time check; note it in the report.)

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/invite-caregiver/
git commit -m "feat(care-circle): multi-child invite edge fn + Resend email + universal acceptUrl"
```

> Deploy is a separate manual step (not in this task): `supabase functions deploy invite-caregiver` + `supabase secrets set RESEND_API_KEY=…`. Note in report.

---

### Task 2: care-circle.tsx create + resend route through the edge function

**Files:**
- Modify: `app/profile/care-circle.tsx` (`handleSendInvite` ~line 1454; `resendInvite` ~line 730)

**Interfaces:**
- Consumes: `invite-caregiver` edge fn (Task 1) — `{ inviteToken, acceptUrl, emailSent, rows }`.

- [ ] **Step 1: Replace the direct DB writes in `handleSendInvite` with one edge-fn call**

Keep the validation, permission-object build (`permObj`), photo upload, role resolution (`safeRole`), and the `email` placeholder logic (lines ~1455-1493). REPLACE the per-child insert/upsert loop + token re-read (lines ~1500-1537) with:
```ts
      const { data, error } = await supabase.functions.invoke('invite-caregiver', {
        body: {
          childIds: selectedChildren,
          email,
          role: safeRole,
          permissions: permObj,               // includes _display_name / _photo_url
          deliverEmail: sendMethod === 'email',
        },
      })
      if (error) throw error
      const acceptUrl: string = data?.acceptUrl ?? ''
      const emailSent: boolean = !!data?.emailSent
      const msg = `Hey ${name.trim() || 'there'}! You're invited to join my Care Circle on Grandma.\n\nTap to accept: ${acceptUrl}`
```
Then the delivery block: if `emailSent`, show the honest toast (Step 2) and skip opening mail. If `sendMethod==='sms'` open the sms url with `acceptUrl`; if `sendMethod==='share'` `Share.share`. If email was chosen but `emailSent` is false (send failed), fall back to opening the `mailto:` compose sheet (so the owner can still send) AND surface the copy-link.

- [ ] **Step 2: Make the toast honest**

Replace the unconditional "Invite Sent!" toast with:
```ts
      toast.show({
        title: emailSent ? 'Invite emailed' : 'Invite link ready',
        message: emailSent
          ? `We emailed ${inviteEmail.trim()} — they'll appear as "Pending" until they accept.`
          : `Share the link to invite ${name.trim() || 'them'}.`,
        autoDismiss: 2800,
      })
```

- [ ] **Step 3: Route `resendInvite` through the edge function**

`resendInvite` (line ~730) currently builds a `grandma-app://` link from the member's stored token. Change it to call the edge fn (which rotates the token, re-emails, and returns the fresh `acceptUrl`), reusing the member's existing `childIds`, `email`, `role`, `permissions`. Then present the same Email/SMS/Share alert using the returned `acceptUrl` (and rely on the edge fn's email send for the Email path). Keep the alert UX; just source the link + email from the edge fn.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add app/profile/care-circle.tsx
git commit -m "feat(care-circle): route invite create + resend through edge fn; honest toast + copy link"
```

---

### Task 3: Lazy invite expiry in care-circle.tsx

**Files:**
- Modify: `app/profile/care-circle.tsx` (`loadMembers` ~line 503; `CareCircleMember` type; member card status badge ~line 976)

**Interfaces:**
- Consumes: `child_caregivers.invite_token_expires_at` (already selected via `*`).

- [ ] **Step 1: Compute expired state when grouping members**

In `loadMembers`, when building each `CareCircleMember`, add `expired: row.status === 'pending' && !!row.invite_token_expires_at && new Date(row.invite_token_expires_at) < new Date()`. Add `expired: boolean` to the `CareCircleMember` type. (Group semantics: a member is expired if all their pending rows are past expiry — simplest correct rule: mark expired when status is pending and the max expiry is in the past.)

- [ ] **Step 2: Opportunistically flip expired rows in the DB**

After grouping, for any member computed `expired`, best-effort `await supabase.from('child_caregivers').update({ status: 'expired' }).eq('email', member.email).eq('invited_by', session.user.id).eq('status', 'pending')` — wrapped in try/catch, failures ignored (RLS allows owner update).

- [ ] **Step 3: Render an EXPIRED badge + Resend action**

In the member card status badge (~line 976), when `member.expired`, show an "EXPIRED" badge (distinct color from PENDING — use `stickers.coral`/token, not raw hex) and ensure the Resend action is offered (it already exists; just make sure it's shown for expired members).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add app/profile/care-circle.tsx
git commit -m "feat(care-circle): show lapsed pending invites as EXPIRED (lazy) + offer resend"
```

---

### Task 4: Universal-link app config

**Files:**
- Modify: `app.json`
- Modify: `app/_layout.tsx` (linking prefixes if an explicit list is used)

**Interfaces:** none (config).

- [ ] **Step 1: Add associated domains + Android intent filter to app.json**

In `app.json` `expo`:
```json
"ios": { ..., "associatedDomains": ["applinks:grandma.app"] },
"android": {
  ...,
  "intentFilters": [{
    "action": "VIEW",
    "autoVerify": true,
    "data": [{ "scheme": "https", "host": "grandma.app", "pathPrefix": "/invite" }],
    "category": ["BROWSABLE", "DEFAULT"]
  }]
}
```

- [ ] **Step 2: Ensure the `/invite` universal path resolves to the accept-invite route**

expo-router maps paths to files. `https://grandma.app/invite?token=` has path `/invite` but the route file is `app/accept-invite.tsx` (path `/accept-invite`). Add a redirect so `/invite` → `/accept-invite` preserving `token`: create `app/invite.tsx` that reads `useLocalSearchParams().token` and `<Redirect href={{ pathname: '/accept-invite', params: { token } }} />` (import `Redirect` from expo-router). This keeps one accept screen while matching the marketing-friendly `/invite` URL. Verify `accept-invite.tsx` still reads `token` (it does, via `useLocalSearchParams`).

- [ ] **Step 3: Typecheck + validate app.json**

Run: `npx tsc --noEmit` (0 errors) and `python3 -c "import json; json.load(open('app.json'))"` (valid JSON).

- [ ] **Step 4: Commit**

```bash
git add app.json app/invite.tsx
git commit -m "feat(care-circle): universal https://grandma.app/invite link → accept-invite route"
```

> Native config takes effect only after an EAS rebuild (note in report). The `grandma.app/invite` web landing page is a separate deploy (out of scope).

---

### Task 5: Remove redundant screens + repoint entry points

**Files:**
- Delete: `app/manage-caregivers.tsx`, `app/invite-caregiver.tsx`
- Modify: `app/_layout.tsx` (remove `manage-caregivers` Stack.Screen; `invite-caregiver` is not registered there — verify)
- Modify: `app/notifications.tsx` (~line 194), `app/dev-panel.tsx` (~lines 88-89)

**Interfaces:** none.

- [ ] **Step 1: Repoint entry points**

- `app/notifications.tsx:194` `router.push('/manage-caregivers')` → `router.push('/profile/care-circle')`.
- `app/dev-panel.tsx:88-89` — change both legacy links to `/profile/care-circle` (or remove the two rows).
- Grep for any other references: `grep -rn "manage-caregivers\|invite-caregiver'" app/ components/` — repoint/remove all (except the files being deleted).

- [ ] **Step 2: Delete the two screens + remove Stack.Screen**

Delete `app/manage-caregivers.tsx` and `app/invite-caregiver.tsx`. In `app/_layout.tsx` remove `<Stack.Screen name="manage-caregivers" />` (line ~694). (`invite-caregiver` has no Stack.Screen entry — confirm via grep.)

- [ ] **Step 3: Typecheck (catches any dangling import/route)**

Run: `npx tsc --noEmit`
Expected: 0 errors. Also `grep -rn "manage-caregivers\|/invite-caregiver" app/ components/` → no live references remain.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(care-circle): remove redundant manage-caregivers + invite-caregiver screens; Care Circle is canonical"
```

---

### Task 6: Full verification pass

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit` → 0 errors.

- [ ] **Step 2: Test suite (no regressions)**

Run: `npx jest` → all pass.

- [ ] **Step 3: Manual matrix (record results; some need device + deployed fn + Resend key)**

- Care Circle → Add → email invite → verify edge fn called with `childIds` array; with `RESEND_API_KEY` set + fn deployed, a real email arrives; toast says "Invite emailed".
- Link/SMS invite (placeholder email) → `emailSent:false`, share sheet opens with `https://grandma.app/invite?token=`, copy-link works.
- Multi-child select → one email, one shared token, N rows created.
- Resend on a pending member → new token + email.
- A row past `invite_token_expires_at` → shows EXPIRED, offers Resend, flips to `expired` in DB.
- Tap `https://grandma.app/invite?token=` on a device with the app (post-rebuild) → accept screen → accept → scoped child appears PHI-masked.
- notifications + dev-panel no longer navigate to the removed screens.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "test(care-circle): verification pass for real invite flow"
```

---

## Rollout dependencies (out of scope for code, required for prod)

1. `supabase secrets set RESEND_API_KEY=…` + verify `grandma.app` sender domain in Resend.
2. `supabase functions deploy invite-caregiver`.
3. EAS rebuild for associated-domains / intent filters to take effect.
4. Deploy the `grandma.app/invite` web landing page (separate project) for users without the app installed.
