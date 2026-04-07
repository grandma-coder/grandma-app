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
    const allBehaviors: string[] = context?.allBehaviors ?? [behavior]
    const insightContext = context?.insight ?? null
    const screen = context?.screen ?? null

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ─── Fetch user profile ────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, location, language, health_notes, allergies, conditions, medications')
      .eq('id', user_id)
      .single()

    // ─── Fetch last 7 days of logs ─────────────────────────────────────
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sinceDate = sevenDaysAgo.toISOString().split('T')[0]

    // ─── Fetch logs for ALL enrolled behaviors ──────────────────────
    let recentLogs = ''

    // Cycle logs (if enrolled in pre-pregnancy)
    if (allBehaviors.includes('pre-pregnancy')) {
      const { data: logs } = await supabase
        .from('cycle_logs')
        .select('date, type, value, notes')
        .eq('user_id', user_id)
        .gte('date', sinceDate)
        .order('date', { ascending: false })
        .limit(20)

      if (logs?.length) {
        recentLogs += '\n[CYCLE TRACKING DATA]\n' + logs.map((l: any) =>
          `  ${l.date} — ${l.type}: ${l.value ?? ''} ${l.notes ? `(${l.notes})` : ''}`
        ).join('\n')
      }
    }

    // Pregnancy logs (if enrolled in pregnancy)
    if (allBehaviors.includes('pregnancy')) {
      const { data: logs } = await supabase
        .from('pregnancy_logs')
        .select('date, type, value, notes')
        .eq('user_id', user_id)
        .gte('date', sinceDate)
        .order('date', { ascending: false })
        .limit(20)

      if (logs?.length) {
        recentLogs += '\n[PREGNANCY DATA]\n' + logs.map((l: any) =>
          `  ${l.date} — ${l.type}: ${l.value ?? ''} ${l.notes ? `(${l.notes})` : ''}`
        ).join('\n')
      }
    }

    // Child logs (if enrolled in kids)
    if (allBehaviors.includes('kids')) {
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
          .limit(30)

        const childNames = Object.fromEntries((children ?? []).map((c: any) => [c.id, c.name]))

        recentLogs += '\n[KIDS DATA]\n'
        if (children?.length) {
          recentLogs += 'Children: ' + children.map((c: any) =>
            `${c.name} (born ${c.dob ?? 'unknown'}${c.allergies?.length ? `, allergies: ${c.allergies.join(', ')}` : ''})`
          ).join(', ') + '\n'
        }
        if (logs?.length) {
          recentLogs += logs.map((l: any) =>
            `  ${l.date} — ${childNames[l.child_id] ?? 'Child'}: ${l.type} — ${l.value ?? ''} ${l.notes ? `(${l.notes})` : ''}`
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

    const behaviorList = allBehaviors.map((b: string) =>
      b === 'pre-pregnancy' ? 'Cycle Tracking (trying to conceive)' :
      b === 'pregnancy' ? 'Pregnancy' : 'Kids'
    ).join(', ')

    const multiBehaviorNote = allBehaviors.length > 1
      ? `\n\nIMPORTANT: This user has set up the following journeys: ${behaviorList}.
She may ask about any of them. Answer using whichever context is most relevant to her question — she does not need to specify which journey she is asking about. If she asks about pregnancy while in Kids mode, use the pregnancy data. If she asks about her cycle while in pregnancy mode, use the cycle data. Be fluid.`
      : ''

    const systemPrompt = `You are Grandma — a warm, wise, knowledgeable companion from grandma.app.
You speak like a trusted grandmother who has guided many families.
You never make parents feel judged.

Currently viewing: ${behavior}
Enrolled journeys: ${behaviorList}${multiBehaviorNote}
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
