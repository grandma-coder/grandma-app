import { t } from './i18n'

/** Translate a Supabase/OAuth auth error to a calm line in the user's language. Never returns raw English. */
export function authErrorText(e: unknown): string {
  const err = (e ?? {}) as { message?: string; code?: string; status?: number }
  const msg = (err.message ?? '').toLowerCase()
  const code = (err.code ?? '').toLowerCase()
  if (code === 'invalid_credentials' || msg.includes('invalid login') || msg.includes('invalid credentials')) return t('auth_err_invalidCredentials')
  if (code === 'email_not_confirmed' || msg.includes('not confirmed')) return t('auth_err_emailNotConfirmed')
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered') || msg.includes('already been registered')) return t('auth_err_userExists')
  if (code === 'weak_password' || msg.includes('password should be') || msg.includes('weak password')) return t('auth_err_weakPassword')
  if (code.includes('rate_limit') || err.status === 429 || msg.includes('rate limit') || msg.includes('too many')) return t('auth_err_rateLimit')
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout') || msg.includes('offline')) return t('error_network')
  return t('error_tryAgain')
}
