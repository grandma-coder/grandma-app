import { router } from 'expo-router'
import { supabase } from './supabase'
import { queryClient } from './queryClient'
import { useModeStore } from '../store/useModeStore'
import { useBehaviorStore } from '../store/useBehaviorStore'
import { useJourneyStore } from '../store/useJourneyStore'
import { usePregnancyStore } from '../store/usePregnancyStore'
import { useBadgeStore } from '../store/useBadgeStore'
import { useGoalsStore } from '../store/useGoalsStore'
import { useGrandmaHistoryStore } from '../store/useGrandmaHistoryStore'
import { useChildStore } from '../store/useChildStore'
import { useChatStore } from '../store/useChatStore'
import { useFoodStore } from '../store/useFoodStore'
import { useVaultStore } from '../store/useVaultStore'
import { useEmergencyInsuranceStore } from '../store/useEmergencyInsuranceStore'
import { useExchangeStore } from '../store/useExchangeStore'
import { useChannelsStore } from '../store/useChannelsStore'
import { useOnboardingStore } from '../store/useOnboardingStore'
import { useCycleOnboardingStore } from '../store/useCycleOnboardingStore'
import { usePregnancyOnboardingStore } from '../store/usePregnancyOnboardingStore'
import { useKidsOnboardingStore } from '../store/useKidsOnboardingStore'

type Scope = 'local' | 'global'

/**
 * Single source of truth for signing out. Clears the React Query cache,
 * wipes every persisted Zustand store that holds user data (theme + language
 * are preferences, not data — left intact), and navigates to welcome.
 *
 * Theme and language are intentionally preserved: a user signing out on a
 * shared device should not see the next user's preferred language reset.
 */
export async function signOut(scope: Scope = 'local'): Promise<void> {
  await supabase.auth.signOut({ scope })

  queryClient.clear()

  const persisted = [
    useModeStore,
    useBehaviorStore,
    useJourneyStore,
    usePregnancyStore,
    useBadgeStore,
    useGoalsStore,
    useGrandmaHistoryStore,
  ]
  for (const store of persisted) {
    const persistApi = (store as unknown as { persist?: { clearStorage: () => Promise<void> | void } }).persist
    if (persistApi?.clearStorage) {
      await persistApi.clearStorage()
    }
  }

  const inMemory = [
    useChildStore,
    useChatStore,
    useFoodStore,
    useVaultStore,
    useEmergencyInsuranceStore,
    useExchangeStore,
    useChannelsStore,
    useOnboardingStore,
    useCycleOnboardingStore,
    usePregnancyOnboardingStore,
    useKidsOnboardingStore,
  ]
  for (const store of inMemory) {
    const initial = (store as unknown as { getInitialState?: () => unknown }).getInitialState?.()
    if (initial) {
      ;(store as unknown as { setState: (s: unknown, replace: true) => void }).setState(initial, true)
    }
  }

  router.replace('/(auth)/welcome')
}
