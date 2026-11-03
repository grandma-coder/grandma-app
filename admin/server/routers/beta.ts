import { z } from "zod"
import { eq, sql } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { router, adminProcedure } from "../trpc"
import { db } from "@/db"
import { betaTesters } from "@/db/schema"
import { writeAudit } from "@/lib/audit"

export interface BetaTesterRow {
  id: string
  email: string
  name: string | null
  platform: string
  note: string | null
  invitedAt: string | null
  signedUp: boolean
  userId: string | null
  tier: string | null
  lastActive: string | null
}

/**
 * Beta testers — a lightweight roster of people invited to test the mobile app.
 * Admin-only. This tracks WHO you invited; it does not distribute the app build
 * (that's TestFlight / Play Console) nor create an app account. Signup status is
 * matched live against auth.users/profiles by email, so it's always current.
 */
export const betaRouter = router({
  /** Roster with live signup status + tier + last-active, newest first. */
  list: adminProcedure.query(async () => {
    const res = await db.execute<{
      id: string
      email: string
      name: string | null
      platform: string
      note: string | null
      invited_at: string | null
      signed_up: boolean
      user_id: string | null
      tier: string | null
      last_active: string | null
    }>(sql`
      with activity as (
        select user_id, created_at from child_logs
        union all select user_id, created_at from cycle_logs
        union all select user_id, created_at from pregnancy_logs
      )
      select bt.id, bt.email, bt.name, bt.platform, bt.note, bt.invited_at,
        (au.id is not null) as signed_up,
        au.id as user_id,
        p.subscription_tier::text as tier,
        (select max(a.created_at) from activity a where a.user_id = au.id) as last_active
      from beta_testers bt
      left join auth.users au on lower(au.email) = lower(bt.email)
      left join profiles p on p.id = au.id
      order by bt.invited_at desc
    `)
    return Array.from(res).map(
      (r): BetaTesterRow => ({
        id: r.id,
        email: r.email,
        name: r.name,
        platform: r.platform,
        note: r.note,
        invitedAt: r.invited_at,
        signedUp: Boolean(r.signed_up),
        userId: r.user_id,
        tier: r.tier,
        lastActive: r.last_active,
      }),
    )
  }),

  /** Add a tester to the roster (record only — send the store invite separately). */
  add: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().max(120).optional(),
        platform: z.enum(["ios", "android", "both"]).default("both"),
        note: z.string().max(300).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [row] = await db
          .insert(betaTesters)
          .values({
            email: input.email.trim().toLowerCase(),
            name: input.name ?? null,
            platform: input.platform,
            note: input.note ?? null,
            invitedBy: ctx.userEmail ?? "unknown",
          })
          .returning()
        await writeAudit({ actorEmail: ctx.userEmail ?? "unknown", action: "beta.tester.add", target: input.email })
        return row
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That email is already on the beta list." })
      }
    }),

  /** Remove a tester from the roster (does not touch their app account). */
  remove: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await db.select().from(betaTesters).where(eq(betaTesters.id, input.id))
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Not found" })
    await db.delete(betaTesters).where(eq(betaTesters.id, input.id))
    await writeAudit({ actorEmail: ctx.userEmail ?? "unknown", action: "beta.tester.remove", target: row.email })
    return { ok: true }
  }),
})
