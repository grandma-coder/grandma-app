/**
 * Client-side caregiver capability evaluation.
 *
 * UX ONLY — this decides what the caregiver surface *renders*. The security
 * boundary is Postgres RLS, which reads the same `permissions` JSONB keys
 * (see supabase/migrations/*_rls_*.sql). A capability is only "real" when both
 * the helper here and an RLS predicate reference the same key, so the semantics
 * below intentionally mirror the RLS predicate:
 *
 *   accepted caregiver AND NOT _paused AND (permissions->>'<flag>')::boolean = true
 *
 * Owners (caregiverRole === 'parent') short-circuit to full access — they own
 * the child record and are not gated by the permissions JSONB.
 */

import type { CaregiverCapability, ChildWithRole } from '../types'
import { roleDefaultCards, type CaregiverBehavior } from './caregiverCards'
import { CAREGIVER_CARDS } from './caregiverCards'

/**
 * A caregiver's resolved home view. Computed once in app/(tabs)/index.tsx and
 * threaded into whichever behavior home renders, so the home can (a) show only
 * the shared cards, (b) keep log entry points inert without `log_activity`, and
 * (c) pin the essentials card. Null for owners (the normal, unfiltered case).
 */
export interface CaregiverView {
  /** Card ids the caregiver's surface may render (UX-only; RLS still gates data). */
  visible: Set<string>
  /** log_activity granted → log chips fire; else they're inert. */
  canLog: boolean
  /** emergency granted → essentials card shows the full (emergency + insurance) rows. */
  showFullEssentials: boolean
  /** Owner user id, for fetching the child's essentials (childEssentials). */
  ownerUserId: string
}

/** The capability flags an owner can grant/withhold (excludes meta keys). */
export const CAPABILITY: Record<Uppercase<CaregiverCapability>, CaregiverCapability> = {
  VIEW: 'view',
  LOG_ACTIVITY: 'log_activity',
  CHAT: 'chat',
  EDIT_CHILD: 'edit_child',
  EMERGENCY: 'emergency',
}

/** True when the active relationship is a non-owner caregiver (nanny/family). */
export function isCaregiver(child: ChildWithRole | null | undefined): boolean {
  return !!child && child.caregiverRole !== 'parent'
}

/**
 * Whether the current relationship grants `flag` for this child.
 *
 * - null/undefined child → false (no crash, no access)
 * - owner (parent) → true for every capability
 * - paused caregiver → false for every capability (mirrors the RLS `_paused` gate)
 * - otherwise → the boolean value of the flag in the permissions JSONB
 */
export function hasCapability(
  child: ChildWithRole | null | undefined,
  flag: CaregiverCapability,
): boolean {
  if (!child) return false
  if (child.caregiverRole === 'parent') return true

  const perms = child.permissions
  if (!perms) return false
  if (perms._paused === true) return false

  return perms[flag] === true
}

/**
 * The set of home card ids a caregiver's surface should render for `behavior`.
 * UX-only (RLS still gates the underlying data). Owner → all; paused → none;
 * else the explicit `_shared_cards` allowlist, or role defaults when absent.
 */
export function visibleCards(
  child: ChildWithRole | null | undefined,
  behavior: CaregiverBehavior,
): Set<string> {
  if (!child) return new Set()
  if (child.caregiverRole === 'parent') {
    return new Set(CAREGIVER_CARDS[behavior].map((c) => c.id))
  }
  const perms = child.permissions
  if (!perms || perms._paused === true) return new Set()
  const explicit = perms._shared_cards?.[behavior]
  return new Set(explicit ?? roleDefaultCards(behavior, child.caregiverRole))
}
