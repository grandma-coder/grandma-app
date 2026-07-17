import "server-only"

/**
 * Team-email allowlist — defense-in-depth on top of the Clerk gate.
 *
 * Even if someone authenticates with Clerk, they only reach the console if their
 * email is on CLERK_ALLOWED_EMAILS (comma-separated). This is the second half of
 * the security boundary: Clerk answers "are you a real signed-in user?", the
 * allowlist answers "are you one of OUR people?".
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

export function isAllowed(email: string | null | undefined): boolean {
  if (!email) return false
  return parseAllowed().has(email.trim().toLowerCase())
}
