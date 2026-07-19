import { z } from "zod"
import { eq, desc, sql, and, or, ilike } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure, sendProcedure } from "../trpc"
import { db } from "@/db"
import { pushCampaigns, pushRecipients, NOTIFICATION_STATUSES } from "@/db/schema"
import { deliverCampaign } from "@/lib/notifications/deliver"
import { writeAudit } from "@/lib/audit"

const CATEGORIES = ["broadcast", "insights", "appointments", "cycle", "milestones", "care_circle", "reminder"] as const

// Deep-link options — where the app navigates on tap. Mirrors Aura's dropdown
// (none/skill/products) adapted to grandma's surfaces. The value is stored on
// deepLink and echoed into the push data payload as `url`.
const DEEP_LINKS = [
  { value: "", label: "None" },
  { value: "/(tabs)", label: "Home" },
  { value: "/(tabs)/agenda", label: "Agenda / Planner" },
  { value: "/(tabs)/library", label: "Library" },
  { value: "/channels", label: "Community / Channels" },
  { value: "/grandma-talk", label: "Grandma chat" },
  { value: "/insights", label: "Insights" },
  { value: "/paywall", label: "Paywall (upgrade)" },
] as const

const baseFields = {
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(400),
  category: z.enum(CATEGORIES).default("broadcast"),
  deepLink: z.string().max(200).optional(),
  targetType: z.enum(["all", "users"]).default("all"),
  targetUserIds: z.array(z.string().uuid()).default([]),
}

// scheduled_at (ISO string) — when present + future, the campaign is scheduled;
// otherwise it's a plain draft. Validated future-only, matching Aura.
const scheduledAt = z.string().datetime().nullable().optional()

