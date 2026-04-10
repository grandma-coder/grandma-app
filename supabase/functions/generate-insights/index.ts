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
    const { user_id, behavior } = await req.json()

    if (!user_id || !behavior) {
      return new Response(
        JSON.stringify({ error: 'user_id and behavior are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ─── Fetch last 30 days of logs ──────────────────────────────────────
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sinceDate = thirtyDaysAgo.toISOString().split('T')[0]

    let logSummary = ''

    if (behavior === 'pre-pregnancy') {
      const { data: cycleLogs } = await supabase
        .from('cycle_logs')
        .select('date, type, value, notes')
        .eq('user_id', user_id)
        .gte('date', sinceDate)
        .order('date', { ascending: false })
        .limit(100)

      logSummary = formatCycleLogs(cycleLogs ?? [])
    } else if (behavior === 'pregnancy') {
      const { data: pregLogs } = await supabase
        .from('pregnancy_logs')
        .select('date, type, value, notes')
        .eq('user_id', user_id)
        .gte('date', sinceDate)
        .order('date', { ascending: false })
        .limit(100)

      logSummary = formatPregnancyLogs(pregLogs ?? [])
    } else if (behavior === 'kids') {
      // Get user's children
      const { data: children } = await supabase
        .from('children')
        .select('id, name')
        .eq('user_id', user_id)

      const childIds = (children ?? []).map((c: any) => c.id)
      const childNames = Object.fromEntries((children ?? []).map((c: any) => [c.id, c.name]))

      if (childIds.length > 0) {
        const { data: childLogs } = await supabase
          .from('child_logs')
          .select('child_id, date, type, value, notes')
          .in('child_id', childIds)
          .gte('date', sinceDate)
          .order('date', { ascending: false })
          .limit(200)

        logSummary = formatChildLogs(childLogs ?? [], childNames)
      }
    }

    // ─── If no logs, return starter nudges without calling AI ─────────
    if (!logSummary) {
      const starterInsights = getStarterInsights(behavior)

      // Archive old insights for this user + behavior
      await supabase
        .from('insights')
        .update({ archived: true, archived_at: new Date().toISOString() })
        .eq('user_id', user_id)
        .eq('behavior', behavior)
        .eq('archived', false)

      const rows = starterInsights.map((ins: any) => ({
        user_id,
        type: ins.type,
        title: ins.title,
        body: ins.body,
        behavior,
        child_id: null,
      }))

      await supabase.from('insights').insert(rows)

      return new Response(
        JSON.stringify({ insights: starterInsights, count: starterInsights.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ─── Call Claude API ─────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(behavior)
    const userMessage = `Here are the user's logs from the last 30 days:\n\n${logSummary}\n\nGenerate 3-5 insights based on this data. Return ONLY valid JSON array.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
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

    // Parse JSON from response
    let insights: any[] = []
    try {
      // Try to extract JSON array from response
      const jsonMatch = aiText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0])
      }
    } catch {
      console.error('Failed to parse insights JSON:', aiText)
      insights = []
    }

    // ─── Save insights to database ───────────────────────────────────────
    if (insights.length > 0) {
      // Archive old insights for this user + behavior
      await supabase
        .from('insights')
        .update({ archived: true, archived_at: new Date().toISOString() })
        .eq('user_id', user_id)
        .eq('behavior', behavior)
        .eq('archived', false)

      // Insert new insights
      const rows = insights.map((ins: any) => ({
        user_id,
        type: ins.type ?? 'nudge',
        title: ins.title ?? 'Insight',
        body: ins.body ?? '',
        behavior,
        child_id: ins.child_id ?? null,
      }))

      await supabase.from('insights').insert(rows)
    }

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
1. **pattern** — recurring patterns you notice (e.g. "Cramps tend to appear on cycle days 1-3", "Sleep quality drops on feeding days")
2. **trend** — changes over time (e.g. "Your cycle length has been getting more regular", "Weight gain is tracking within normal range")
3. **upcoming** — predictions or reminders (e.g. "Your fertile window starts in 3 days", "Next vaccine is due around April 20")
4. **nudge** — gentle encouragement or suggestions (e.g. "Try logging your temperature each morning for better predictions", "Adding more iron-rich foods could help with fatigue")

RULES:
- Be warm, supportive, never clinical or scary
- Keep titles under 60 characters
- Keep body under 150 characters
- Include the insight type in each object
- For kids mode, include child_id if the insight is child-specific
- Return ONLY a JSON array: [{"type": "pattern|trend|upcoming|nudge", "title": "...", "body": "...", "child_id": null}]
- Generate 3-5 insights total, at least one of each type if data supports it`
}

// ─── Log Formatters ────────────────────────────────────────────────────────

function formatCycleLogs(logs: any[]): string {
  if (logs.length === 0) return 'No cycle logs in the last 30 days.'

  const grouped: Record<string, any[]> = {}
  for (const log of logs) {
    const key = log.type
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(log)
  }

  let summary = `Cycle tracking data (${logs.length} entries):\n`
  for (const [type, entries] of Object.entries(grouped)) {
    summary += `\n${type} (${entries.length} entries):\n`
    for (const e of entries.slice(0, 10)) {
      summary += `  - ${e.date}: ${e.value ?? ''} ${e.notes ? `(${e.notes})` : ''}\n`
    }
  }
  return summary
}

function formatPregnancyLogs(logs: any[]): string {
  if (logs.length === 0) return 'No pregnancy logs in the last 30 days.'

  const grouped: Record<string, any[]> = {}
  for (const log of logs) {
    const key = log.type
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(log)
  }

  let summary = `Pregnancy tracking data (${logs.length} entries):\n`
  for (const [type, entries] of Object.entries(grouped)) {
    summary += `\n${type} (${entries.length} entries):\n`
    for (const e of entries.slice(0, 10)) {
      summary += `  - ${e.date}: ${e.value ?? ''} ${e.notes ? `(${e.notes})` : ''}\n`
    }
  }
  return summary
}

function formatChildLogs(logs: any[], childNames: Record<string, string>): string {
  if (logs.length === 0) return 'No child logs in the last 30 days.'

  const grouped: Record<string, any[]> = {}
  for (const log of logs) {
    const childName = childNames[log.child_id] ?? 'Unknown'
    const key = `${childName} — ${log.type}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(log)
  }

  let summary = `Child activity data (${logs.length} entries):\n`
  for (const [key, entries] of Object.entries(grouped)) {
    summary += `\n${key} (${entries.length} entries):\n`
    for (const e of entries.slice(0, 5)) {
      summary += `  - ${e.date}: ${e.value ?? ''} ${e.notes ? `(${e.notes})` : ''}\n`
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
