import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import { makeRedirectUri } from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from './supabase'
import { Platform } from 'react-native'

WebBrowser.maybeCompleteAuthSession()

/**
 * Sign in with Apple.
 * Uses native Apple Authentication on iOS.
 * Returns the Supabase session on success.
 */
export async function signInWithApple() {
  const rawNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Crypto.getRandomBytes(32).toString()
  )

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
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
 * Sign in with Google.
 * Uses OAuth flow via Supabase.
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

  if (result.type === 'success' && result.url) {
    const url = new URL(result.url)
    const params = new URLSearchParams(url.hash.substring(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

      if (sessionError) throw sessionError
      return sessionData
    }
  }

  throw new Error('Google sign-in was cancelled or failed')
}

/**
 * Check if Apple Sign-In is available on this device.
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false
  return await AppleAuthentication.isAvailableAsync()
}
