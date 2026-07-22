// @ts-nocheck — Deno Edge Function (URL imports, Deno globals; not type-checked by the app's tsconfig).
// notification-opened: record that a user tapped a push notification.
//
// The command center stamps each push recipient with an opaque `recipientId`
// and includes it in the notification's data payload. When the app handles a
// notification tap, it POSTs that id here; we mark push_recipients.opened_at and
// bump the campaign's opened_count — feeding the Push → Analytics funnel
// (sent → delivered → opened).
//
// Idempotent: only the first tap counts (guarded on opened_at IS NULL).
// No auth required — the recipientId is an opaque uuid, recording a tap is not
// sensitive, and it must work even from a cold app launch via a tapped push.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean)

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowOrigin =
    ALLOWED_ORIGINS.length === 0 ? '*'
    : ALLOWED_ORIGINS.includes(origin) ? origin
    : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { recipientId } = await req.json()
    if (typeof recipientId !== 'string' || !UUID_RE.test(recipientId)) {
      return new Response(JSON.stringify({ error: 'valid recipientId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // First tap only — returns the campaign row when this call actually flipped it.
    const { data, error } = await supabase
      .from('push_recipients')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', recipientId)
      .is('opened_at', null)
      .select('campaign_id')
      .maybeSingle()
    if (error) throw error

    let counted = false
    if (data?.campaign_id) {
      counted = true
      // Bump the campaign's opened_count. RPC-free: read-modify-write is fine at
      // push-open volume, and a rare race just under-counts by one (never over).
      const { data: camp } = await supabase
        .from('push_campaigns')
        .select('opened_count')
        .eq('id', data.campaign_id)
        .single()
      await supabase
        .from('push_campaigns')
        .update({ opened_count: (camp?.opened_count ?? 0) + 1 })
        .eq('id', data.campaign_id)
    }

    return new Response(JSON.stringify({ ok: true, counted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
