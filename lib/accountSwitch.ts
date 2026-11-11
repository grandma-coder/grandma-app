import AsyncStorage from '@react-native-async-storage/async-storage'

const LAST_ACCOUNT_KEY = 'grandma-last-account'

type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
}

/**
 * Record `uid` as the account this device's local data belongs to. Resolves true when a DIFFERENT
 * account was recorded before — its journeys, due date, children, PIN and reminders are still in
 * the local stores (the session ended without signOut(): expired/revoked token, global sign-out
 * from another phone) and must be cleared before this account's data loads.
 *
 * Never wipes when unsure: nothing recorded yet (first boot after updating) or unreadable storage.
 */
export async function claimDeviceAccount(uid: string, storage: KeyValueStorage = AsyncStorage): Promise<boolean> {
  let previous: string | null
  try {
    previous = await storage.getItem(LAST_ACCOUNT_KEY)
  } catch {
    return false
  }
  if (previous === uid) return false
  try {
    await storage.setItem(LAST_ACCOUNT_KEY, uid)
  } catch {
    // best-effort — next boot asks again
  }
  return previous !== null
}
