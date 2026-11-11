/**
 * Parse an email-link redirect (password reset, email confirmation) that opened the app.
 *
 * The Supabase client runs with detectSessionInUrl: false (React Native has no window.location),
 * so nothing picks these links up on its own: the reset email's grandma-app://auth/reset#… link
 * opened an unmatched route and the user never reached the new-password screen. The root layout
 * feeds every incoming URL through here and establishes the session itself.
 *
 * Shapes Supabase can send:
 *   implicit flow  …#access_token=…&refresh_token=…&type=recovery
 *   token hash     …?token_hash=…&type=recovery
 *   PKCE           …?code=…
 *   failure        …#error=access_denied&error_code=otp_expired&error_description=…
 *
 * The Google OAuth return (grandma-app://auth/callback) is NOT handled here: lib/auth-providers
 * exchanges that code itself, and exchanging it twice fails one of the two.
 */

export type AuthRedirect =
  | { kind: 'session'; accessToken: string; refreshToken: string; type: string | null; isRecovery: boolean }
  | { kind: 'otp'; tokenHash: string; type: string; isRecovery: boolean }
  | { kind: 'code'; code: string; isRecovery: boolean }
  | { kind: 'error'; code: string | null; description: string | null; isRecovery: boolean }

function readParams(raw: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const part of raw.split('&')) {
    if (!part) continue
    const eq = part.indexOf('=')
    const key = eq === -1 ? part : part.slice(0, eq)
    const value = eq === -1 ? '' : part.slice(eq + 1)
    try {
      out.set(decodeURIComponent(key), decodeURIComponent(value.replace(/\+/g, ' ')))
    } catch {
      out.set(key, value)
    }
  }
  return out
}

export function parseAuthRedirect(url: string | null | undefined): AuthRedirect | null {
  if (!url) return null
  const hashAt = url.indexOf('#')
  const beforeHash = hashAt === -1 ? url : url.slice(0, hashAt)
  const hash = hashAt === -1 ? '' : url.slice(hashAt + 1)
  const queryAt = beforeHash.indexOf('?')
  const path = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt)
  const query = queryAt === -1 ? '' : beforeHash.slice(queryAt + 1)

  if (/auth\/callback\/?$/.test(path)) return null

  const params = readParams(query)
  for (const [k, v] of readParams(hash)) params.set(k, v)

  const type = params.get('type') ?? null
  const isResetPath = /auth\/reset\/?$/.test(path)
  const isRecovery = type === 'recovery' || isResetPath

  const errorCode = params.get('error_code') ?? null
  const error = params.get('error') ?? null
  if (errorCode || (error && (isResetPath || type))) {
    return { kind: 'error', code: errorCode ?? error, description: params.get('error_description') ?? null, isRecovery }
  }

  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (accessToken && refreshToken) {
    return { kind: 'session', accessToken, refreshToken, type, isRecovery }
  }

  const tokenHash = params.get('token_hash')
  if (tokenHash && type) return { kind: 'otp', tokenHash, type, isRecovery }

  // A bare ?code= is only ours on the reset path — elsewhere it may be another flow's code.
  const code = params.get('code')
  if (code && isResetPath) return { kind: 'code', code, isRecovery }

  return null
}