export const pushRouter = router({
  /**
   * List campaigns with optional search + status filter. Viewer+ (no PII in
   * campaign metadata). Newest first.
   */
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().max(120).optional(),
          status: z.enum(NOTIFICATION_STATUSES).optional(),
          limit: z.number().int().min(1).max(200).default(100),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const conds = []
      if (input?.status) conds.push(eq(pushCampaigns.status, input.status))
      if (input?.search) {
        const q = `%${input.search}%`
        conds.push(or(ilike(pushCampaigns.title, q), ilike(pushCampaigns.body, q)))
      }
      const where = conds.length ? and(...conds) : undefined
      const rows = await db
        .select()
        .from(pushCampaigns)
        .where(where)
        .orderBy(desc(pushCampaigns.createdAt))
        .limit(input?.limit ?? 100)
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

  /**
   * Create a campaign. Status is derived: a future scheduled_at → 'scheduled',
   * otherwise 'draft'. Admin (sendProcedure) — composing a send is privileged.
   */
  createCampaign: sendProcedure
    .input(z.object({ ...baseFields, scheduledAt }))
    .mutation(async ({ ctx, input }) => {
      const status = deriveStatus(input.scheduledAt)
      const [row] = await db
        .insert(pushCampaigns)
        .values({
          title: input.title,
          body: input.body,
          category: input.category,
          deepLink: input.deepLink || null,
          targetType: input.targetType,
          targetUserIds: input.targetUserIds,
          status,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          createdBy: ctx.userEmail ?? "unknown",
        })
        .returning()
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: status === "scheduled" ? "push.campaign.schedule" : "push.campaign.create",
        target: row.id,
        meta: { scheduledAt: input.scheduledAt ?? null },
      })
      return row
    }),

  /**
   * Update a draft/scheduled campaign. Editing a sent/sending/failed campaign is
   * rejected. scheduled_at: null reverts to draft; a future date → scheduled.
   */
  updateCampaign: sendProcedure
    .input(z.object({ campaignId: z.string().uuid(), ...baseFields, scheduledAt }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db.select().from(pushCampaigns).where(eq(pushCampaigns.id, input.campaignId))
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" })
      if (existing.status !== "draft" && existing.status !== "scheduled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot edit a ${existing.status} campaign` })
      }
      const status = deriveStatus(input.scheduledAt)
      const [row] = await db
        .update(pushCampaigns)
        .set({
          title: input.title,
          body: input.body,
          category: input.category,
          deepLink: input.deepLink || null,
          targetType: input.targetType,
          targetUserIds: input.targetUserIds,
          status,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        })
        .where(eq(pushCampaigns.id, input.campaignId))
        .returning()
      await writeAudit({ actorEmail: ctx.userEmail ?? "unknown", action: "push.campaign.update", target: row.id })
      return row
    }),

  /**
   * Cancel or delete. A scheduled campaign is soft-cancelled (status→cancelled).
   * A draft/cancelled/failed campaign is hard-deleted. A sent one can't be
   * removed. A sending one is blocked unless it's been stuck > 2 min.
   */
  cancelCampaign: sendProcedure
    .input(z.object({ campaignId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [c] = await db.select().from(pushCampaigns).where(eq(pushCampaigns.id, input.campaignId))
      if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" })

      if (c.status === "sent") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A sent campaign can't be removed" })
      }
      if (c.status === "sending") {
        const stuckMs = Date.now() - new Date(c.createdAt).getTime()
        if (stuckMs < 2 * 60 * 1000) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign is currently sending" })
        }
      }
      if (c.status === "scheduled") {
        await db.update(pushCampaigns).set({ status: "cancelled" }).where(eq(pushCampaigns.id, c.id))
        await writeAudit({ actorEmail: ctx.userEmail ?? "unknown", action: "push.campaign.cancel", target: c.id })
        return { action: "cancelled" as const }
      }
      await db.delete(pushRecipients).where(eq(pushRecipients.campaignId, c.id))
      await db.delete(pushCampaigns).where(eq(pushCampaigns.id, c.id))
      await writeAudit({ actorEmail: ctx.userEmail ?? "unknown", action: "push.campaign.delete", target: c.id })
      return { action: "deleted" as const }
    }),

  /**
   * Send a draft/scheduled campaign now. Admin only + audited. Delegates to the
   * shared deliverCampaign pipeline (atomic claim → resolve tokens with consent
   * filter → Expo send → recipient rows + in-app feed → prune dead tokens →
   * record counts).
   */
  sendCampaign: sendProcedure.input(z.object({ campaignId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const result = await deliverCampaign(input.campaignId, { allowStatuses: ["draft", "scheduled", "sending"] })
    await writeAudit({
      actorEmail: ctx.userEmail ?? "unknown",
      action: "push.campaign.send",
      target: input.campaignId,
      meta: { ...result },
    })
    return result
  }),

  /**
   * Create + send in one shot ("Save & Send Now"). Forces scheduled_at null so
   * it goes out immediately. Collapses Aura's client-side 2-step sequence.
   */
  createAndSend: sendProcedure.input(z.object(baseFields)).mutation(async ({ ctx, input }) => {
    const [row] = await db
      .insert(pushCampaigns)
      .values({
        title: input.title,
        body: input.body,
        category: input.category,
        deepLink: input.deepLink || null,
        targetType: input.targetType,
        targetUserIds: input.targetUserIds,
        status: "draft",
        createdBy: ctx.userEmail ?? "unknown",
      })
      .returning()
    const result = await deliverCampaign(row.id, { allowStatuses: ["draft"] })
    await writeAudit({
      actorEmail: ctx.userEmail ?? "unknown",
      action: "push.campaign.create_and_send",
      target: row.id,
      meta: { ...result },
    })
    return { campaignId: row.id, ...result }
  }),

  /** Deep-link options for the composer dropdown. */
  deepLinks: protectedProcedure.query(() => DEEP_LINKS),
})

/** future scheduled_at → 'scheduled'; else 'draft'. Rejects a past date. */
function deriveStatus(scheduledAtIso: string | null | undefined): "draft" | "scheduled" {
  if (!scheduledAtIso) return "draft"
  const when = new Date(scheduledAtIso).getTime()
  if (Number.isNaN(when)) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid schedule date" })
  if (when <= Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "Scheduled time must be in the future" })
  return "scheduled"
}
