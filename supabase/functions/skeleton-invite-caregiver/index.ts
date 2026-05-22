// @ts-nocheck — Deno Edge Function
//
// Skeleton appspace integration (Unit 1.12). Mirrors a Grandma care-circle
// invite into the child's Skeleton space via the developer API. Best-effort:
// the Supabase child_caregivers invite is the app's source of truth; this only
// extends access into Skeleton. Server-side only (holds the appspace key).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const skeletonApiUrl = (Deno.env.get('SKELETON_API_URL') ?? 'https://api.skeleton.mother.tech').replace(/\/$/, '')
const skeletonApiKey = Deno.env.get('SKELETON_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

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

    const { childId, email, canMutate = true } = await req.json()
    if (!childId || !email) throw new Error('childId and email are required')

    // Caller must be the child's parent (the space owner).
    const { data: child } = await supabaseAuth
      .from('children')
      .select('id, parent_id, skeleton_space_id, skeleton_owner_principal_id')
      .eq('id', childId)
      .eq('parent_id', user.id)
      .single()
    if (!child) throw new Error('Child not found or not owned by caller')

    if (!skeletonApiKey || !child.skeleton_space_id || !child.skeleton_owner_principal_id) {
      // Not configured or the space isn't provisioned yet — no-op.
      return json({ invited: false, reason: 'not_provisioned' })
    }

    const resp = await fetch(
      `${skeletonApiUrl}/api/developer/spaces/${encodeURIComponent(child.skeleton_space_id)}/invite`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${skeletonApiKey}` },
        body: JSON.stringify({
          owner_principal_id: child.skeleton_owner_principal_id,
          members: [{ email: String(email).toLowerCase(), can_mutate: Boolean(canMutate) }],
        }),
      },
    )
    if (!resp.ok) {
      const detail = await resp.text()
      throw new Error(`Skeleton invite failed (${resp.status}): ${detail}`)
    }
    const out = await resp.json()
    return json({ invited: (out?.invited ?? 0) > 0 })
  } catch (e) {
    return json({ error: (e as Error).message }, 400)
  }
})
