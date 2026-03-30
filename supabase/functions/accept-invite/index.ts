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
    const authHeader = req.headers.get('authorization')
    if (!authHeader) throw new Error('Not authenticated')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) throw new Error('Invalid token')

    const { token } = await req.json()
    if (!token) throw new Error('Invite token is required')

    // Find the invite
    const { data: invite, error: findError } = await supabase
      .from('child_caregivers')
      .select('id, child_id, email, status, children(name)')
      .eq('invite_token', token)
      .single()

    if (findError || !invite) throw new Error('Invite not found')

    if (invite.status === 'accepted') throw new Error('This invite has already been accepted')
    if (invite.status === 'revoked') throw new Error('This invite has been revoked')

    // Verify email matches
    if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      throw new Error('This invite was sent to a different email address')
    }

    // Ensure profile exists
    await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email, user_role: 'nanny' }, { onConflict: 'id' })

    // Accept the invite
    const { error: updateError } = await supabase
      .from('child_caregivers')
      .update({
        user_id: user.id,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (updateError) throw updateError

    // Return child info for navigation
    const { data: child } = await supabase
      .from('children')
      .select('*')
      .eq('id', invite.child_id)
      .single()

    return new Response(JSON.stringify({
      success: true,
      childName: child?.name ?? 'Unknown',
      childId: invite.child_id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
