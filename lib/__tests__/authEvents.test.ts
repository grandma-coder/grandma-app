import { authEventLoads } from '../authEvents'

const base = { uid: 'u1', loadedUid: null, inFlightUid: null, sawInitialSession: true, recovering: false }

describe('authEventLoads', () => {
  it('loads on cold start and on a real sign-in', () => {
    expect(authEventLoads('INITIAL_SESSION', { ...base, sawInitialSession: false })).toBe(true)
    expect(authEventLoads('SIGNED_IN', base)).toBe(true)
  })

  it('skips the premature SIGNED_IN before INITIAL_SESSION and duplicates already loading', () => {
    expect(authEventLoads('SIGNED_IN', { ...base, sawInitialSession: false })).toBe(false)
    expect(authEventLoads('SIGNED_IN', { ...base, inFlightUid: 'u1' })).toBe(false)
  })

  it('does NOT reload (and blank the app) when the signed-in user changes their password or email', () => {
    expect(authEventLoads('USER_UPDATED', { ...base, loadedUid: 'u1' })).toBe(false)
  })

  it('does NOT load the account during a password-recovery session', () => {
    expect(authEventLoads('USER_UPDATED', { ...base, loadedUid: 'other', recovering: true })).toBe(false)
    expect(authEventLoads('TOKEN_REFRESHED', { ...base, recovering: true })).toBe(false)
  })

  it('heals a cold start that came up signed-out offline once the token refreshes', () => {
    expect(authEventLoads('TOKEN_REFRESHED', { ...base, loadedUid: null })).toBe(true)
    expect(authEventLoads('TOKEN_REFRESHED', { ...base, loadedUid: 'u1' })).toBe(false)
  })
})
