import { router } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { supabase } from './supabase'
import { queryClient } from './queryClient'
import { useModeStore } from '../store/useModeStore'
import { useBehaviorStore } from '../store/useBehaviorStore'
import { useJourneyStore } from '../store/useJourneyStore'
import { useCaregiverStore } from '../store/useCaregiverStore'
import { usePregnancyStore } from '../store/usePregnancyStore'
import { useBadgeStore } from '../store/useBadgeStore'
import { useGoalsStore } from '../store/useGoalsStore'
import { useGrandmaHistoryStore } from '../store/useGrandmaHistoryStore'
import { useChildStore } from '../store/useChildStore'
import { useChatStore } from '../store/useChatStore'
import { useFoodStore } from '../store/useFoodStore'
import { useVaultStore } from '../store/useVaultStore'
import { useEmergencyInsuranceStore } from '../store/useEmergencyInsuranceStore'
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
/**
 * Brute-force clear the Supabase auth keys from SecureStore. Used as a
 * last-resort cleanup when the regular signOut() can't reach the network
 * — the supabase-js token refresh loop can hang on a flaky connection
 * and leave the user in a "can't sign out" purgatory.
 */
async function forceClearAuthStorage(): Promise<void> {
  // Supabase-js stores the session under a key prefixed with the project ref
  // (e.g. "sb-<ref>-auth-token"). We don't know the ref at runtime, but
  // the chunked-storage adapter we use writes a "<key>__chunks" marker
  // alongside each chunk. Best-effort: enumerate the known shapes.
  const candidateKeys = [
    'supabase.auth.token',
    'sb-auth-token',
  ]
  // Also try project-prefixed shape from env URL
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
  const ref = url.match(/https?:\/\/([^.]+)\./)?.[1]
  if (ref) candidateKeys.push(`sb-${ref}-auth-token`)

  for (const key of candidateKeys) {
    try {
      // Clear chunked + non-chunked variants
      const countStr = await SecureStore.getItemAsync(`${key}__chunks`)
      if (countStr) {
        const count = parseInt(countStr, 10)
        if (Number.isFinite(count) && count > 0) {
          for (let i = 0; i < count; i++) {
            await SecureStore.deleteItemAsync(`${key}__${i}`)
          }
        }
        await SecureStore.deleteItemAsync(`${key}__chunks`)
      }
      await SecureStore.deleteItemAsync(key)
    } catch {
      // ignore — best-effort
    }
  }
}

export async function signOut(scope: Scope = 'local'): Promise<void> {
  // supabase.auth.signOut() can hang on a flaky network because it tries
  // to invalidate the session server-side. Race it against a 4s timeout
  // so the user can always sign out, then brute-force the storage.
  try {
    await Promise.race([
      supabase.auth.signOut({ scope }),
      new Promise<void>((resolve) => setTimeout(resolve, 4000)),
    ])
  } catch (e) {
    console.warn('[signOut] supabase.auth.signOut failed (will force-clear):', e)
  }

  // Always clear the stored token even if the network call failed.
  await forceClearAuthStorage()

  queryClient.clear()

  const persisted = [
    useModeStore,
    useBehaviorStore,
    useJourneyStore,
    useCaregiverStore,
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
