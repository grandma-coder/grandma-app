/**
 * Which Supabase auth events make the root layout (re)load the account's data.
 *
 * - INITIAL_SESSION (cold start) and SIGNED_IN (sign-in, sign-up without email confirmation,
 *   OAuth return, email-confirm link) load.
 * - SIGNED_IN before the first INITIAL_SESSION is skipped: on cold boot it fires before the client
 *   can query and every request in that burst hangs.
 * - USER_UPDATED (password / email change) does NOT reload: same account, same data. Reloading
 *   re-showed the splash and unmounted the whole navigator, throwing the user off the screen they
 *   were on — and during a password reset it loaded the account behind the recovery session.
 * - TOKEN_REFRESHED loads only when nothing is loaded yet: a cold start offline with an expired
 *   access token fires INITIAL_SESSION with no session (the refresh failed), then the background
 *   refresh succeeds once the network is back — that account was never loaded.
 * - Nothing loads while a password-recovery session is open.
 */
export type AuthLoadState = {
  uid: string
  /** Account whose data is currently loaded (null after sign-out / before the first load). */
  loadedUid: string | null
  /** Account whose load is running right now. */
  inFlightUid: string | null
  sawInitialSession: boolean
  recovering: boolean
}

export function authEventLoads(event: string, s: AuthLoadState): boolean {
  if (s.recovering) return false
  if (s.inFlightUid === s.uid) return false
  switch (event) {
    case 'INITIAL_SESSION':
      return true
    case 'SIGNED_IN':
      return s.sawInitialSession
    case 'USER_UPDATED':
    case 'TOKEN_REFRESHED':
      return s.loadedUid !== s.uid
    default:
      return false
  }
}
