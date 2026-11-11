import AsyncStorage from '@react-native-async-storage/async-storage'
import { Linking, Platform } from 'react-native'
import { supabase } from './supabase'
import { signOut } from './signOut'

/**
 * Keys that belong to the phone, not the account: kept when an account is deleted so the next
 * person on this device keeps their theme / language / units. Everything else in AsyncStorage is
 * per-account (stores, reminders, checklists, caches) and goes with the account.
 */
const DEVICE_KEYS = new Set([
  'grandma-theme',
  'grandma-language',
  'grandma-units',
  'grandma-agenda-view',
  'grandma-feature-flags',
  'grandma-push-preprompt',
  'grandma-last-account',
])

/** AsyncStorage keys to remove after the account is deleted (everything but device preferences). */
export function accountKeysToWipe(allKeys: readonly string[]): string[] {
  return allKeys.filter((k) => !DEVICE_KEYS.has(k))
}

type AuthLikeError = { status?: number; code?: string; message?: string } | null | undefined

/** The auth server no longer has this user (it was deleted) — not an offline / expired-token error. */
function isUserGone(error: AuthLikeError): boolean {
  if (!error) return false
  if (error.code === 'user_not_found') return true
  return (error.status === 403 || error.status === 404) && /does not exist|not found/i.test(error.message ?? '')
}

interface DeletionDeps {
  invoke: (name: string) => Promise<{ data: unknown; error: unknown }>
  getUser: () => Promise<{ data: { user: unknown }; error: AuthLikeError }>
}

const defaultDeps: DeletionDeps = {
  invoke: (name) => supabase.functions.invoke(name),
  getUser: () => supabase.auth.getUser() as unknown as ReturnType<DeletionDeps['getUser']>,
}

/**
 * Ask the server to delete the signed-in account. True only when the account is really gone: the
 * function confirmed `{ ok: true }`, or — when the reply was lost (timeout, dropped connection after
 * the server finished) — the auth server no longer knows the user. A lost reply used to leave a
 * deleted account signed in, failing every retry with "couldn't delete".
 */
export async function requestAccountDeletion(deps: DeletionDeps = defaultDeps): Promise<boolean> {
  try {
    const { data, error } = await deps.invoke('delete-account')
    if (!error && (data as { ok?: boolean } | null)?.ok === true) return true
  } catch {
    // fall through to the "is it actually gone?" check
  }
  try {
    const { error } = await deps.getUser()
    return isUserGone(error)
  } catch {
    return false
  }
}

/**
 * Delete the account, then leave nothing of it on the phone: every per-account AsyncStorage key
 * (local reminders, hospital-bag checklist, cached insight context…), the session, stores, PIN,
 * scheduled notifications and widgets (signOut). Resolves false when deletion failed — the caller
 * shows the error and the user stays signed in.
 */
export async function deleteMyAccount(): Promise<boolean> {
  const deleted = await requestAccountDeletion()
  if (!deleted) return false
  try {
    const keys = await AsyncStorage.getAllKeys()
    const wipe = accountKeysToWipe(keys)
    if (wipe.length) await AsyncStorage.multiRemove(wipe)
  } catch {
    // best-effort — signOut below still clears every user store
  }
  // 'local': the server already revoked every session when it deleted the user; a global sign-out
  // call would only fail against the deleted account.
  await signOut('local')
  return true
}

/** Where the store lets the user cancel a subscription — deleting the account does not cancel it. */
export const MANAGE_SUBSCRIPTIONS_URL = Platform.OS === 'android'
  ? 'https://play.google.com/store/account/subscriptions'
  : 'https://apps.apple.com/account/subscriptions'

export function openManageSubscriptions(): void {
  Linking.openURL(MANAGE_SUBSCRIPTIONS_URL).catch(() => {})
}
