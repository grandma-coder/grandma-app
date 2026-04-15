/**
 * Insights API — fetch, generate, and manage AI-generated insights.
 */

import { supabase } from './supabase'

export type InsightType = 'pattern' | 'trend' | 'upcoming' | 'nudge'

export interface Insight {
  id: string
  user_id: string
  type: InsightType
  title: string
  body: string
  behavior: string
  child_id: string | null
  archived: boolean
  created_at: string
}

/** Fetch active (non-archived) insights for the current user */
export async function fetchInsights(behavior?: string): Promise<Insight[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  let query = supabase
    .from('insights')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('archived', false)
    .order('created_at', { ascending: false })
    .limit(20)

  if (behavior) {
    query = query.eq('behavior', behavior)
  }

  const { data, error } = await query
  if (error) {
    console.warn('Failed to fetch insights:', error.message)
    return []
  }

  return (data ?? []) as Insight[]
}

/** Trigger insight generation via Edge Function */
export async function generateInsights(behavior: string): Promise<Insight[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  try {
    const { data, error } = await supabase.functions.invoke('generate-insights', {
      body: { user_id: session.user.id, behavior },
    })

    if (error) {
      console.warn('generate-insights error:', error)
      throw new Error('Could not generate insights right now. Please try again later.')
    }

    return data?.insights ?? []
  } catch (e: any) {
    // Re-throw our own friendly errors
    if (e.message?.includes('Could not generate')) throw e
    console.warn('generate-insights unexpected error:', e)
    throw new Error('Something went wrong generating insights. Please try again.')
  }
}

/** Archive a single insight */
export async function archiveInsight(insightId: string): Promise<void> {
  await supabase
    .from('insights')
    .update({ archived: true, archived_at: new Date().toISOString() })
    .eq('id', insightId)
}

/** Auto-archive insights older than 7 days */
export async function archiveStaleInsights(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  await supabase
    .from('insights')
    .update({ archived: true, archived_at: new Date().toISOString() })
    .eq('user_id', session.user.id)
    .eq('archived', false)
    .lt('created_at', sevenDaysAgo.toISOString())
}

/** Fetch archived insights grouped by date for history view */
export async function fetchArchivedInsights(behavior?: string): Promise<Insight[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  let query = supabase
    .from('insights')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('archived', true)
    .order('created_at', { ascending: false })
    .limit(50)

  if (behavior) {
    query = query.eq('behavior', behavior)
  }

  const { data, error } = await query
  if (error) {
    console.warn('Failed to fetch archived insights:', error.message)
    return []
  }

  return (data ?? []) as Insight[]
}

/** Restore an archived insight back to active */
export async function restoreInsight(insightId: string): Promise<void> {
  await supabase
    .from('insights')
    .update({ archived: false, archived_at: null })
    .eq('id', insightId)
}

// ─── Metrics ──────────────────────────────────────────────────────────────

export interface BehaviorMetrics {
  totalLogs: number
  logStreak: number        // consecutive days with logs
  lastLogDate: string | null
  topTypes: { type: string; count: number }[]
  recentActivity: { date: string; count: number }[] // last 7 days
}

/** Fetch high-level metrics for the current behavior mode */
export async function fetchBehaviorMetrics(behavior: string): Promise<BehaviorMetrics> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return emptyMetrics()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sinceDate = thirtyDaysAgo.toISOString().split('T')[0]

  const table =
    behavior === 'pre-pregnancy' ? 'cycle_logs'
    : behavior === 'pregnancy' ? 'pregnancy_logs'
    : 'child_logs'

  const { data: logs, error } = await supabase
    .from(table)
    .select('date, type')
    .eq('user_id', session.user.id)
    .gte('date', sinceDate)
    .order('date', { ascending: false })
    .limit(500)

  if (error || !logs || logs.length === 0) return emptyMetrics()

  // Total logs
  const totalLogs = logs.length

  // Last log date
  const lastLogDate = logs[0]?.date ?? null

  // Top types
  const typeCounts: Record<string, number> = {}
  for (const log of logs) {
    typeCounts[log.type] = (typeCounts[log.type] || 0) + 1
  }
  const topTypes = Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)

  // Recent 7 days activity
  const sevenDaysAgo = new Date()
  const recentActivity: { date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const count = logs.filter((l: any) => l.date === dateStr).length
    recentActivity.push({ date: dateStr, count })
  }

  // Log streak (consecutive days from today going backwards)
  const uniqueDates = [...new Set(logs.map((l: any) => l.date))].sort().reverse()
  let logStreak = 0
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    const checkStr = checkDate.toISOString().split('T')[0]
    if (uniqueDates.includes(checkStr)) {
      logStreak++
    } else if (i > 0) {
      break // streak broken
    }
    // skip today if no log yet
  }

  return { totalLogs, logStreak, lastLogDate, topTypes, recentActivity }
}

function emptyMetrics(): BehaviorMetrics {
  return { totalLogs: 0, logStreak: 0, lastLogDate: null, topTypes: [], recentActivity: [] }
}
