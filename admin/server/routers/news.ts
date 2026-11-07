import { z } from "zod"
import { eq, desc } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure, adminProcedure } from "../trpc"
import { db } from "@/db"
import { contentNews } from "@/db/schema"
import { researchNews, isResearchAvailable } from "@/lib/content/research"
import { writeAudit } from "@/lib/audit"

const STATUSES = ["draft", "published", "archived"] as const

const sourceSchema = z.object({ title: z.string().max(300), url: z.string().url().max(600) })

/**
 * News — AI-researched articles for the app feed. Research the live web with
 * Claude, draft items, review, publish. The app reads only 'published' items.
 * Everything admin-gated + audited (health-adjacent content).
 */
export const newsRouter = router({
  /** Whether the AI research feature is configured (ANTHROPIC_API_KEY set). */
  status: protectedProcedure.query(() => ({ researchAvailable: isResearchAvailable() })),

  /** List items, optional status filter. Viewer+ (drafts visible to the team). */
  list: protectedProcedure
    .input(z.object({ status: z.enum(STATUSES).optional() }).optional())
    .query(async ({ input }) => {
      const where = input?.status ? eq(contentNews.status, input.status) : undefined
      return db.select().from(contentNews).where(where).orderBy(desc(contentNews.createdAt)).limit(200)
    }),

  /**
   * Research a topic on the web and SAVE the drafted items as drafts (status
   * 'draft'). Returns how many were created. Admin only + audited. Nothing is
   * published — a human reviews the drafts before publishing.
   */
  research: adminProcedure
    .input(
      z.object({
        topic: z.string().min(2).max(200),
        mode: z.enum(["pregnancy", "pre-pregnancy", "kids", "general"]).optional(),
        count: z.number().int().min(1).max(5).default(3),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isResearchAvailable()) {
        return { available: false as const, created: 0 }
      }
      const drafts = await researchNews({ topic: input.topic, mode: input.mode, count: input.count })
      let created = 0
      for (const d of drafts) {
        await db.insert(contentNews).values({
          title: d.title,
          summary: d.summary || null,
          body: d.body,
          topic: input.topic,
          mode: input.mode ?? null,
          sources: d.sources,
          status: "draft",
          createdBy: ctx.userEmail ?? "unknown",
        })
        created++
      }
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "news.research",
        target: input.topic,
        meta: { created, mode: input.mode ?? null },
      })
      return { available: true as const, created }
    }),

  /** Edit a draft/published item's content. Admin + audited. */
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(140),
        summary: z.string().max(240).nullable(),
        body: z.string().min(1).max(4000),
        mode: z.enum(["pregnancy", "pre-pregnancy", "kids", "general"]).nullable(),
        sources: z.array(sourceSchema).max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .update(contentNews)
        .set({
          title: input.title.trim(),
          summary: input.summary?.trim() || null,
          body: input.body.trim(),
          mode: input.mode,
          sources: input.sources,
          updatedAt: new Date(),
        })
        .where(eq(contentNews.id, input.id))
        .returning()
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" })
      await writeAudit({ actorEmail: ctx.userEmail ?? "unknown", action: "news.update", target: input.id })
      return row
    }),

  /** Change an item's status (draft ↔ published ↔ archived). Admin + audited. */
  setStatus: adminProcedure
    .input(z.object({ id: z.string().uuid(), status: z.enum(STATUSES) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .update(contentNews)
        .set({
          status: input.status,
          publishedAt: input.status === "published" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(contentNews.id, input.id))
        .returning()
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" })
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: `news.${input.status}`,
        target: input.id,
      })
      return row
    }),

  delete: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await db.delete(contentNews).where(eq(contentNews.id, input.id))
    await writeAudit({ actorEmail: ctx.userEmail ?? "unknown", action: "news.delete", target: input.id })
    return { ok: true }
  }),

  /** Counts by status for the tab header. Viewer+. */
  counts: protectedProcedure.query(async () => {
    const rows = await db.select({ status: contentNews.status }).from(contentNews)
    const acc: Record<string, number> = { draft: 0, published: 0, archived: 0 }
    for (const r of rows) acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }),
})
