import "server-only"

/**
 * Team membership check.
 *
 * Clerk is the source of truth for the team: a person is on the team if they're
 * a Clerk user of THIS app who was invited (invites stamp a role onto their
 * account). So membership = "Clerk says you're a real signed-in user AND you
 * carry a role." Admins add people from the Admin panel — no env edit, no
 * redeploy.
 *
 * CLERK_ALLOWED_EMAILS is now an OPTIONAL hard override/backstop:
 *   - If it's set, only those emails get in (a strict lockdown mode).
 *   - If it's empty (the default), anyone Clerk lets in who carries a role is
 *     allowed — i.e. the roster is managed entirely from the Admin panel.
 *
 * Matching is case-insensitive and whitespace-tolerant.
 */
function parseAllowed(): Set<string> {
  const raw = process.env.CLERK_ALLOWED_EMAILS ?? ""
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
}

/**
 * @param email    the signed-in user's email
 * @param hasRole  whether Clerk publicMetadata.role is set (i.e. they were
 *                 invited / provisioned through the Admin panel)
 */
export function isAllowed(email: string | null | undefined, hasRole = false): boolean {
  if (!email) return false
  const allowlist = parseAllowed()

  // Strict lockdown mode: an explicit env allowlist is the only door.
  if (allowlist.size > 0) {
    return allowlist.has(email.trim().toLowerCase())
  }

  // Clerk-managed mode (default): in if they carry a role.
  return hasRole
}
