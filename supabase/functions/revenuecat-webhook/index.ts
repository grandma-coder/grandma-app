// @ts-nocheck — Deno Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// Shared secret configured in the RevenueCat dashboard ("Authorization header"
// field on the webhook). RevenueCat sends it verbatim in the Authorization
// header of every POST; we compare it constant-time before any business logic.
const REVENUECAT_WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Constant-time string comparison — avoids leaking the secret via timing.
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  // Compare a fixed-length digest of each so length never short-circuits.
  if (ab.length !== bb.length) {
    // Still walk a comparison to keep timing uniform, then fail.
    let diff = 1
    const max = Math.max(ab.length, bb.length)
    for (let i = 0; i < max; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0)
    return false
  }
  let diff = 0
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i]
  return diff === 0
}

// Map RevenueCat product IDs and entitlement IDs to our subscription tiers.
// Tier downgrade is handled by the DB trigger trg_lock_excess_seats on
// profiles.subscription_tier, which flags newest excess caregivers as
// is_locked=true (read-only).
const PRODUCT_TO_TIER: Record<string, 'premium_solo' | 'premium_family'> = {
  premium_solo_monthly: 'premium_solo',
  premium_solo_annual: 'premium_solo',
  premium_family_monthly: 'premium_family',
  premium_family_annual: 'premium_family',
}

const ENTITLEMENT_TO_TIER: Record<string, 'premium_solo' | 'premium_family'> = {
  premium_solo: 'premium_solo',
  premium_family: 'premium_family',
  // Legacy single entitlement
  premium: 'premium_solo',
}

function resolveTier(event: any): 'free' | 'premium_solo' | 'premium_family' | null {
  // Prefer entitlement — it's set by RevenueCat's product→entitlement mapping
  const entitlementIds: string[] = event.entitlement_ids ?? []
  for (const id of entitlementIds) {
    if (ENTITLEMENT_TO_TIER[id]) return ENTITLEMENT_TO_TIER[id]
  }
  // Fallback: map by product_id
  const productId: string | undefined = event.product_id
  if (productId && PRODUCT_TO_TIER[productId]) return PRODUCT_TO_TIER[productId]
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ─── Verify the webhook is genuinely from RevenueCat ───────────────────
  // Without this, anyone who knows the URL can POST a forged event and grant
  // any user_id Premium. Fail closed: if the secret isn't configured, reject.
  if (!REVENUECAT_WEBHOOK_SECRET) {
    console.error('REVENUECAT_WEBHOOK_SECRET is not set — rejecting webhook')
    return new Response(
      JSON.stringify({ error: 'Webhook not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!timingSafeEqual(authHeader, REVENUECAT_WEBHOOK_SECRET)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const body = await req.json()
    const event = body.event
    const userId = body.app_user_id ?? event?.app_user_id

    if (!userId) {
      throw new Error('No app_user_id in webhook payload')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const activeEvents = [
      'INITIAL_PURCHASE',
      'RENEWAL',
      'PRODUCT_CHANGE',
      'UNCANCELLATION',
    ]
    const inactiveEvents = [
      'CANCELLATION',
      'EXPIRATION',
      'BILLING_ISSUE',
    ]

    let tier: 'free' | 'premium_solo' | 'premium_family' | null = null
    let status: 'free' | 'premium' | null = null

    if (activeEvents.includes(event.type)) {
      tier = resolveTier(event) ?? 'premium_solo'
      status = 'premium'
    } else if (inactiveEvents.includes(event.type)) {
      tier = 'free'
      status = 'free'
    }

    if (tier) {
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_tier: tier, subscription_status: status })
        .eq('id', userId)
      if (error) throw error
    }

    return new Response(JSON.stringify({ ok: true, tier }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
