/**
 * menopauseLogs — save + invalidate helpers for the `menopause_logs` table.
 *
 * `saveMenopauseLog` inserts one symptom/event row scoped to the current user
 * and invalidates the `['menopause-logs']` query so home, agenda timeline, and
 * analytics all refetch. Mirrors `saveChildLog` / the cycle log save helpers.
 */

import { supabase } from './supabase'
import { queryClient } from './queryClient'

export function invalidateMenopauseLogQueries() {
  queryClient.invalidateQueries({ queryKey: ['menopause-logs'] })
}

export async function saveMenopauseLog(input: {
  date: string
  type: string
  value?: string | null
  severity?: number | null
  notes?: string | null
}): Promise<void> {
  const { data: s } = await supabase.auth.getSession()
  const userId = s.session?.user.id
  if (!userId) throw new Error('Not authenticated')
  const { error } = await supabase.from('menopause_logs').insert({
    user_id: userId,
    date: input.date,
    type: input.type,
    value: input.value ?? null,
    severity: input.severity ?? null,
    notes: input.notes ?? null,
  })
  if (error) throw error
  invalidateMenopauseLogQueries()
}
