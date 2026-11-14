// @ts-nocheck — Deno Edge Function
//
// export-user-data (Phase 0 / B7) — real, machine-readable data export (DSAR).
//
// A complete JSON bundle of everything we hold about the user, gathered
// server-side with the service-role key so it isn't limited by RLS/joins.
//
// Scope: the caller's own rows (user_id / author_id / owner columns) and the
// rows of the children they OWN. Data of children they only care for belongs to
// that family and is not exported here; neither are other users' rows (requests
// to the caller's channels, other members, etc.).
//
// Every table is read in 1000-row pages (PostgREST caps a single select at
// max_rows, so long-time users silently got a truncated log history before).
// Read errors are listed in export_meta.errors instead of silently exporting an
// empty table. Photos / documents are listed under `files` with signed links
// valid for 24 hours.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAGE = 1000
// 24h: these links point at medical documents — a forwarded/leaked export
// shouldn't stay live for a week.
const LINK_TTL_SECONDS = 24 * 60 * 60

// Tables that exist only in some environments — absence is not an error.
const isMissingTable = (msg: string) => /does not exist|could not find the table|schema cache/i.test(msg)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) throw new Error('Not authenticated')

    const admin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authError } = await admin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) throw new Error('Invalid token')
    const uid = user.id

    const errors: Array<{ table: string; error: string }> = []

    // All rows of `table` where `col` = value (or IN values), paged past the 1000-row cap.
    const rows = async (table: string, col: string, value: string | string[]): Promise<any[]> => {
      const values = Array.isArray(value) ? value : [value]
      if (values.length === 0) return []
      const out: any[] = []
      let ordered = true
      for (let from = 0; ; from += PAGE) {
        let q = admin.from(table).select('*')
        q = Array.isArray(value) ? q.in(col, values) : q.eq(col, value)
        if (ordered) q = q.order('id', { ascending: true })
        const { data, error } = await q.range(from, from + PAGE - 1)
        if (error) {
          // Table without an `id` column: page by the natural order instead.
          if (ordered && /column .*id.* does not exist/i.test(error.message)) {
            ordered = false
            from -= PAGE
            continue
          }
          if (!isMissingTable(error.message)) errors.push({ table, error: error.message })
          return out
        }
        out.push(...(data ?? []))
        if (!data || data.length < PAGE) return out
      }
    }

    const profile = (await admin.from('profiles').select('*').eq('id', uid).maybeSingle()).data
    const children = await rows('children', 'parent_id', uid)
    const childIds = children.map((c: any) => c.id)

    const bundle: Record<string, unknown> = {
      export_meta: {
        generated_at: new Date().toISOString(),
        user_id: uid,
        email: user.email ?? null,
        format: 'grandma.app data export v2',
        note: 'This JSON contains all personal data grandma.app holds about you. Links under "files" expire after 24 hours.',
        incomplete: false,
        errors,
      },
      account: {
        id: uid,
        email: user.email ?? null,
        phone: user.phone ?? null,
        created_at: user.created_at ?? null,
        last_sign_in_at: user.last_sign_in_at ?? null,
        sign_in_providers: user.app_metadata?.providers ?? [],
      },
      profile,
      behaviors: await rows('behaviors', 'user_id', uid),
      cycle_logs: await rows('cycle_logs', 'user_id', uid),
      cycle_checklist: await rows('cycle_checklist', 'user_id', uid),
      pregnancy_logs: await rows('pregnancy_logs', 'user_id', uid),
      pregnancy_routines: await rows('pregnancy_routines', 'user_id', uid),
      menopause_logs: await rows('menopause_logs', 'user_id', uid),
      checklist_progress: await rows('checklist_progress', 'user_id', uid),
      appointments: await rows('appointments', 'user_id', uid),
      emergency_contacts: await rows('emergency_contacts', 'user_id', uid),
      insurance_plans: await rows('insurance_plans', 'user_id', uid),
      vault_documents: await rows('vault_documents', 'user_id', uid),
      scan_history: await rows('scan_history', 'user_id', uid),
      exams: await rows('exams', 'user_id', uid),
      daily_messages: await rows('daily_messages', 'user_id', uid),
      notifications: await rows('notifications', 'user_id', uid),
      push_tokens: await rows('push_tokens', 'user_id', uid),
      leaderboard_scores: await rows('leaderboard_scores', 'user_id', uid),
      support_tickets: await rows('support_tickets', 'user_id', uid),
      account_deletion_requests: await rows('account_deletion_requests', 'user_id', uid),

      children,
      child_logs: await rows('child_logs', 'child_id', childIds),
      child_routines: await rows('child_routines', 'child_id', childIds),
      child_goals: await rows('child_goals', 'child_id', childIds),
      nanny_notes: await rows('nanny_notes', 'child_id', childIds),
      insights: await rows('insights', 'child_id', childIds),
      child_exams: await rows('exams', 'child_id', childIds),
      kids_reminders: await rows('kids_reminders', 'child_id', childIds),
      kids_vaccine_schedule: await rows('kids_vaccine_schedule', 'child_id', childIds),
      emergency_cards: await rows('emergency_cards', 'child_id', childIds),
      chat_messages: await rows('chat_messages', 'child_id', childIds),

      care: {
        // People the user invited to their children (owner side).
        caregivers_invited: await rows('child_caregivers', 'child_id', childIds),
        // The user's own memberships in other families' care circles.
        caregiver_memberships: await rows('child_caregivers', 'user_id', uid),
        care_circle_owned: await rows('care_circle', 'owner_id', uid),
        care_circle_member_of: await rows('care_circle', 'member_user_id', uid),
      },

      community: {
        channels_created: await rows('channels', 'created_by', uid),
        channel_memberships: await rows('channel_members', 'user_id', uid),
        channel_requests: await rows('channel_requests', 'user_id', uid),
        channel_mutes: await rows('channel_mutes', 'user_id', uid),
        channel_saves: await rows('channel_saves', 'user_id', uid),
        channel_ratings: await rows('channel_ratings', 'user_id', uid),
        channel_posts: await rows('channel_posts', 'author_id', uid),
        post_comments: await rows('post_comments', 'author_id', uid),
        post_reactions: await rows('post_reactions', 'user_id', uid),
        post_saves: await rows('post_saves', 'user_id', uid),
        polls: await rows('polls', 'author_id', uid),
        poll_votes: await rows('poll_votes', 'user_id', uid),
        circle_handles: await rows('circle_handles', 'user_id', uid),
        circle_posts: await rows('circle_posts', 'author_id', uid),
        circle_post_reactions: await rows('circle_post_reactions', 'user_id', uid),
        garage_listings: await rows('garage_listings', 'user_id', uid),
        garage_posts: await rows('garage_posts', 'author_id', uid),
        garage_post_comments: await rows('garage_post_comments', 'author_id', uid),
        garage_post_likes: await rows('garage_post_likes', 'user_id', uid),
        garage_post_saves: await rows('garage_post_saves', 'user_id', uid),
        content_reports_filed: await rows('content_reports', 'reporter_id', uid),
        user_blocks: await rows('user_blocks', 'blocker_id', uid),
      },
    }

    // ── Files: every stored photo / document, as a signed (or public) link ──
    const listAll = async (bucket: string, prefix: string, depth = 0): Promise<string[]> => {
      const out: string[] = []
      if (depth > 3) return out
      for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: PAGE, offset })
        if (error) { errors.push({ table: `storage:${bucket}`, error: error.message }); break }
        if (!data || data.length === 0) break
        for (const f of data) {
          const path = `${prefix}/${f.name}`
          if (f.id === null || f.id === undefined) out.push(...(await listAll(bucket, path, depth + 1)))
          else out.push(path)
        }
        if (data.length < PAGE) break
      }
      return out
    }
    const fileTargets: Array<[string, string[], boolean]> = [
      ['profile-avatars', [uid], false],
      ['child-photos', [...childIds, uid], false],
      ['vault-documents', [uid, ...childIds], false],
      ['cycle-photos', [uid], false],
      ['pregnancy-nutrition', [uid], false],
      ['scan-images', [`exams/${uid}`], false],
      ['garage-photos', [uid], true],
      ['garage-media', [uid, `posts/${uid}`], true],
    ]
    const files: Record<string, Array<{ path: string; url: string | null }>> = {}
    for (const [bucket, prefixes, isPublic] of fileTargets) {
      const paths: string[] = []
      for (const p of prefixes) paths.push(...(await listAll(bucket, p)))
      if (paths.length === 0) continue
      if (isPublic) {
        files[bucket] = paths.map((path) => ({ path, url: admin.storage.from(bucket).getPublicUrl(path).data.publicUrl }))
        continue
      }
      const entries: Array<{ path: string; url: string | null }> = []
      for (let i = 0; i < paths.length; i += 100) {
        const chunk = paths.slice(i, i + 100)
        const { data, error } = await admin.storage.from(bucket).createSignedUrls(chunk, LINK_TTL_SECONDS)
        if (error) errors.push({ table: `storage:${bucket}`, error: error.message })
        const byPath = new Map((data ?? []).map((d: any) => [d.path, d.signedUrl ?? null]))
        for (const path of chunk) entries.push({ path, url: byPath.get(path) ?? null })
      }
      files[bucket] = entries
    }
    bundle.files = files
    ;(bundle.export_meta as any).incomplete = errors.length > 0

    return new Response(JSON.stringify(bundle), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
