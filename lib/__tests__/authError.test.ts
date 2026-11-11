import { authErrorText } from '../authError'
import { translations } from '../i18n'

const en = translations.en as unknown as Record<string, string>

describe('authErrorText', () => {
  it('maps credential and account errors by code and by message', () => {
    expect(authErrorText({ code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 })).toBe(en.auth_err_invalidCredentials)
    expect(authErrorText({ message: 'Invalid login credentials' })).toBe(en.auth_err_invalidCredentials)
    expect(authErrorText({ code: 'email_not_confirmed', message: 'Email not confirmed' })).toBe(en.auth_err_emailNotConfirmed)
    expect(authErrorText({ code: 'user_already_exists', message: 'User already registered' })).toBe(en.auth_err_userExists)
    expect(authErrorText({ code: 'email_exists' })).toBe(en.auth_err_userExists)
  })

  it('explains WHY a password was rejected (length vs character mix vs leaked)', () => {
    expect(authErrorText({ code: 'weak_password', reasons: ['length'], message: 'Password should be at least 8 characters.' })).toBe(en.auth_err_weakPassword)
    expect(authErrorText({ message: 'Password should be at least 6 characters.' })).toBe(en.auth_err_weakPassword)
    expect(authErrorText({ code: 'weak_password', reasons: ['characters'], message: 'Password should contain at least one character of each: abc…' })).toBe(en.auth_err_weakPasswordChars)
    expect(authErrorText({ code: 'weak_password', reasons: ['length', 'pwned'] })).toBe(en.auth_err_pwnedPassword)
  })

  it('maps every rate-limit shape Supabase sends', () => {
    expect(authErrorText({ code: 'over_email_send_rate_limit', status: 429 })).toBe(en.auth_err_rateLimit)
    expect(authErrorText({ code: 'over_request_rate_limit', status: 429 })).toBe(en.auth_err_rateLimit)
    expect(authErrorText({ message: 'For security purposes, you can only request this after 42 seconds.', status: 400 })).toBe(en.auth_err_rateLimit)
    expect(authErrorText({ message: 'Email rate limit exceeded' })).toBe(en.auth_err_rateLimit)
  })

  it('tells the user a new password must differ from the current one', () => {
    expect(authErrorText({ code: 'same_password', message: 'New password should be different from the old password.' })).toBe(en.auth_err_samePassword)
    expect(authErrorText({ message: 'New password should be different from the old password.' })).toBe(en.auth_err_samePassword)
  })

  it('reports expired / used email links as expired, not a generic retry', () => {
    expect(authErrorText({ code: 'otp_expired', message: 'Email link is invalid or has expired' })).toBe(en.auth_err_linkExpired)
    expect(authErrorText({ message: 'Email link is invalid or has expired' })).toBe(en.auth_err_linkExpired)
    expect(authErrorText({ message: 'Token has expired or is invalid' })).toBe(en.auth_err_linkExpired)
    expect(authErrorText({ code: 'flow_state_expired' })).toBe(en.auth_err_linkExpired)
  })

  it('reports a lost session (recovery session gone, refresh token revoked) as expired session', () => {
    expect(authErrorText({ code: 'session_not_found' })).toBe(en.auth_err_sessionExpired)
    expect(authErrorText({ name: 'AuthSessionMissingError', message: 'Auth session missing!' })).toBe(en.auth_err_sessionExpired)
    expect(authErrorText({ code: 'refresh_token_not_found', message: 'Invalid Refresh Token: Refresh Token Not Found' })).toBe(en.auth_err_sessionExpired)
  })

  it('maps a server-rejected address to the invalid-email copy', () => {
    expect(authErrorText({ code: 'email_address_invalid', message: 'Email address "a@example.com" is invalid' })).toBe(en.auth_invalidEmailMsg)
  })

  it('maps offline / timeout failures to the network line', () => {
    expect(authErrorText({ name: 'AuthRetryableFetchError', message: '', status: 0 })).toBe(en.error_network)
    expect(authErrorText({ message: 'Network request failed' })).toBe(en.error_network)
    expect(authErrorText({ message: 'The request timed out.' })).toBe(en.error_network)
    expect(authErrorText({ message: 'The Internet connection appears to be offline.' })).toBe(en.error_network)
  })

  it('never returns raw English for unknown errors', () => {
    expect(authErrorText({ message: 'Database error saving new user' })).toBe(en.error_tryAgain)
    expect(authErrorText(null)).toBe(en.error_tryAgain)
  })
})
