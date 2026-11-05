/**
 * menopauseLogs — save + invalidate helpers for the `menopause_logs` table.
 *
 * `saveMenopauseLog` writes one symptom/event row scoped to the current user and invalidates the
 * `['menopause-logs']` query so home, agenda timeline, and analytics all refetch. Every type except
 * the free-form `note` is single-value per day: saving it again replaces that day's row instead of
 * stacking a duplicate.
 */

import { supabase } from './supabase'
import { assertNotFuture } from './futureDate'
import { queryClient } from './queryClient'

export function invalidateMenopauseLogQueries() {
  queryClient.invalidateQueries({ queryKey: ['menopause-logs'] })
}

/** Types that may be logged more than once on the same day. */
const MULTI_PER_DAY = new Set(['note'])

export async function saveMenopauseLog(input: {
  date: string
  type: string
  value?: string | null
  severity?: number | null
  notes?: string | null
}): Promise<void> {
  assertNotFuture(input.date)
  const { data: s } = await supabase.auth.getSession()
  const userId = s.session?.user.id
  if (!userId) throw new Error('Not authenticated')
  if (!MULTI_PER_DAY.has(input.type)) {
    const { error: delError } = await supabase
      .from('menopause_logs')
      .delete()
      .eq('user_id', userId)
      .eq('date', input.date)
      .eq('type', input.type)
    if (delError) throw delError
  }
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
