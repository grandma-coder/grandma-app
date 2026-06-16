/**
 * Holds a caregiver invite token across the unauthenticated → authenticated
 * transition. When an unauthenticated user opens an invite link, accept-invite
 * redirects to /(auth)/welcome?invite=<token>. The auth screens stash the token
 * here; after sign-in the root layout consumes it and routes the user back to
 * /accept-invite?token=<token> instead of the normal home destination.
 *
 * Session-scoped module state is enough — the whole flow happens within one app
 * run (link tap → auth → accept). We deliberately don't persist to disk: a stale
 * token surviving an app kill would hijack an unrelated next launch.
 */

let pendingInviteToken: string | null = null

export function setPendingInvite(token: string | null | undefined) {
  pendingInviteToken = token && token.length > 0 ? token : null
}

export function consumePendingInvite(): string | null {
  const t = pendingInviteToken
  pendingInviteToken = null
  return t
}

export function hasPendingInvite(): boolean {
  return pendingInviteToken !== null
}
