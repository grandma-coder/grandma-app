// @ts-nocheck — Deno Edge Function
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
    // Get caller's JWT to identify who is inviting
    const authHeader = req.headers.get('authorization')
    if (!authHeader) throw new Error('Not authenticated')

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey)

    // Decode JWT to get user ID
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) throw new Error('Invalid token')

    const { childId, email, role, permissions } = await req.json()

    if (!childId || !email) throw new Error('childId and email are required')

    // Verify caller is parent of this child
    const { data: child } = await supabaseAuth
      .from('children')
      .select('id, parent_id')
      .eq('id', childId)
      .eq('parent_id', user.id)
      .single()

    if (!child) throw new Error('You are not the parent of this child')

    // Check for existing invite
    const { data: existing } = await supabaseAuth
      .from('child_caregivers')
      .select('id, status')
      .eq('child_id', childId)
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      if (existing.status === 'accepted') {
        throw new Error('This person already has access')
      }
      if (existing.status === 'pending') {
        throw new Error('An invite is already pending for this email')
      }
      // If revoked, reactivate
      if (existing.status === 'revoked') {
        const { data: updated } = await supabaseAuth
          .from('child_caregivers')
          .update({
            status: 'pending',
            role: role ?? 'nanny',
            permissions: permissions ?? { view: true, log_activity: true, chat: true },
          })
          .eq('id', existing.id)
          .select('invite_token')
          .single()

        return new Response(JSON.stringify({ inviteToken: updated.invite_token }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Create new invite
    const { data: invite, error: insertError } = await supabaseAuth
      .from('child_caregivers')
      .insert({
        child_id: childId,
        email: email.toLowerCase(),
        role: role ?? 'nanny',
        permissions: permissions ?? { view: true, log_activity: true, chat: true },
        invited_by: user.id,
      })
      .select('invite_token')
      .single()

    if (insertError) throw insertError

    return new Response(JSON.stringify({ inviteToken: invite.invite_token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
