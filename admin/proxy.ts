import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

/**
 * Clerk gate — the security boundary for the whole command center.
 *
 * PUBLIC (no Clerk session required):
 *   - /sign-in        the only auth entry point (no public sign-up — invite/allowlist only)
 *   - /api/health     exposes only a count, no PII; used for uptime probes
 *   - /api/inngest    server-to-server; self-verified via Inngest signing key, no Clerk cookie
 *   - /api/cron       server-to-server; self-verified via CRON_SECRET bearer, no Clerk cookie
 *
 * Everything else requires a signed-in Clerk user. Role/allowlist enforcement
 * layers on top of this at the tRPC layer (server/trpc.ts) — this gate only
 * answers "is someone signed in?".
 */
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/api/health",
  "/api/inngest(.*)",
  "/api/cron(.*)",
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next internals + static assets; run on everything else.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API/tRPC routes.
    "/(api|trpc)(.*)",
  ],
}
