import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import { makeRedirectUri } from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from './supabase'
import { parseOAuthReturn } from './authRedirect'
import { Platform } from 'react-native'

WebBrowser.maybeCompleteAuthSession()

const SIGN_IN_CANCELLED = 'auth/sign-in-cancelled'

/**
 * True when the user backed out of the Apple / Google sheet (or declined on Google's consent page):
 * the screens stay quiet instead of alerting "Sign-in error".
 */
export function isSignInCancelled(e: unknown): boolean {
  const err = (e ?? {}) as { code?: string; message?: string }
  return err.code === 'ERR_REQUEST_CANCELED' || err.code === 'ERR_CANCELED' || err.message === SIGN_IN_CANCELLED
}

function bytesToHex(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0')
  }
  return out
}

/**
 * Sign in with Apple.
 * Apple's OIDC nonce binding requires the SHA-256 hash of the raw nonce to be
 * embedded in the Apple identity token, and the raw nonce passed to Supabase
 * for verification. We pass the hashed nonce via `nonce` (Apple embeds its hash
 * in the JWT); Supabase then verifies the raw nonce we hand it against that.
 * Previously this was sent via `state`, which Apple echoes back unmodified and
 * does NOT embed in the token — so replay protection was never actually enforced.
 */
export async function signInWithApple() {
  const rawNonce = bytesToHex(Crypto.getRandomBytes(32))
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  )

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  })

  if (!credential.identityToken) {
    throw new Error('No identity token returned from Apple')
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  })

  if (error) throw error
  return data
}

/**
 * Sign in with Google via Supabase OAuth (PKCE flow).
 * Exchanges the authorization code returned in the callback URL for a session.
 */
export async function signInWithGoogle() {
  const redirectUrl = makeRedirectUri({
    scheme: 'grandma-app',
    path: 'auth/callback',
  })

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  })

  if (error) throw error
  if (!data.url) throw new Error('No OAuth URL returned')

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
    preferEphemeralSession: true,
    showInRecents: false,
  })

  // cancel / dismiss, or 'locked' (another auth sheet already open — a double tap).
  if (result.type !== 'success' || !result.url) throw new Error(SIGN_IN_CANCELLED)

  const ret = parseOAuthReturn(result.url)
  if (!ret) throw new Error('Google sign-in returned no usable credentials')
  if (ret.kind === 'cancelled') throw new Error(SIGN_IN_CANCELLED)
  if (ret.kind === 'error') throw Object.assign(new Error(ret.description ?? 'Google sign-in failed'), { code: ret.code ?? undefined })

  const { data: sessionData, error: sessionError } =
    ret.kind === 'code'
      ? await supabase.auth.exchangeCodeForSession(ret.code)
      : await supabase.auth.setSession({ access_token: ret.accessToken, refresh_token: ret.refreshToken })
  if (sessionError) throw sessionError
  return sessionData
}

/**
 * Check if Apple Sign-In is available on this device.
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false
  return await AppleAuthentication.isAvailableAsync()
}
