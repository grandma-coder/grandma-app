import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import { makeRedirectUri } from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from './supabase'
import { Platform } from 'react-native'

WebBrowser.maybeCompleteAuthSession()

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
 * embedded in the Apple request, and the raw nonce passed to Supabase for
 * verification. We send `state` as a workaround because expo-apple-authentication
 * does not expose a `nonce` field directly — Supabase compares the raw nonce
 * we pass against `nonce_supported`'s hash inside the JWT.
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
    state: hashedNonce,
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

  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in was cancelled')
  }

  const url = new URL(result.url)
  const code = url.searchParams.get('code')

  if (code) {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.exchangeCodeForSession(code)
    if (sessionError) throw sessionError
    return sessionData
  }

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')
  if (accessToken && refreshToken) {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
    if (sessionError) throw sessionError
    return sessionData
  }

  throw new Error('Google sign-in returned no usable credentials')
}

/**
 * Check if Apple Sign-In is available on this device.
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false
  return await AppleAuthentication.isAvailableAsync()
}
