import { z } from "zod"
import { eq, and, desc, sql } from "drizzle-orm"
import { router, protectedProcedure, adminProcedure } from "../trpc"
import { db } from "@/db"
import { supportTickets, SUPPORT_STATUSES } from "@/db/schema"
import { writeAudit } from "@/lib/audit"

/**
 * Support inbox — user-reported feedback/bugs/questions/reviews. Viewer+ can
 * read + triage counts; mutating a ticket (status, assignee, notes, reply) is
 * admin + audited. The app writes tickets via an edge function (service-role);
 * this router never writes back to the user's device — a "reply" here just
 * records what was sent for the audit trail.
 */
export const supportRouter = router({
  /** Tickets, newest first, optionally filtered by status/kind. */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(SUPPORT_STATUSES).optional(),
        kind: z.enum(["feedback", "bug", "question", "review"]).optional(),
        limit: z.number().int().min(1).max(200).default(100),
      }),
    )
    .query(async ({ input }) => {
      const conds = [
        input.status ? eq(supportTickets.status, input.status) : undefined,
        input.kind ? eq(supportTickets.kind, input.kind) : undefined,
      ].filter(Boolean)
      const where = conds.length ? and(...(conds as NonNullable<(typeof conds)[number]>[])) : undefined
      return db.select().from(supportTickets).where(where).orderBy(desc(supportTickets.createdAt)).limit(input.limit)
    }),

  /** Ticket counts per status — drives the inbox tab badges. */
  counts: protectedProcedure.query(async () => {
    const res = await db.execute<{ status: string; n: number }>(sql`
      select status, count(*)::int as n from support_tickets group by status
    `)
    const out: Record<string, number> = { open: 0, in_progress: 0, resolved: 0, closed: 0 }
    for (const r of Array.from(res)) out[r.status] = Number(r.n)
    out.total = out.open + out.in_progress + out.resolved + out.closed
    return out
  }),

  /**
   * Triage a ticket — status / priority / assignee / internal notes / recorded
   * reply. Admin + audited. Sets resolved_at / replied_at as a side effect so
   * the timeline is accurate. Does NOT deliver the reply — that's an external
   * action; this records what was sent.
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(SUPPORT_STATUSES).optional(),
        priority: z.enum(["low", "normal", "high"]).optional(),
        assignee: z.string().max(160).nullable().optional(),
        adminNotes: z.string().max(4000).nullable().optional(),
        reply: z.string().max(4000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date()
      const values: Record<string, unknown> = { updatedAt: now }
      if (input.status !== undefined) {
        values.status = input.status
        if (input.status === "resolved" || input.status === "closed") values.resolvedAt = now
      }
      if (input.priority !== undefined) values.priority = input.priority
      if (input.assignee !== undefined) values.assignee = input.assignee?.trim() || null
      if (input.adminNotes !== undefined) values.adminNotes = input.adminNotes?.trim() || null
      if (input.reply !== undefined && input.reply?.trim()) {
        values.reply = input.reply.trim()
        values.repliedAt = now
      }

      const [row] = await db.update(supportTickets).set(values).where(eq(supportTickets.id, input.id)).returning()
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "support.ticket.update",
        target: input.id,
        meta: { status: input.status ?? null, replied: Boolean(input.reply?.trim()) },
      })
      return row
    }),
})
