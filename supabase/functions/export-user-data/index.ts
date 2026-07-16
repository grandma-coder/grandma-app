// @ts-nocheck — Deno Edge Function
//
// export-user-data (Phase 0 / B7) — real, machine-readable data export (DSAR).
//
// Replaces the old client-side "text summary → Share sheet" stub with a
// complete JSON bundle of everything we hold about the user, gathered
// server-side with the service-role key so it isn't limited by RLS/joins.
//
// Returns the bundle inline as JSON. The client writes it to a file and shares
// it as a real `.json` document. (For very large accounts this could move to a
// signed-URL upload; inline is fine for the current data volumes.)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Helper: fetch all rows of a table filtered by a column = uid.
    const byUser = async (table: string, col: string) => {
      const { data } = await admin.from(table).select('*').eq(col, uid)
      return data ?? []
    }

    // Tables keyed directly to the user.
    const profile = (await admin.from('profiles').select('*').eq('id', uid).maybeSingle()).data
    const behaviors = await byUser('behaviors', 'user_id')
    const children = await byUser('children', 'user_id')
    const cycleLogs = await byUser('cycle_logs', 'user_id')
    const pregnancyLogs = await byUser('pregnancy_logs', 'user_id')
    const notifications = await byUser('notifications', 'user_id')
    const badges = await byUser('badges', 'user_id').catch(() => [])
    const emergencyContacts = await byUser('emergency_contacts', 'user_id').catch(() => [])
    const insurancePlans = await byUser('insurance_plans', 'user_id').catch(() => [])
    const appointments = await byUser('appointments', 'user_id').catch(() => [])
    const goals = await byUser('child_goals', 'user_id').catch(() => [])

    // Child-linked tables — gather across the user's children.
    const childIds = children.map((c: any) => c.id)
    const byChildren = async (table: string) => {
      if (childIds.length === 0) return []
      const { data } = await admin.from(table).select('*').in('child_id', childIds)
      return data ?? []
    }
    const childLogs = await byChildren('child_logs')
    const childCaregivers = await byChildren('child_caregivers')
    const childRoutines = await byChildren('child_routines').catch(() => [])
    const nannyNotes = await byChildren('nanny_notes').catch(() => [])
    const insights = await byChildren('insights').catch(() => [])
    const exams = await byChildren('exams').catch(() => [])

    // Community authored by the user.
    const channelPosts = await byUser('channel_posts', 'author_id').catch(() => [])
    const channelRatings = await byUser('channel_ratings', 'user_id').catch(() => [])
    const garageListings = await byUser('garage_listings', 'user_id').catch(() => [])

    const bundle = {
      export_meta: {
        generated_at: new Date().toISOString(),
        user_id: uid,
        email: user.email ?? null,
        format: 'grandma.app data export v1',
        note: 'This JSON contains all personal data grandma.app holds about you.',
      },
      account: { id: uid, email: user.email ?? null, created_at: user.created_at ?? null },
      profile,
      behaviors,
      children,
      child_logs: childLogs,
      child_caregivers: childCaregivers,
      child_routines: childRoutines,
      child_goals: goals,
      nanny_notes: nannyNotes,
      insights,
      exams,
      cycle_logs: cycleLogs,
      pregnancy_logs: pregnancyLogs,
      appointments,
      emergency_contacts: emergencyContacts,
      insurance_plans: insurancePlans,
      badges,
      notifications,
      community: {
        channel_posts: channelPosts,
        channel_ratings: channelRatings,
        garage_listings: garageListings,
      },
    }

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
