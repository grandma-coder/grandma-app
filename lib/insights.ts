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

  const { data, error } = await supabase.functions.invoke('generate-insights', {
    body: { user_id: session.user.id, behavior },
  })

  if (error) throw error
  return data?.insights ?? []
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
