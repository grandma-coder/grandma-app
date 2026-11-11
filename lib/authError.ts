import { t } from './i18n'

/**
 * Translate a Supabase/OAuth auth error to a calm line in the user's language. Never returns raw English.
 *
 * Matches the error `code` first (auth-js ≥2.6 sends it), then the message for older servers and
 * for errors that only carry a message (email-link fragments, fetch failures). Unknown email and
 * wrong password both come back as invalid_credentials — keep it that way (no enumeration).
 */
export function authErrorText(e: unknown): string {
  const err = (e ?? {}) as { message?: string; code?: string; status?: number; name?: string; reasons?: unknown }
  const msg = (err.message ?? '').toLowerCase()
  const code = (err.code ?? '').toLowerCase()
  const reasons = Array.isArray(err.reasons) ? (err.reasons as string[]) : []

  if (code === 'invalid_credentials' || msg.includes('invalid login') || msg.includes('invalid credentials')) return t('auth_err_invalidCredentials')
  if (code === 'email_not_confirmed' || msg.includes('not confirmed')) return t('auth_err_emailNotConfirmed')
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered') || msg.includes('already been registered')) return t('auth_err_userExists')
  if (code === 'same_password' || msg.includes('different from the old password')) return t('auth_err_samePassword')
  if (code === 'weak_password' || msg.includes('password should') || msg.includes('weak password')) {
    // The project's password policy can require a character mix or reject leaked passwords —
    // "try a longer one" is wrong advice for those.
    if (reasons.includes('pwned')) return t('auth_err_pwnedPassword')
    if (reasons.includes('characters') || msg.includes('should contain')) return t('auth_err_weakPasswordChars')
    return t('auth_err_weakPassword')
  }
  if (code.includes('rate_limit') || err.status === 429 || msg.includes('rate limit') || msg.includes('too many') || msg.includes('security purposes')) return t('auth_err_rateLimit')
  if (code === 'otp_expired' || code === 'flow_state_expired' || code === 'flow_state_not_found' || msg.includes('link is invalid') || msg.includes('has expired') || msg.includes('expired or is invalid')) return t('auth_err_linkExpired')
  if (code === 'session_not_found' || code === 'session_expired' || code === 'refresh_token_not_found' || code === 'refresh_token_already_used' || err.name === 'AuthSessionMissingError' || msg.includes('session missing') || msg.includes('refresh token')) return t('auth_err_sessionExpired')
  if (code === 'email_address_invalid' || (msg.includes('email address') && msg.includes('invalid'))) return t('auth_invalidEmailMsg')
  if (err.name === 'AuthRetryableFetchError' || msg.includes('network') || msg.includes('fetch') || msg.includes('timeout') || msg.includes('timed out') || msg.includes('offline')) return t('error_network')
  return t('error_tryAgain')
}
