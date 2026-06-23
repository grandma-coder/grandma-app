// deno-lint-ignore-file
// @ts-nocheck — Deno Edge Function: TS errors in VS Code are expected (runs in Deno, not Node)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// CORS: mobile clients send no Origin, so '*' is the safe default. Set
// ALLOWED_ORIGINS (comma-separated) to lock a future web client down.
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

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { behavior } = await req.json()

    if (!behavior) {
      return new Response(
        JSON.stringify({ error: 'behavior is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ─── Authenticate caller; derive user_id from the verified JWT ─────────
    // Never trust a user_id from the request body — that's an IDOR on every
    // user's health logs (generate-insights reads cycle/pregnancy/child logs).
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData?.user?.id) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const user_id = authData.user.id

    // ─── Fetch last 30 days of logs ──────────────────────────────────────
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sinceDate = thirtyDaysAgo.toISOString().split('T')[0]

    let logSummary = ''

    if (behavior === 'pre-pregnancy') {
      const { data: cycleLogs, error: cycleErr } = await supabase
        .from('cycle_logs')
        .select('date, type, value, notes')
        .eq('user_id', user_id)
        .gte('date', sinceDate)
        .order('date', { ascending: false })
        .limit(200)

      if (cycleErr) {
        console.error('Failed to fetch cycle_logs:', cycleErr.message)
      }
      logSummary = formatCycleLogs(cycleLogs ?? [])
    } else if (behavior === 'pregnancy') {
      const { data: pregLogs, error: pregErr } = await supabase
        .from('pregnancy_logs')
        .select('date, type, value, notes')
        .eq('user_id', user_id)
        .gte('date', sinceDate)
        .order('date', { ascending: false })
        .limit(200)

      if (pregErr) {
        console.error('Failed to fetch pregnancy_logs:', pregErr.message)
      }
      logSummary = formatPregnancyLogs(pregLogs ?? [])
    } else if (behavior === 'kids') {
      // Get user's children
      const { data: children, error: childErr } = await supabase
        .from('children')
        .select('id, name, birth_date')
        .eq('user_id', user_id)

      if (childErr) {
        console.error('Failed to fetch children:', childErr.message)
      }

      const childList = children ?? []
      const childIds = childList.map((c: any) => c.id)
      const childNames = Object.fromEntries(childList.map((c: any) => [c.id, c.name]))
      const childAges = Object.fromEntries(childList.map((c: any) => {
        if (!c.birth_date) return [c.id, null]
        const months = Math.floor((Date.now() - new Date(c.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
        return [c.id, months]
      }))

      if (childIds.length > 0) {
        const { data: childLogs, error: logErr } = await supabase
          .from('child_logs')
          .select('child_id, date, type, value, notes')
          .in('child_id', childIds)
          .gte('date', sinceDate)
          .order('date', { ascending: false })
          .limit(500)

        if (logErr) {
          console.error('Failed to fetch child_logs:', logErr.message)
        }

        logSummary = formatChildLogs(childLogs ?? [], childNames, childAges)
      } else {
        // Also try direct user_id query as fallback (some logs may have user_id without children record)
        const { data: directLogs, error: directErr } = await supabase
          .from('child_logs')
          .select('child_id, date, type, value, notes')
          .eq('user_id', user_id)
          .gte('date', sinceDate)
          .order('date', { ascending: false })
          .limit(500)

        if (directErr) {
          console.error('Failed to fetch child_logs by user_id:', directErr.message)
        }

        if (directLogs && directLogs.length > 0) {
          logSummary = formatChildLogs(directLogs, {}, {})
        }
      }
    }

    // ─── If no logs, return starter nudges without calling AI ─────────
    if (!logSummary) {
      const starterInsights = getStarterInsights(behavior)

      const rows = starterInsights.map((ins: any) => ({
        user_id,
        type: ins.type,
        title: ins.title,
        body: ins.body,
        behavior,
        child_id: null,
        is_starter: true,
      }))

      const { data: inserted, error: insertErr } = await supabase
        .from('insights')
        .insert(rows)
        .select('id')

      if (insertErr) {
        console.error('Failed to insert starter insights:', insertErr.message)
        throw new Error(`Insert failed: ${insertErr.message}`)
      }

      // Archive all OTHER active insights for this user+behavior (keep just-inserted ones)
      const newIds = (inserted ?? []).map((r: any) => r.id)
      const archiveQuery = supabase
        .from('insights')
        .update({ archived: true, archived_at: new Date().toISOString() })
        .eq('user_id', user_id)
        .eq('behavior', behavior)
        .eq('archived', false)
      if (newIds.length > 0) archiveQuery.not('id', 'in', `(${newIds.join(',')})`)
      await archiveQuery

      return new Response(
        JSON.stringify({ insights: starterInsights, count: starterInsights.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ─── Call Claude API ─────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(behavior)
    const userMessage = `Here are the user's logs from the last 30 days:\n\n${logSummary}\n\nGenerate 3-5 personalized insights based on this data. Return ONLY a valid JSON array.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Claude API error: ${response.status} — ${errText}`)
    }

    const aiResponse = await response.json()
    const aiText = aiResponse.content?.[0]?.text ?? '[]'

    // Parse JSON from response — handle markdown code blocks too
    let insights: any[] = []
    try {
      // Strip markdown code blocks if present
      const cleaned = aiText.replace(/```json?\s*/g, '').replace(/```\s*/g, '')
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0])
      }
    } catch (parseErr: any) {
      console.error('Failed to parse insights JSON:', parseErr.message, 'Raw:', aiText.slice(0, 500))
      insights = []
    }

    // ─── Save insights to database ───────────────────────────────────────
    // Build rows to insert. If AI returned nothing useful, insert a fallback
    // so the user is never left empty.
    const rows = insights.length > 0
      ? insights.map((ins: any) => ({
          user_id,
          type: ins.type ?? 'nudge',
          title: ins.title ?? 'Insight',
          body: ins.body ?? '',
          behavior,
          child_id: ins.child_id ?? null,
        }))
      : [{
          user_id,
          type: 'nudge',
          title: 'Grandma is still learning',
          body: "Keep logging and I'll have personalized insights for you soon!",
          behavior,
          child_id: null,
        }]

    const { data: inserted, error: insertErr } = await supabase
      .from('insights')
      .insert(rows)
      .select('id')

    if (insertErr) {
      // Don't archive anything — keep the user's existing insights visible.
      console.error('Failed to insert generated insights:', insertErr.message)
      throw new Error(`Insert failed: ${insertErr.message}`)
    }

    // Archive previous active insights only AFTER new ones successfully inserted
    const newIds = (inserted ?? []).map((r: any) => r.id)
    const archiveQuery = supabase
      .from('insights')
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq('user_id', user_id)
      .eq('behavior', behavior)
      .eq('archived', false)
    if (newIds.length > 0) archiveQuery.not('id', 'in', `(${newIds.join(',')})`)
    await archiveQuery

    return new Response(
      JSON.stringify({ insights, count: insights.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('generate-insights error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ─── System Prompt ─────────────────────────────────────────────────────────

function buildSystemPrompt(behavior: string): string {
  return `You are Grandma, a warm and wise AI health companion for the grandma.app.
You generate personalized insights based on the user's health logs.

Current behavior mode: ${behavior}

Generate insights in these 4 categories:
1. **pattern** — recurring patterns you notice (e.g. "Sleep quality drops after late feeds", "Mood is happier on active days")
2. **trend** — changes over time (e.g. "Feeding amounts have been increasing steadily", "Sleep is improving week over week")
3. **upcoming** — predictions or reminders (e.g. "Next vaccine may be due soon", "Growth spurt might be coming based on increased appetite")
4. **nudge** — gentle encouragement or suggestions (e.g. "Try logging temperature for better tracking", "You're doing great — 12 days of consistent logging!")

RULES:
- Be warm, supportive, never clinical or scary
- Reference SPECIFIC data from the logs (actual numbers, days, types) — do NOT be generic
- Keep titles under 60 characters
- Keep body under 150 characters
- Include the insight type in each object
- For kids mode, include child_id if the insight is child-specific
- Return ONLY a JSON array: [{"type": "pattern|trend|upcoming|nudge", "title": "...", "body": "...", "child_id": null}]
- Generate 3-5 insights total, at least one of each type if data supports it
- If a child's name is mentioned in the data, use it in your insights for a personal touch`
}

// ─── Log Formatters ────────────────────────────────────────────────────────

function formatCycleLogs(logs: any[]): string {
  if (logs.length === 0) return ''

  const grouped: Record<string, any[]> = {}
  for (const log of logs) {
    const key = log.type
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(log)
  }

  let summary = `Cycle tracking data (${logs.length} entries over last 30 days):\n`
  for (const [type, entries] of Object.entries(grouped)) {
    summary += `\n${type} (${entries.length} entries):\n`
    for (const e of entries.slice(0, 15)) {
      summary += `  - ${e.date}: ${e.value ?? ''} ${e.notes ? `(${e.notes})` : ''}\n`
    }
    if (entries.length > 15) {
      summary += `  ... and ${entries.length - 15} more\n`
    }
  }
  return summary
}

function formatPregnancyLogs(logs: any[]): string {
  if (logs.length === 0) return ''

  const grouped: Record<string, any[]> = {}
  for (const log of logs) {
    const key = log.type
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(log)
  }

  let summary = `Pregnancy tracking data (${logs.length} entries over last 30 days):\n`
  for (const [type, entries] of Object.entries(grouped)) {
    summary += `\n${type} (${entries.length} entries):\n`
    for (const e of entries.slice(0, 15)) {
      summary += `  - ${e.date}: ${e.value ?? ''} ${e.notes ? `(${e.notes})` : ''}\n`
    }
    if (entries.length > 15) {
      summary += `  ... and ${entries.length - 15} more\n`
    }
  }
  return summary
}

function formatChildLogs(logs: any[], childNames: Record<string, string>, childAges: Record<string, number | null>): string {
  if (logs.length === 0) return ''

  // Build per-child summaries with stats
  const byChild: Record<string, any[]> = {}
  for (const log of logs) {
    const cid = log.child_id ?? 'unknown'
    if (!byChild[cid]) byChild[cid] = []
    byChild[cid].push(log)
  }

  let summary = `Child activity data (${logs.length} total entries over last 30 days):\n`

  for (const [childId, childLogs] of Object.entries(byChild)) {
    const name = childNames[childId] ?? 'Child'
    const age = childAges[childId]
    const ageStr = age != null ? (age < 12 ? `${age} months old` : `${Math.floor(age / 12)} years ${age % 12} months old`) : ''

    summary += `\n── ${name}${ageStr ? ` (${ageStr})` : ''} ── ${childLogs.length} entries\n`

    // Group by type
    const byType: Record<string, any[]> = {}
    for (const log of childLogs) {
      if (!byType[log.type]) byType[log.type] = []
      byType[log.type].push(log)
    }

    for (const [type, entries] of Object.entries(byType)) {
      summary += `\n  ${type} (${entries.length} entries):\n`

      // Show aggregate stats for numeric-heavy types
      if (type === 'feeding' || type === 'sleep') {
        const values = entries.map(e => {
          try { return typeof e.value === 'string' ? JSON.parse(e.value) : e.value } catch { return e.value }
        })
        summary += `    Dates: ${entries[entries.length - 1]?.date} to ${entries[0]?.date}\n`
      }

      // Show recent entries with detail
      for (const e of entries.slice(0, 10)) {
        let val = e.value ?? ''
        // Parse JSON values for readability
        if (typeof val === 'string' && val.startsWith('{')) {
          try {
            const parsed = JSON.parse(val)
            val = Object.entries(parsed).map(([k, v]) => `${k}=${v}`).join(', ')
          } catch { /* keep raw */ }
        }
        summary += `    - ${e.date}: ${val} ${e.notes ? `(${e.notes})` : ''}\n`
      }
      if (entries.length > 10) {
        summary += `    ... and ${entries.length - 10} more entries\n`
      }
    }
  }

  return summary
}

// ─── Starter Insights (when no logs exist) ────────────────────────────────

function getStarterInsights(behavior: string): any[] {
  if (behavior === 'pre-pregnancy') {
    return [
      { type: 'nudge', title: 'Start logging your cycle', body: 'Track a few days of data so Grandma can spot patterns and give you personalized tips.', child_id: null },
      { type: 'upcoming', title: 'Better predictions ahead', body: 'With a week of logs, I can start predicting your fertile window and next period.', child_id: null },
      { type: 'nudge', title: 'Log symptoms too', body: 'Tracking mood, cramps, and energy helps me find patterns you might miss.', child_id: null },
    ]
  } else if (behavior === 'pregnancy') {
    return [
      { type: 'nudge', title: 'Start your pregnancy journal', body: 'Log how you feel each day — symptoms, mood, energy — so I can track your journey.', child_id: null },
      { type: 'upcoming', title: 'Milestones are coming', body: 'Once I know your due date, I can give you week-by-week insights and reminders.', child_id: null },
      { type: 'nudge', title: 'Track your appointments', body: 'Log checkups and test results so I can help you stay on top of everything.', child_id: null },
    ]
  } else {
    return [
      { type: 'nudge', title: "Log your little one's day", body: 'Track feeds, sleep, and milestones so Grandma can spot trends and cheer you on.', child_id: null },
      { type: 'upcoming', title: 'Development insights await', body: 'A few days of logs and I can start sharing personalized development observations.', child_id: null },
      { type: 'nudge', title: 'Every detail helps', body: 'Diaper changes, naps, feeding times — the more you log, the smarter my insights get.', child_id: null },
    ]
  }
}
