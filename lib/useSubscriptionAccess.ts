import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { getEntitlementState } from './revenue'
import { resolveAccess, type ProfileTier, type SubscriptionAccess } from './subscriptionAccess'
import { usePaywallEnabled, useFeatureFlags } from '../store/useFeatureFlags'
import { useCaregiverStore } from '../store/useCaregiverStore'

export const SUBSCRIPTION_ACCESS_KEY = ['subscription-access'] as const

async function fetchAccess(paywallOn: boolean, accountRole: string): Promise<SubscriptionAccess> {
  if (!paywallOn) return 'open'
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user.id
  if (!userId) return 'none'

  const isCaregiverAccount = accountRole !== 'parent'
  let caregiverCovered: boolean | null = null
  if (isCaregiverAccount) {
    const { data, error } = await supabase.rpc('caregiver_has_covered_access')
    caregiverCovered = error ? null : Boolean(data)
  }

  const [rc, profileRes] = await Promise.all([
    getEntitlementState(),
    supabase
      .from('profiles')
      .select('subscription_tier, subscription_event_ms')
      .eq('id', userId)
      .maybeSingle(),
  ])
  const profile = profileRes.data as { subscription_tier: ProfileTier; subscription_event_ms: number | null } | null

  return resolveAccess({
    paywallOn,
    isCaregiverAccount,
    caregiverCovered,
    rcActive: rc ? rc.active : null,
    rcEverSubscribed: rc ? rc.ever : null,
    profileTier: profile?.subscription_tier ?? null,
    profileHadBilling: profile?.subscription_event_ms != null,
  })
}

/**
 * The signed-in account's access under the hard paywall. `undefined` while
 * loading — callers must not gate on it until it resolves.
 */
export function useSubscriptionAccess(): SubscriptionAccess | undefined {
  const paywallOn = usePaywallEnabled()
  const accountRole = useCaregiverStore((s) => s.accountRole)
  const devOverride = useFeatureFlags((s) => s.devAccessOverride)
  const { data } = useQuery({
    queryKey: [...SUBSCRIPTION_ACCESS_KEY, paywallOn, accountRole],
    queryFn: () => fetchAccess(paywallOn, accountRole),
    staleTime: 60_000,
  })
  if (__DEV__ && devOverride) return devOverride
  return data
}

/** Expired trial/subscription → logs are view-only (history + export stay available). */
export function useIsReadOnly(): boolean {
  return useSubscriptionAccess() === 'expired'
}

/** Call after a purchase / restore so the gate re-evaluates immediately. */
export function useRefreshSubscriptionAccess(): () => Promise<void> {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: SUBSCRIPTION_ACCESS_KEY })
}
