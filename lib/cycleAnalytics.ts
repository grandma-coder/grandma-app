/**
 * Cycle Analytics — reads cycle_logs and computes derived stats for the
 * pre-pregnancy analytics screen (CycleAnalytics + detail sheets).
 *
 * All hooks return React Query results. Empty states resolve to `null`
 * values so the UI can show a "Log your first cycle" nudge.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

// ─── Raw row shape ────────────────────────────────────────────────────────

export interface CycleLogRow {
  id: string
  user_id: string
  date: string                 // YYYY-MM-DD
  type:
    | 'period_start'
    | 'period_end'
    | 'ovulation'
    | 'symptom'
    | 'basal_temp'
    | 'intercourse'
    | 'cervical_mucus'
    | 'mood'
    | 'energy'
    | 'weight'
    | 'note'
  value: string | null
  notes: string | null
  created_at: string
}

// ─── Fetch ────────────────────────────────────────────────────────────────

async function fetchCycleLogs(): Promise<CycleLogRow[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data, error } = await supabase
    .from('cycle_logs')
    .select('id, user_id, date, type, value, notes, created_at')
    .eq('user_id', session.user.id)
    .order('date', { ascending: true })

  if (error) throw error
  return (data ?? []) as CycleLogRow[]
}

/** Base hook — all 5 stat hooks read the same cached list. */
export function useCycleLogs() {
  return useQuery({
    queryKey: ['cycleLogs'],
    queryFn: fetchCycleLogs,
    staleTime: 2 * 60 * 1000,
  })
}
