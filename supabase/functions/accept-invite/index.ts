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

    const { token, preview } = await req.json()
    if (!token) throw new Error('Invite token is required')

    // Find the invite
    const { data: invite, error: findError } = await supabase
      .from('child_caregivers')
      .select('id, child_id, email, status, role, permissions, invited_by, invite_token_expires_at, children(name, parent_id)')
      .eq('invite_token', token)
      .single()

    if (findError || !invite) throw new Error('Invite not found')
    // The owner tapping their own link would turn themselves into a caregiver of their own child
    // (and burn a seat).
    if (invite.children?.parent_id === user.id || invite.invited_by === user.id) {
      throw new Error('You cannot accept your own invite')
    }

    if (invite.status === 'accepted') throw new Error('This invite has already been accepted')
    if (invite.status === 'revoked') throw new Error('This invite has been revoked')

    // Reject expired invites (token lifecycle is managed by a DB trigger that
    // sets invite_token_expires_at = now() + 7 days when an invite is issued).
    if (invite.invite_token_expires_at && new Date(invite.invite_token_expires_at) < new Date()) {
      throw new Error('This invite has expired. Please ask for a new one.')
    }

    // Verify email matches — but only for email invites. Link / SMS invites
    // have no known recipient email, so they're created with a placeholder
    // (e.g. "<token>@invite.local" / "@pending"). For those, the invite TOKEN
    // is the authorization, so we skip the email check entirely. An exact-match
    // check here blocked every link/SMS invite (the placeholder never equals
    // the accepting user's real email).
    const inviteEmail = (invite.email ?? '').toLowerCase()
    const isPlaceholderEmail =
      inviteEmail === '' ||
      inviteEmail.endsWith('@invite.local') ||
      inviteEmail.endsWith('@pending')
    if (!isPlaceholderEmail && inviteEmail !== user.email?.toLowerCase()) {
      throw new Error('This invite was sent to a different email address')
    }

    // Preview mode: the accept-invite screen calls this to show the actual
    // granted capabilities before the user taps Accept. It runs the same
    // token + email validation above, then returns ONLY the role/permissions
    // and child name — never PHI or inviter detail — and does NOT mutate the
    // invite. The authenticated-caller + email-match gate is the trust boundary.
    if (preview) {
      return new Response(JSON.stringify({
        preview: true,
        role: invite.role,
        permissions: invite.permissions ?? {},
        childName: invite.children?.name ?? 'Unknown',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Ensure profile exists — without overwriting an existing account's role: a mum who accepts a
    // co-parent/family invite must stay 'parent' (ignoreDuplicates leaves existing rows untouched).
    await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email, user_role: 'nanny' }, { onConflict: 'id', ignoreDuplicates: true })

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

    // One invite can cover several children (care-circle writes one row per child, same inviter +
    // email, one token each) but only one link is shared — accept the live sibling rows too, or the
    // other children stay 'pending' forever.
    if (invite.invited_by && invite.email) {
      const { error: siblingError } = await supabase
        .from('child_caregivers')
        .update({ user_id: user.id, status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('invited_by', invite.invited_by)
        .eq('email', invite.email)
        .eq('status', 'pending')
        .neq('id', invite.id)
        .gt('invite_token_expires_at', new Date().toISOString())
      if (siblingError) console.warn('[accept-invite] sibling accept failed:', siblingError.message)
    }

    // Return only the child's name for post-accept navigation — never PHI.
    // (select('*') here would leak allergies/conditions/blood_type/pediatrician
    // into the response regardless of the caregiver's granted permissions; the
    // app's normal RLS-gated child fetch supplies anything they're allowed.)
    const { data: child } = await supabase
      .from('children')
      .select('name')
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
