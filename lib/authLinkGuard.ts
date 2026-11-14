import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Email auth links (sign-up confirmation, password reset) arrive on the custom
 * `grandma-app://` scheme, which any web page or app can open. A link carrying
 * someone else's session tokens (or their own token_hash) would silently sign
 * this device into the attacker's account — session fixation: whatever the user
 * logs next lands in an account the attacker controls.
 *
 * So a session/otp link is only honoured if THIS device asked for an auth email
 * recently. PKCE `code` links are safe on their own (they need the locally stored
 * verifier) and don't go through this guard.
 */
const KEY = 'auth-email-link-requested-at'
const TTL_MS = 24 * 60 * 60 * 1000

/** Call right before asking Supabase to send a sign-up / reset / resend email. */
export async function markAuthEmailRequested(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, String(Date.now()))
  } catch {
    // Non-fatal: worst case the link is refused and the user signs in manually.
  }
}

/** True (and clears the marker) if an auth email was requested on this device within the TTL. */
export async function consumeAuthEmailRequest(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return false
    const at = Number(raw)
    const fresh = Number.isFinite(at) && Date.now() - at < TTL_MS
    if (fresh) await AsyncStorage.removeItem(KEY)
    return fresh
  } catch {
    return false
  }
}
