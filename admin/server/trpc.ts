import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import { ZodError } from "zod"
import type { Context } from "./context"

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

// ─── Gates ───────────────────────────────────────────────────────────────────

/** Signed in AND on the team allowlist. Viewer-level and up. */
const isAllowedUser = t.middleware(({ ctx, next }) => {
  if (!ctx.userId || !ctx.allowed) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not signed in or not on the team allowlist" })
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } })
})

/** Admin only — everything requiring the admin role. */
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.userId || !ctx.allowed) throw new TRPCError({ code: "UNAUTHORIZED" })
  if (ctx.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" })
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } })
})

/** Any allowlisted user (viewer or admin) — metrics, user counts/segments. */
export const protectedProcedure = t.procedure.use(isAllowedUser)

/** Admin-only. */
export const adminProcedure = t.procedure.use(isAdmin)

/**
 * PII step-up — admin only. Reading a user's personal detail (health, children,
 * prefs) goes through this so it can be role-gated AND audit-logged at the call
 * site. Distinct name from adminProcedure so the intent ("this touches PII") is
 * explicit at every usage.
 */
export const piiProcedure = t.procedure.use(isAdmin)

/**
 * Send step-up — admin only. Composing/sending push (an outward action that
 * reaches real users' devices) goes through this. Same gate as admin today;
 * kept separate so a future finer policy (e.g. a second confirmation) has one
 * place to live.
 */
export const sendProcedure = t.procedure.use(isAdmin)
