import { z } from "zod"
import { eq, desc, sql } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure, sendProcedure } from "../trpc"
import { db } from "@/db"
import { pushCampaigns, pushRecipients } from "@/db/schema"
import { resolveTokens, type PushCategory } from "@/lib/expo/resolve-tokens"
import { sendPushBatch } from "@/lib/expo/send-push-batch"
import { deactivateTokens } from "@/lib/expo/deactivate-tokens"
import { writeAudit } from "@/lib/audit"

const CATEGORIES = ["broadcast", "insights", "appointments", "cycle", "milestones", "care_circle", "reminder"] as const

const createInput = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(400),
  category: z.enum(CATEGORIES).default("broadcast"),
  deepLink: z.string().max(200).optional(),
  targetType: z.enum(["all", "users"]).default("all"),
  targetUserIds: z.array(z.string().uuid()).default([]),
})

export const pushRouter = router({
  /** List campaigns, newest first. Viewer+ (no PII in campaign metadata). */
  list: protectedProcedure.query(async () => {
    const rows = await db.select().from(pushCampaigns).orderBy(desc(pushCampaigns.createdAt)).limit(50)
    return rows
  }),

  /** Per-recipient outcomes for one campaign. Viewer+. */
  history: protectedProcedure.input(z.object({ campaignId: z.string().uuid() })).query(async ({ input }) => {
    const [campaign] = await db.select().from(pushCampaigns).where(eq(pushCampaigns.id, input.campaignId))
    const recipients = await db
      .select()
      .from(pushRecipients)
      .where(eq(pushRecipients.campaignId, input.campaignId))
      .limit(500)
    return { campaign: campaign ?? null, recipients }
  }),

  /** Create a draft campaign. Admin (sendProcedure) — composing a send is privileged. */
  createCampaign: sendProcedure.input(createInput).mutation(async ({ ctx, input }) => {
    const [row] = await db
      .insert(pushCampaigns)
      .values({
        title: input.title,
        body: input.body,
        category: input.category,
        deepLink: input.deepLink ?? null,
        targetType: input.targetType,
        targetUserIds: input.targetUserIds,
        status: "draft",
        createdBy: ctx.userEmail ?? "unknown",
      })
      .returning()
    await writeAudit({ actorEmail: ctx.userEmail ?? "unknown", action: "push.campaign.create", target: row.id })
    return row
  }),

  /**
   * Send a draft campaign. Admin only + audited. The pipeline:
   *   1. atomically flip draft → sending (guards double-send)
   *   2. resolve audience tokens, applying the category consent filter
   *   3. sendPushBatch to Expo
   *   4. write a push_recipients row per token + a `notifications` row per
   *      recipient (so it shows in the app's in-app feed)
   *   5. deactivate any dead tokens Expo reported
   *   6. record sent/failed/skipped counts, flip → sent (or failed)
   */
  sendCampaign: sendProcedure.input(z.object({ campaignId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    // 1. Claim the campaign (only a draft can be sent).
    const claimed = await db.execute<{ id: string; title: string; body: string; category: string; deep_link: string | null; target_type: string; target_user_ids: string[] }>(sql`
      update push_campaigns
      set status = 'sending'
      where id = ${input.campaignId} and status = 'draft'
      returning id, title, body, category, deep_link, target_type, target_user_ids
    `)
    const campaign = Array.from(claimed)[0]
    if (!campaign) throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign not found or not in draft state" })

    try {
      // 2. Resolve audience with consent filter.
      const target =
        campaign.target_type === "users"
          ? { type: "users" as const, userIds: campaign.target_user_ids ?? [] }
          : { type: "all" as const }
      const { tokens, skippedOptOut } = await resolveTokens(target, campaign.category as PushCategory)

      // 3. Send.
      const data: Record<string, unknown> = { category: campaign.category }
      if (campaign.deep_link) data.url = campaign.deep_link
      const result = await sendPushBatch(
        tokens.map((to) => ({ to, title: campaign.title, body: campaign.body, data })),
      )

      // 4. Log recipients (chunked insert) + in-app feed rows.
      const recipientRows = tokens.map((token, i) => {
        const tk = result.tickets[i]
        return {
          campaignId: campaign.id,
          token,
          status: (tk?.status === "ok" ? "ok" : "error") as "ok" | "error",
          ticketId: tk?.id ?? null,
          error: tk?.status === "error" ? tk.message ?? tk.details?.error ?? "error" : null,
        }
      })
      if (recipientRows.length) {
        for (let i = 0; i < recipientRows.length; i += 200) {
          await db.insert(pushRecipients).values(recipientRows.slice(i, i + 200))
        }
      }
      // In-app feed: one notifications row per targeted token's user.
      await db.execute(sql`
        insert into notifications (user_id, title, body, type)
        select distinct t.user_id, ${campaign.title}, ${campaign.body}, 'push'
        from push_tokens t
        where t.is_active and t.token = any(${sql`array[${tokens.length ? sql.join(tokens.map((t) => sql`${t}`), sql`, `) : sql`null`}]::text[]`})
      `)

      // 5. Prune dead tokens.
      if (result.terminalTokens.length) await deactivateTokens(result.terminalTokens)

      // 6. Record + finalize.
      await db
        .update(pushCampaigns)
        .set({
          status: "sent",
          sentCount: result.okCount,
          failedCount: result.errorCount,
          skippedOptoutCount: skippedOptOut,
          sentAt: new Date(),
        })
        .where(eq(pushCampaigns.id, campaign.id))

      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "push.campaign.send",
        target: campaign.id,
        meta: { sent: result.okCount, failed: result.errorCount, skipped: skippedOptOut },
      })

      return { sent: result.okCount, failed: result.errorCount, skipped: skippedOptOut }
    } catch (err) {
      await db
        .update(pushCampaigns)
        .set({ status: "failed", errorMessage: err instanceof Error ? err.message : "send failed" })
        .where(eq(pushCampaigns.id, campaign.id))
      throw err instanceof TRPCError ? err : new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "send failed" })
    }
  }),
})
