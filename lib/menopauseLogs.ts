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
  // Insert the new row FIRST, then drop the day's older rows of this type. Deleting first meant a
  // failed insert (offline, timeout) lost the entry being edited.
  const { data: inserted, error } = await supabase
    .from('menopause_logs')
    .insert({
      user_id: userId,
      date: input.date,
      type: input.type,
      value: input.value ?? null,
      severity: input.severity ?? null,
      notes: input.notes ?? null,
    })
    .select('id')
    .single()
  if (error) throw error
  if (!MULTI_PER_DAY.has(input.type) && inserted?.id) {
    const { error: delError } = await supabase
      .from('menopause_logs')
      .delete()
      .eq('user_id', userId)
      .eq('date', input.date)
      .eq('type', input.type)
      .neq('id', inserted.id)
    // The new entry is saved; a leftover older row is cleared by the next save of this day + type.
    if (delError) console.warn('[menopause] replacing the previous entry failed:', delError.message)
  }
  invalidateMenopauseLogQueries()
}

/** Remove a single-value entry (symptom or period) for one day. */
export async function deleteMenopauseLog(date: string, type: string): Promise<void> {
  const { data: s } = await supabase.auth.getSession()
  const userId = s.session?.user.id
  if (!userId) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('menopause_logs')
    .delete()
    .eq('user_id', userId)
    .eq('date', date)
    .eq('type', type)
  if (error) throw error
  invalidateMenopauseLogQueries()
}
