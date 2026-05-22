// @ts-nocheck — Deno Edge Function
//
// Skeleton appspace integration (Unit 1.12). Provisions a Skeleton "space"
// for a child by calling the Skeleton developer API with the appspace API key
// (server-side only — the key NEVER touches the RN bundle). Idempotent: if the
// child already has a skeleton_space_id, returns it without re-provisioning.
//
// Required secrets (set with `supabase secrets set`):
//   SKELETON_API_KEY   — the appspace root/write key (sk_appspace_…)
//   SKELETON_API_URL   — optional, defaults to the hosted API
//   SKELETON_CHILD_BLUEPRINT — optional, defaults to 'child-space'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const skeletonApiUrl = (Deno.env.get('SKELETON_API_URL') ?? 'https://api.skeleton.mother.tech').replace(/\/$/, '')
const skeletonApiKey = Deno.env.get('SKELETON_API_KEY')
const blueprintId = Deno.env.get('SKELETON_CHILD_BLUEPRINT') ?? 'child-space'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) throw new Error('Not authenticated')

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (authError || !user) throw new Error('Invalid token')

    const { childId } = await req.json()
    if (!childId) throw new Error('childId is required')

    // Caller must be the child's parent.
    const { data: child } = await supabaseAuth
      .from('children')
      .select('id, name, parent_id, skeleton_space_id, skeleton_owner_principal_id')
      .eq('id', childId)
      .eq('parent_id', user.id)
      .single()
    if (!child) throw new Error('Child not found or not owned by caller')

    // Idempotent — already provisioned.
    if (child.skeleton_space_id) {
      return json({
        space_id: child.skeleton_space_id,
        owner_principal_id: child.skeleton_owner_principal_id,
        already_provisioned: true,
      })
    }

    if (!skeletonApiKey) {
      // Skeleton not configured for this environment — degrade gracefully so
      // child creation/onboarding is never blocked. The app keeps working on
      // Supabase; provisioning can be backfilled later.
      return json({ skeleton: 'not_configured' }, 200)
    }

    const resp = await fetch(`${skeletonApiUrl}/api/developer/spaces:provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${skeletonApiKey}`,
      },
      body: JSON.stringify({
        blueprint_id: blueprintId,
        owner_email: user.email,
        label: child.name ?? 'Child',
      }),
    })
    if (!resp.ok) {
      const detail = await resp.text()
      throw new Error(`Skeleton provision failed (${resp.status}): ${detail}`)
    }
    const { space_id, owner_principal_id } = await resp.json()

    await supabaseAuth
      .from('children')
      .update({
        skeleton_space_id: space_id,
        skeleton_owner_principal_id: owner_principal_id,
      })
      .eq('id', childId)

    return json({ space_id, owner_principal_id })
  } catch (e) {
    return json({ error: (e as Error).message }, 400)
  }
})
