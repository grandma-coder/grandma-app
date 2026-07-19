import "server-only"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { isAllowed } from "@/lib/allowlist"

export type Role = "admin" | "viewer"

export interface Context {
  userId: string | null
  userEmail: string | null
  role: Role | null
  /** True only when signed in AND on the team allowlist. */
  allowed: boolean
}

/**
 * Builds the tRPC request context from the Clerk session.
 *
 * Role is resolved LIVE from Clerk's API (not the cached JWT claim) so an admin
 * changing someone's role takes effect on the very next request — the security
 * gate must never lag behind a revocation. Cost is one Clerk lookup per request;
 * the correctness win is worth it for an internal PII console.
 *
 * `allowed` is the real door: a signed-in user whose email isn't on
 * CLERK_ALLOWED_EMAILS gets `allowed:false` and is treated as unauthenticated by
 * every protected procedure.
 */
export async function createContext(): Promise<Context> {
  const { userId } = await auth()
  if (!userId) {
    return { userId: null, userEmail: null, role: null, allowed: false }
  }

  const client = await clerkClient()
  const user = await client.users.getUser(userId).catch(() => null)
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null

  // Role is stamped by an invite / the Admin panel. Its presence is what marks
  // someone as a real team member in Clerk-managed mode.
  const metaRole = (user?.publicMetadata as { role?: Role } | undefined)?.role
  const allowed = isAllowed(email, Boolean(metaRole))
  const role: Role | null = allowed ? metaRole ?? "viewer" : null

  return { userId, userEmail: email, role, allowed }
}
