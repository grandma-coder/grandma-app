// @ts-nocheck — Deno Edge Function
//
// delete-account (Phase 0 / B1) — real, irreversible account deletion.
//
// The DB purge is handled by auth.admin.deleteUser(): every user-owned table
// references auth.users(id) ON DELETE CASCADE (directly, or transitively via
// children.parent_id → children(id) ON DELETE CASCADE), so removing the auth user
// cascades the entire graph — profiles, behaviors, children + all child_logs /
// nanny_notes / child_caregivers / child_goals / child_routines / insights,
// cycle_logs, pregnancy_logs, channel_* , notifications, garage_*, circles, etc.
// Attribution-only FKs (created_by / resolved_by / logged_by) keep the shared row
// and drop the author — a channel other members still use, a log the account
// wrote on someone else's child.
//
// Order matters (a failure must never leave a half-deleted account):
//   1. collect the storage paths to remove (child IDs vanish with the cascade)
//   2. clear attribution FKs that are still NO ACTION in some environments
//      (channel_requests.resolved_by, child_logs.logged_by) — they made
//      deleteUser fail with "Database error deleting user" for any host who had
//      approved a join request or caregiver who had logged for another family
//   3. deleteUser — one transaction; on failure nothing user-visible changed
//   4. only then remove the storage objects. They used to be removed FIRST, so a
//      failed delete left the account alive with every photo and document gone.
//      Public garage-media URLs stay reachable until the object is removed.
//
// An account_deletion_requests row records the request + outcome for
// support/compliance (GDPR audit trail). It is updated by row id: the row's
// user_id FK cascaded it away with the account until migration
// 20261111120000_account_exit_fks.sql.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// Optional: RevenueCat secret (v1) key. When set, the RevenueCat customer record is deleted too.
const revenueCatSecret = Deno.env.get('REVENUECAT_SECRET_API_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAGE = 1000

// Every object under `prefix` (recursing into sub-folders, paging past 1000).
// Best-effort: a listing error returns what was found so far.
async function listAll(admin: any, bucket: string, prefix: string, depth = 0): Promise<string[]> {
  const out: string[] = []
  if (depth > 3) return out
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: PAGE, offset })
    if (error || !data || data.length === 0) break
    for (const f of data) {
      const path = `${prefix}/${f.name}`
      // Folders come back with a null id.
      if (f.id === null || f.id === undefined) out.push(...(await listAll(admin, bucket, path, depth + 1)))
      else out.push(path)
    }
    if (data.length < PAGE) break
  }
  return out
}

async function removeAll(admin: any, bucket: string, paths: string[]): Promise<number> {
  let failed = 0
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100)
    try {
      const { error } = await admin.storage.from(bucket).remove(chunk)
      if (error) failed += chunk.length
    } catch (_e) {
      failed += chunk.length
    }
  }
  return failed
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey)
  let userId: string | null = null
  let auditId: string | null = null

  const markAudit = async (patch: Record<string, unknown>) => {
    if (!auditId) return
    try {
      await admin.from('account_deletion_requests').update(patch).eq('id', auditId)
    } catch (_e) { /* swallowed */ }
  }

  try {
    // Identify the caller from their JWT — a user can only delete themselves.
    const authHeader = req.headers.get('authorization')
    if (!authHeader) throw new Error('Not authenticated')

    const { data: { user }, error: authError } = await admin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) throw new Error('Invalid token')
    userId = user.id

    // Audit row (pending).
    const { data: audit } = await admin
      .from('account_deletion_requests')
      .insert({ user_id: userId, status: 'pending' })
      .select('id')
      .maybeSingle()
    auditId = audit?.id ?? null

    // ── 1. Storage paths to remove (before the cascade wipes child IDs) ───
    const { data: kids } = await admin.from('children').select('id').eq('parent_id', userId)
    const childIds = (kids ?? []).map((k: any) => k.id)
    const targets: Array<[string, string[]]> = [
      ['profile-avatars', [userId]],
      // Kids memories with no child selected are stored under the user id.
      ['child-photos', [...childIds, userId]],
      ['vault-documents', [userId, ...childIds]],
      ['garage-photos', [userId]],
      // Garage posts live under {uid}/, channel post photos under posts/{uid}/ (public URLs).
      ['garage-media', [userId, `posts/${userId}`]],
      ['cycle-photos', [userId]],
      ['pregnancy-nutrition', [userId]],
      ['scan-images', [`exams/${userId}`]],
    ]
    const toRemove: Array<[string, string[]]> = []
    for (const [bucket, prefixes] of targets) {
      const paths: string[] = []
      for (const prefix of prefixes) {
        try { paths.push(...(await listAll(admin, bucket, prefix))) } catch (_e) { /* best-effort */ }
      }
      if (paths.length) toRemove.push([bucket, paths])
    }

    // ── 2. Attribution FKs that would block the delete ────────────────────
    await admin.from('channel_requests').update({ resolved_by: null }).eq('resolved_by', userId)
    await admin.from('child_logs').update({ logged_by: null }).eq('logged_by', userId)

    // ── 3. The purge: cascade-delete the auth user (one transaction) ──────
    const { error: delError } = await admin.auth.admin.deleteUser(userId)
    if (delError) throw delError

    // ── 4. Storage, now that the account is gone ─────────────────────────
    let orphaned = 0
    for (const [bucket, paths] of toRemove) orphaned += await removeAll(admin, bucket, paths)

    // RevenueCat customer record (purchase history keyed to the deleted id). This does NOT cancel
    // an App Store / Play subscription — the app tells the user to cancel it themselves.
    if (revenueCatSecret) {
      try {
        await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${revenueCatSecret}` },
        })
      } catch (_e) { /* best-effort */ }
    }

    await markAudit({
      status: 'completed',
      completed_at: new Date().toISOString(),
      error: orphaned > 0 ? `storage: ${orphaned} object(s) not removed` : null,
    })

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    // Record the failure against the audit row when we know who it was.
    await markAudit({ status: 'failed', error: (err as Error).message })
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
