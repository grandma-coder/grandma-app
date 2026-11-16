/**
 * Subscription access model (hard paywall + 7-day trial, decided 2026-11-16):
 *
 *   open    — paywall feature flag off (beta): everything unlocked
 *   active  — trial or paid subscription, or a caregiver covered by their payer
 *   expired — had a trial/subscription that lapsed: READ-ONLY + export
 *             (we never hold someone's health history hostage)
 *   none    — never subscribed: only the paywall
 *
 * Pure so the rules are unit-tested; the hook lives in useSubscriptionAccess.ts.
 */
export type SubscriptionAccess = 'open' | 'active' | 'expired' | 'none'

export type ProfileTier = 'free' | 'premium_solo' | 'premium_family' | null

export interface AccessInputs {
  paywallOn: boolean
  /** Invited caregiver account (nanny / family / …) rather than a parent. */
  isCaregiverAccount: boolean
  /** caregiver_has_covered_access() — null when unknown (RPC failed). */
  caregiverCovered: boolean | null
  /** RevenueCat: an entitlement (incl. trial) is active. null = SDK unavailable. */
  rcActive: boolean | null
  /** RevenueCat: any entitlement ever existed (active or expired). null = SDK unavailable. */
  rcEverSubscribed: boolean | null
  /** profiles.subscription_tier, written only by revenuecat-webhook. */
  profileTier: ProfileTier
  /** profiles.subscription_event_ms is set → the webhook has seen this account before. */
  profileHadBilling: boolean
}

export function resolveAccess(i: AccessInputs): SubscriptionAccess {
  if (!i.paywallOn) return 'open'

  if (i.isCaregiverAccount) {
    // Covered by the payer's plan. Unknown → don't lock out on a network blip;
    // RLS still hides the child if the link really is locked.
    return i.caregiverCovered === false ? 'expired' : 'active'
  }

  if (i.rcActive === true) return 'active'
  if (i.profileTier === 'premium_solo' || i.profileTier === 'premium_family') return 'active'
  if (i.rcEverSubscribed === true || i.profileHadBilling) return 'expired'
  return 'none'
}
