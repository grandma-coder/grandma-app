/**
 * Skeleton appspace integration (Unit 1.12).
 *
 * Thin client helpers that call the server-side edge functions which hold the
 * Skeleton appspace API key. The key NEVER lives in the RN bundle — these
 * helpers only invoke edge functions. All calls are best-effort: Skeleton is
 * an additive context backend, so a sync failure must never block the core
 * Grandma flow (the app keeps working on Supabase).
 */
import { supabase } from './supabase'

/**
 * Provision (or fetch the existing) Skeleton space for a child. Returns the
 * Skeleton space id, or null if Skeleton isn't configured / the call failed.
 * Never throws.
 */
export async function provisionChildSpace(childId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('skeleton-provision-child', {
      body: { childId },
    })
    if (error) {
      console.warn('[skeleton] provisionChildSpace failed:', error.message)
      return null
    }
    if (data?.skeleton === 'not_configured') return null
    return (data?.space_id as string) ?? null
  } catch (e) {
    console.warn('[skeleton] provisionChildSpace threw:', e)
    return null
  }
}

/**
 * Invite a care-circle member to a child's Skeleton space. Best-effort; the
 * Supabase child_caregivers invite remains the source of truth for the app.
 * Returns true if the Skeleton invite was created. Never throws.
 */
export async function inviteCaregiverToSkeleton(
  childId: string,
  email: string,
  canMutate = true,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('skeleton-invite-caregiver', {
      body: { childId, email, canMutate },
    })
    if (error) {
      console.warn('[skeleton] inviteCaregiverToSkeleton failed:', error.message)
      return false
    }
    return Boolean(data?.invited)
  } catch (e) {
    console.warn('[skeleton] inviteCaregiverToSkeleton threw:', e)
    return false
  }
}
