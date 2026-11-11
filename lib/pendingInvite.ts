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

/**
 * Why accepting an invite failed, in terms the invitee can act on (ask for a new link, switch
 * account…). Matches the accept-invite edge function's error strings; anything else is generic.
 */
export type InviteErrorKind = 'expired' | 'wrongAccount' | 'used' | 'invalid' | 'generic'

export function inviteErrorKind(message: string | null | undefined): InviteErrorKind {
  const m = (message ?? '').toLowerCase()
  if (m.includes('expired')) return 'expired'
  if (m.includes('different email')) return 'wrongAccount'
  if (m.includes('already been accepted')) return 'used'
  if (m.includes('revoked') || m.includes('invite not found')) return 'invalid'
  return 'generic'
}

/**
 * supabase.functions.invoke reports a non-2xx as a generic "non-2xx status code" error and hides
 * the function's own `{ error }` body in `error.context`. Dig it out; fall back to the message.
 */
export async function functionErrorMessage(error: unknown): Promise<string> {
  const fallback = (error as { message?: string } | null)?.message ?? ''
  try {
    const ctx = (error as { context?: { json?: () => Promise<{ error?: unknown }> } } | null)?.context
    const body = typeof ctx?.json === 'function' ? await ctx.json() : null
    return typeof body?.error === 'string' ? body.error : fallback
  } catch {
    return fallback
  }
}
