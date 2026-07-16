// @ts-nocheck — Deno Edge Function
//
// delete-account (Phase 0 / B1) — real, irreversible account deletion.
//
// The DB purge is handled by auth.admin.deleteUser(): every user-owned table
// references auth.users(id) ON DELETE CASCADE (directly, or transitively via
// children.user_id → children(id) ON DELETE CASCADE), so removing the auth user
// cascades the entire graph — profiles, behaviors, children + all child_logs /
// nanny_notes / child_caregivers / child_goals / child_routines / insights,
// cycle_logs, pregnancy_logs, channel_* , notifications, garage_*, etc.
// Attribution-only FKs (created_by / resolved_by / logged_by) are ON DELETE SET
// NULL by design — a channel someone else is in, or a note's "logged_by", is
// preserved with the author nulled, which is correct.
//
// Storage objects do NOT cascade, so we remove them explicitly BEFORE deleting
// the user (we need the child IDs, which vanish with the cascade).
//
// An account_deletion_requests row records the request + outcome for
// support/compliance (GDPR audit trail).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Remove every storage object under a set of prefixes for the given bucket.
// Best-effort per bucket — a storage hiccup must not block account deletion
// (the DB cascade is the source of truth; orphaned objects can be swept later).
async function purgeBucketPrefixes(admin: any, bucket: string, prefixes: string[]): Promise<void> {
  for (const prefix of prefixes) {
    try {
      const { data: files } = await admin.storage.from(bucket).list(prefix, { limit: 1000 })
      if (files && files.length > 0) {
        const paths = files.map((f: any) => `${prefix}/${f.name}`)
        await admin.storage.from(bucket).remove(paths)
      }
      // Also try removing an object stored directly at the prefix path.
      await admin.storage.from(bucket).remove([prefix])
    } catch (_e) {
      // swallowed — best-effort
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey)
  let userId: string | null = null

  try {
    // Identify the caller from their JWT — a user can only delete themselves.
    const authHeader = req.headers.get('authorization')
    if (!authHeader) throw new Error('Not authenticated')

    const { data: { user }, error: authError } = await admin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) throw new Error('Invalid token')
    userId = user.id

    // Audit row (pending). RLS lets the owner insert; service role also can.
    await admin.from('account_deletion_requests').insert({ user_id: userId, status: 'pending' })

    // ── Storage cleanup (before the cascade wipes child IDs) ──────────────
    // Collect the user's child IDs for child-photo cleanup.
    const { data: kids } = await admin.from('children').select('id').eq('user_id', userId)
    const childPrefixes = (kids ?? []).map((k: any) => k.id)

    await purgeBucketPrefixes(admin, 'profile-avatars', [userId])
    await purgeBucketPrefixes(admin, 'child-photos', childPrefixes)
    await purgeBucketPrefixes(admin, 'vault-documents', [userId, ...childPrefixes])
    await purgeBucketPrefixes(admin, 'garage-photos', [userId])
    await purgeBucketPrefixes(admin, 'garage-media', [userId])

    // ── The purge: cascade-delete the auth user ──────────────────────────
    const { error: delError } = await admin.auth.admin.deleteUser(userId)
    if (delError) throw delError

    // Mark the audit row completed. (Best-effort — the account is already gone;
    // if this update fails the request row stays 'pending' which is harmless.)
    await admin
      .from('account_deletion_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'pending')

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    // Record the failure against the audit row when we know who it was.
    if (userId) {
      try {
        await admin
          .from('account_deletion_requests')
          .update({ status: 'failed', error: (err as Error).message })
          .eq('user_id', userId)
          .eq('status', 'pending')
      } catch (_e) { /* swallowed */ }
    }
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
