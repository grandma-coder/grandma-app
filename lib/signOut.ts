import { router } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { supabase } from './supabase'
import { queryClient } from './queryClient'
import { resetUserStores, USER_STORE_PERSIST } from './resetUserStores'
import { clearPin } from './appLock'
import { cancelAllReminderNotifications } from './reminderNotifications'
import { cancelLocalNotification, cancelLocalSchedules, unregisterPushToken } from './pushNotifications'
import { PERIOD_REMINDER_ID } from './cycleReminders'
import { clearWidgets } from './widgets/publish'
import { logOutRevenueCat } from './revenue'

type Scope = 'local' | 'global'

/**
 * Single source of truth for signing out. Clears the React Query cache,
 * wipes and resets every Zustand store that holds user data (lib/resetUserStores —
 * theme, language and units are device preferences, left intact), and navigates to welcome.
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

let localSignOutHandler: (() => void) | null = null

/**
 * The root layout registers how it drops its session state. signOut() calls it itself: when
 * supabase.auth.signOut() fails or times out (offline, flaky network) no SIGNED_OUT event fires,
 * so the layout kept the old session while every store was reset — and its route guard sent this
 * "signed-in user with no journeys" into onboarding/consent instead of the welcome screen.
 */
export function registerLocalSignOutHandler(fn: (() => void) | null): void {
  localSignOutHandler = fn
}

/**
 * Remove everything this device holds for the signed-in account: query cache, every user-data
 * store (memory + disk), the app-lock PIN, scheduled local notifications and the home-screen
 * widgets. Used by signOut() and by the boot path when a different account signs in after a
 * session ended without signOut() (expired/revoked token).
 */
export async function clearLocalAccountData(): Promise<void> {
  queryClient.clear()

  // Wipe the persisted keys, then reset the live stores: clearing storage alone left the previous
  // user's state in memory, and the next write put it straight back (journeys, due date, consent,
  // PIN lock) for whoever signs in next on this phone.
  for (const store of USER_STORE_PERSIST) {
    const persistApi = (store as unknown as { persist?: { clearStorage: () => Promise<void> | void } }).persist
    if (persistApi?.clearStorage) await persistApi.clearStorage()
  }
  resetUserStores()
  await clearPin().catch(() => {})
  // Personal reminder alerts belong to the account: don't fire them for whoever signs in next.
  // They're rescheduled from the saved list when this user signs back in.
  await cancelAllReminderNotifications().catch(() => {})
  // Same for the daily log / weekly summary nudges and the period reminder (which
  // would otherwise announce this account's cycle on a shared phone).
  await cancelLocalSchedules().catch(() => {})
  await cancelLocalNotification(PERIOD_REMINDER_ID).catch(() => {})
  // Home-screen widgets and icon shortcuts: back to "Sign in to Grandma".
  await clearWidgets()
}

export async function signOut(scope: Scope = 'local'): Promise<void> {
  // Detach this phone from the account's remote push while the session can still authorize it.
  await Promise.race([
    unregisterPushToken(),
    new Promise<void>((resolve) => setTimeout(resolve, 3000)),
  ])

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

  // RevenueCat stays identified as this account until told otherwise — the next account signing in
  // on this phone would inherit its customer (and entitlements). Bounded like the calls above.
  await Promise.race([logOutRevenueCat(), new Promise<void>((resolve) => setTimeout(resolve, 3000))])

  await clearLocalAccountData()

  // Drop the root layout's session even if supabase never emitted SIGNED_OUT.
  localSignOutHandler?.()

  router.replace('/(auth)/welcome')
}
