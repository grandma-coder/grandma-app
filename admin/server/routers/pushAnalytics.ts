import { z } from "zod"
import { sql, eq, and, isNull, isNotNull } from "drizzle-orm"
import { router, protectedProcedure, adminProcedure, publicProcedure } from "../trpc"
import { db } from "@/db"
import { pushRecipients } from "@/db/schema"
import { getPushReceipts } from "@/lib/expo/get-receipts"
import { deactivateTokens } from "@/lib/expo/deactivate-tokens"
import { writeAudit } from "@/lib/audit"

/**
 * Notification analytics — closes the push loop. The send pipeline records
 * sent/failed per recipient; this adds delivered (Expo receipts) and opened
 * (app-reported taps), and exposes the per-campaign funnel. Reading is viewer+;
 * the receipt poll is admin (it writes recipient/campaign state + deactivates
 * dead tokens) + audited. markOpened is public — the app calls it via an edge
 * function on notification tap (unauthenticated recipient id, not sensitive).
 */
export const pushAnalyticsRouter = router({
  /**
   * Per-campaign funnel table: audience → sent → delivered → opened, with rates.
   * Viewer+. Sorted newest first.
   */
  funnel: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      const rows = await db.execute<{
        id: string
        title: string
        category: string
        status: string
        sent_at: string | null
        sent_count: number
        failed_count: number
        skipped_optout_count: number
        delivered_count: number
        opened_count: number
        recipients: number
      }>(sql`
        select c.id, c.title, c.category, c.status,
               to_char(c.sent_at,'YYYY-MM-DD"T"HH24:MI:SSZ') as sent_at,
               c.sent_count, c.failed_count, c.skipped_optout_count,
               c.delivered_count, c.opened_count,
               (select count(*) from push_recipients r where r.campaign_id = c.id)::int as recipients
        from push_campaigns c
        where c.status in ('sent','sending')
        order by c.sent_at desc nulls last, c.created_at desc
        limit ${input.limit}
      `)
      return Array.from(rows).map((c) => {
        const sent = Number(c.sent_count)
        const delivered = Number(c.delivered_count)
        const opened = Number(c.opened_count)
        return {
          id: c.id,
          title: c.title,
          category: c.category,
          status: c.status,
          sentAt: c.sent_at,
          sent,
          failed: Number(c.failed_count),
          skipped: Number(c.skipped_optout_count),
          delivered,
          opened,
          deliveryRate: sent > 0 ? delivered / sent : 0,
          openRate: delivered > 0 ? opened / delivered : 0,
        }
      })
    }),

  /** Roll-up across all sent campaigns — headline cards. Viewer+. */
  totals: protectedProcedure.query(async () => {
    const res = await db.execute<{ campaigns: number; sent: number; delivered: number; opened: number }>(sql`
      select count(*) filter (where status = 'sent')::int as campaigns,
             coalesce(sum(sent_count),0)::int as sent,
             coalesce(sum(delivered_count),0)::int as delivered,
             coalesce(sum(opened_count),0)::int as opened
      from push_campaigns
    `)
    const r = Array.from(res)[0] ?? { campaigns: 0, sent: 0, delivered: 0, opened: 0 }
    const sent = Number(r.sent)
    const delivered = Number(r.delivered)
    const opened = Number(r.opened)
    return {
      campaigns: Number(r.campaigns),
      sent,
      delivered,
      opened,
      deliveryRate: sent > 0 ? delivered / sent : 0,
      openRate: delivered > 0 ? opened / delivered : 0,
    }
  }),

  /**
   * Poll Expo receipts for a campaign's pending tickets, mark delivered / errored
   * recipients, refresh the campaign's delivered_count, and deactivate any dead
   * tokens Expo reports. Admin + audited. Safe to call repeatedly (idempotent —
   * only touches recipients not yet receipt-checked).
   */
  checkReceipts: adminProcedure
    .input(z.object({ campaignId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const pending = await db
        .select({ id: pushRecipients.id, ticketId: pushRecipients.ticketId, token: pushRecipients.token })
        .from(pushRecipients)
        .where(
          and(
            eq(pushRecipients.campaignId, input.campaignId),
            isNotNull(pushRecipients.ticketId),
            isNull(pushRecipients.receiptCheckedAt),
          ),
        )
      if (pending.length === 0) {
        return { checked: 0, delivered: 0, errored: 0, deactivated: 0 }
      }

      const receipts = await getPushReceipts(pending.map((p) => p.ticketId!).filter(Boolean))
      const byTicket = new Map(receipts.map((r) => [r.ticketId, r]))
      const tokenByTicket = new Map(pending.map((p) => [p.ticketId, p.token]))

      const now = new Date()
      let delivered = 0
      let errored = 0
      const deadTokens: string[] = []

      for (const p of pending) {
        const rec = p.ticketId ? byTicket.get(p.ticketId) : undefined
        if (!rec) continue // receipt not ready yet — leave unchecked, retry next poll
        const ok = rec.status === "ok"
        if (ok) delivered++
        else {
          errored++
          if (rec.terminal) {
            const tk = tokenByTicket.get(p.ticketId)
            if (tk) deadTokens.push(tk)
          }
        }
        await db
          .update(pushRecipients)
          .set({
            receiptStatus: rec.status,
            receiptError: rec.error,
            receiptCheckedAt: now,
            deliveredAt: ok ? now : null,
          })
          .where(eq(pushRecipients.id, p.id))
      }

      // Refresh the campaign's delivered_count from the source of truth.
      await db.execute(sql`
        update push_campaigns set delivered_count = (
          select count(*) from push_recipients where campaign_id = ${input.campaignId} and delivered_at is not null
        ) where id = ${input.campaignId}
      `)

      const deactivated = deadTokens.length ? await deactivateTokens(deadTokens) : 0

      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "push.receipts.check",
        target: input.campaignId,
        meta: { checked: delivered + errored, delivered, errored, deactivated },
      })
      return { checked: delivered + errored, delivered, errored, deactivated }
    }),

  /**
   * Record a notification OPEN. Called by the app (via an edge function) when a
   * user taps a push. Public: the recipient id is an opaque uuid handed to the
   * device in the push payload; recording a tap is not sensitive and must work
   * without a session. Idempotent — a second tap doesn't double-count.
   */
  markOpened: publicProcedure
    .input(z.object({ recipientId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      // Only the first open counts; guard on opened_at being null.
      const res = await db.execute<{ campaign_id: string }>(sql`
        update push_recipients set opened_at = now()
        where id = ${input.recipientId} and opened_at is null
        returning campaign_id
      `)
      const row = Array.from(res)[0]
      if (row) {
        await db.execute(sql`
          update push_campaigns set opened_count = opened_count + 1 where id = ${row.campaign_id}
        `)
      }
      return { ok: true, counted: Boolean(row) }
    }),
})
