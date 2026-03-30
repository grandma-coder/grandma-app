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
    const body = await req.json()
    const event = body.event

    // RevenueCat sends app_user_id which maps to our Supabase auth user ID
    const userId = body.app_user_id

    if (!userId) {
      throw new Error('No app_user_id in webhook payload')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Determine subscription status based on event type
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

    let status: string | null = null

    if (activeEvents.includes(event.type)) {
      status = 'premium'
    } else if (inactiveEvents.includes(event.type)) {
      status = 'free'
    }

    if (status) {
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_status: status })
        .eq('id', userId)

      if (error) throw error
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
