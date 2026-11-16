import { useEffect } from 'react'
import { router, useSegments } from 'expo-router'
import { useSubscriptionAccess } from '../../lib/useSubscriptionAccess'

interface Props {
  /** Signed in with a usable session (not mid password recovery). */
  signedIn: boolean
  /** Finished onboarding — the paywall shows after it, never during it. */
  onboarded: boolean
}

// Screens a never-subscribed account may still be on: sign-in/onboarding flows,
// the invite accept flow (caregivers are covered by their payer), the gate itself,
// the app lock, and dev tools.
const EXEMPT = new Set(['(auth)', 'auth', 'onboarding', 'accept-invite', 'subscribe', 'lock', 'dev-panel'])

/**
 * Hard paywall: an account that never started a trial/subscription only sees
 * /subscribe. Lapsed accounts are NOT sent here — they stay in the app read-only
 * (see useIsReadOnly). Rendered inside QueryClientProvider (the root guard isn't).
 */
export function PaywallGate({ signedIn, onboarded }: Props) {
  const access = useSubscriptionAccess()
  const segments = useSegments()
  const first = segments[0] as string | undefined

  useEffect(() => {
    if (!signedIn || !onboarded || access === undefined) return
    if (access === 'none' && !EXEMPT.has(first ?? '')) {
      router.replace('/subscribe' as never)
    } else if (access !== 'none' && first === 'subscribe') {
      router.replace('/(tabs)')
    }
  }, [signedIn, onboarded, access, first])

  return null
}
