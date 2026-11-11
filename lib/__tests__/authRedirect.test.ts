import { parseAuthRedirect, parseOAuthReturn } from '../authRedirect'

describe('parseAuthRedirect', () => {
  it('reads the implicit-flow recovery tokens from the reset link fragment', () => {
    const r = parseAuthRedirect(
      'grandma-app://auth/reset#access_token=AT&expires_in=3600&refresh_token=RT&token_type=bearer&type=recovery',
    )
    expect(r).toEqual({ kind: 'session', accessToken: 'AT', refreshToken: 'RT', type: 'recovery', isRecovery: true })
  })

  it('reads a token-hash recovery link', () => {
    expect(parseAuthRedirect('grandma-app://auth/reset?token_hash=abc&type=recovery')).toEqual({
      kind: 'otp', tokenHash: 'abc', type: 'recovery', isRecovery: true,
    })
  })

  it('reads a PKCE code on the reset path', () => {
    expect(parseAuthRedirect('grandma-app://auth/reset?code=xyz')).toEqual({ kind: 'code', code: 'xyz', isRecovery: true })
  })

  it('reports an expired reset link as an error', () => {
    const r = parseAuthRedirect(
      'grandma-app://auth/reset#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
    )
    expect(r).toEqual({
      kind: 'error', code: 'otp_expired', description: 'Email link is invalid or has expired', isRecovery: true,
    })
  })

  it('treats a signup confirmation with tokens as a normal (non-recovery) session', () => {
    const r = parseAuthRedirect('grandma-app://#access_token=AT&refresh_token=RT&type=signup')
    expect(r).toMatchObject({ kind: 'session', type: 'signup', isRecovery: false })
  })

  it('leaves the Google OAuth callback to auth-providers', () => {
    expect(parseAuthRedirect('grandma-app://auth/callback?code=xyz')).toBeNull()
    expect(parseAuthRedirect('grandma-app://auth/callback#access_token=AT&refresh_token=RT')).toBeNull()
  })

  it('ignores ordinary deep links', () => {
    expect(parseAuthRedirect(null)).toBeNull()
    expect(parseAuthRedirect('grandma-app://accept-invite?token=abc')).toBeNull()
    expect(parseAuthRedirect('grandma-app://log/cycle?code=abc')).toBeNull()
  })
})

describe('parseOAuthReturn', () => {
  it('reads a PKCE code', () => {
    expect(parseOAuthReturn('grandma-app://auth/callback?code=xyz')).toEqual({ kind: 'code', code: 'xyz' })
  })

  it('reads implicit-flow tokens from the fragment', () => {
    expect(parseOAuthReturn('grandma-app://auth/callback#access_token=AT&refresh_token=RT&expires_in=3600')).toEqual({
      kind: 'session', accessToken: 'AT', refreshToken: 'RT',
    })
  })

  it('treats the user declining on the Google consent page as a cancel', () => {
    expect(parseOAuthReturn('grandma-app://auth/callback?error=access_denied&error_description=The+user+denied')).toEqual({ kind: 'cancelled' })
  })

  it('surfaces a provider/server error with its code', () => {
    expect(
      parseOAuthReturn('grandma-app://auth/callback#error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code'),
    ).toEqual({ kind: 'error', code: 'unexpected_failure', description: 'Unable to exchange external code' })
  })

  it('returns null when nothing usable came back', () => {
    expect(parseOAuthReturn('grandma-app://auth/callback')).toBeNull()
  })
})
