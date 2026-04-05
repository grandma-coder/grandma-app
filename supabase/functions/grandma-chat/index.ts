// deno-lint-ignore-file
// @ts-nocheck — Deno Edge Function: TS errors in VS Code are expected (runs in Deno, not Node)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      messages,
      user_id,
      context,
    } = await req.json()

    if (!user_id || !messages) {
      return new Response(
        JSON.stringify({ error: 'user_id and messages are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const behavior = context?.behavior ?? 'kids'
    const insightContext = context?.insight ?? null
    const screen = context?.screen ?? null

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ─── Fetch user profile ────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, location, language, health_notes, allergies, conditions, medications')
      .eq('user_id', user_id)
      .single()

    // ─── Fetch last 7 days of logs ─────────────────────────────────────
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sinceDate = sevenDaysAgo.toISOString().split('T')[0]

    let recentLogs = ''

    if (behavior === 'pre-pregnancy') {
      const { data: logs } = await supabase
        .from('cycle_logs')
        .select('date, type, value, notes')
        .eq('user_id', user_id)
        .gte('date', sinceDate)
        .order('date', { ascending: false })
        .limit(30)

      if (logs?.length) {
        recentLogs = 'Recent cycle logs:\n' + logs.map((l: any) =>
          `  ${l.date} — ${l.type}: ${l.value ?? ''} ${l.notes ? `(${l.notes})` : ''}`
        ).join('\n')
      }
    } else if (behavior === 'pregnancy') {
      const { data: logs } = await supabase
        .from('pregnancy_logs')
        .select('date, type, value, notes')
        .eq('user_id', user_id)
        .gte('date', sinceDate)
        .order('date', { ascending: false })
        .limit(30)

      if (logs?.length) {
        recentLogs = 'Recent pregnancy logs:\n' + logs.map((l: any) =>
          `  ${l.date} — ${l.type}: ${l.value ?? ''} ${l.notes ? `(${l.notes})` : ''}`
        ).join('\n')
      }
    } else {
      const { data: children } = await supabase
        .from('children')
        .select('id, name, dob, allergies, conditions')
        .eq('user_id', user_id)

      const childIds = (children ?? []).map((c: any) => c.id)
      if (childIds.length > 0) {
        const { data: logs } = await supabase
          .from('child_logs')
          .select('child_id, date, type, value, notes')
          .in('child_id', childIds)
          .gte('date', sinceDate)
          .order('date', { ascending: false })
          .limit(50)

        const childNames = Object.fromEntries((children ?? []).map((c: any) => [c.id, c.name]))

        if (logs?.length) {
          recentLogs = 'Recent child activity logs:\n' + logs.map((l: any) =>
            `  ${l.date} — ${childNames[l.child_id] ?? 'Child'}: ${l.type} — ${l.value ?? ''} ${l.notes ? `(${l.notes})` : ''}`
          ).join('\n')
        }

        // Add child profiles
        if (children?.length) {
          recentLogs += '\n\nChild profiles:\n' + children.map((c: any) =>
            `  ${c.name}: born ${c.dob ?? 'unknown'}${c.allergies?.length ? `, allergies: ${c.allergies.join(', ')}` : ''}${c.conditions?.length ? `, conditions: ${c.conditions.join(', ')}` : ''}`
          ).join('\n')
        }
      }
    }

    // ─── Build system prompt ───────────────────────────────────────────
    const profileContext = profile
      ? `User profile: ${profile.name ?? 'Unknown'}${profile.location ? `, located in ${profile.location}` : ''}${profile.health_notes ? `. Health notes: ${profile.health_notes}` : ''}${profile.allergies?.length ? `. Allergies: ${profile.allergies.join(', ')}` : ''}${profile.conditions?.length ? `. Conditions: ${profile.conditions.join(', ')}` : ''}`
      : ''

    const insightNote = insightContext
      ? `\n\nThe user is asking about this insight: "${insightContext}". Use it as context for your response.`
      : ''

    const systemPrompt = `You are Grandma — a warm, wise, knowledgeable companion from grandma.app.
You speak like a trusted grandmother who has guided many families.
You never make parents feel judged.

Current behavior mode: ${behavior}
${profileContext}

${recentLogs ? `\n${recentLogs}` : ''}
${insightNote}

Rules:
- Be warm, specific, and practical in 3-5 sentences
- Use plain everyday language, never medical jargon without explanation
- For medicines and symptoms, always suggest consulting their doctor
- NEVER diagnose. Frame all health content as guidance.
- NEVER invent drug dosages
- You know their recent logs and profile — reference them naturally when relevant
- If they ask about nearby services and you know their location, help them search
- Tailor everything to their current journey: ${behavior}`

    // ─── Call Claude API with streaming ─────────────────────────────────
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        stream: true,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Claude API error: ${response.status} — ${errText}`)
    }

    // Stream SSE back to client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err: any) {
    console.error('grandma-chat error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
