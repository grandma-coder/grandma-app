/**
 * menopauseLogs — save + invalidate helpers for the `menopause_logs` table.
 *
 * `saveMenopauseLog` writes one symptom/event row scoped to the current user and invalidates the
 * `['menopause-logs']` query so home, agenda timeline, and analytics all refetch. Hot flashes, night
 * sweats and free-form notes stack (each save is a new entry; passing `id` edits that one entry).
 * Every other type is single-value per day: saving it again replaces that day's row instead of
 * stacking a duplicate.
 */

import { supabase } from './supabase'
import { assertNotFuture } from './futureDate'
import { queryClient } from './queryClient'
import { isMultiPerDayType } from './menopauseSymptoms'

export function invalidateMenopauseLogQueries() {
  queryClient.invalidateQueries({ queryKey: ['menopause-logs'] })
}

export async function saveMenopauseLog(input: {
  date: string
  type: string
  value?: string | null
  severity?: number | null
  notes?: string | null
  /** Edit this existing entry instead of adding one (stacking types: one hot flash of several). */
  id?: string | null
}): Promise<void> {
  assertNotFuture(input.date)
  const { data: s } = await supabase.auth.getSession()
  const userId = s.session?.user.id
  if (!userId) throw new Error('Not authenticated')
  if (input.id) {
    const { error } = await supabase
      .from('menopause_logs')
      .update({
        severity: input.severity ?? null,
        value: input.value ?? null,
        notes: input.notes ?? null,
      })
      .eq('id', input.id)
      .eq('user_id', userId)
    if (error) throw error
    invalidateMenopauseLogQueries()
    return
  }
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
  if (!isMultiPerDayType(input.type) && inserted?.id) {
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

/** Remove one entry by id (one hot flash of several on a day). */
export async function deleteMenopauseLogEntry(id: string): Promise<void> {
  const { data: s } = await supabase.auth.getSession()
  const userId = s.session?.user.id
  if (!userId) throw new Error('Not authenticated')
  const { error } = await supabase.from('menopause_logs').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
  invalidateMenopauseLogQueries()
}

/** Remove a single-value entry (symptom or period) for one day — every row of that type that day. */
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
