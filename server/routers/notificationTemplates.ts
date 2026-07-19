import { z } from "zod"
import { eq, asc, sql } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure, adminProcedure } from "../trpc"
import { db } from "@/db"
import { notificationTemplates } from "@/db/schema"
import { renderTemplate } from "@/lib/notifications/render"
import { writeAudit } from "@/lib/audit"

/**
 * Event-driven notification templates — editable {{variable}} copy for automated
 * pushes (new channel post, milestone, appointment reminder, …). Keyed by type;
 * types are seeded via migration and only their title/body are editable (matches
 * Aura). Viewer+ can read; admin can edit.
 */
export const notificationTemplatesRouter = router({
  list: protectedProcedure.query(async () => {
    // live before planned within each behavior, then alphabetical by type — the
    // client groups by behavior and this keeps the most-real rows on top.
    return db
      .select()
      .from(notificationTemplates)
      .orderBy(sql`case status when 'live' then 0 else 1 end`, asc(notificationTemplates.type))
  }),

  update: adminProcedure
    .input(
      z.object({
        type: z.string().min(1).max(80),
        titleTemplate: z.string().min(1).max(100),
        bodyTemplate: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.type, input.type))
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })

      const [row] = await db
        .update(notificationTemplates)
        .set({
          titleTemplate: input.titleTemplate.trim(),
          bodyTemplate: input.bodyTemplate.trim(),
          updatedAt: new Date(),
          updatedBy: ctx.userEmail ?? "unknown",
        })
        .where(eq(notificationTemplates.type, input.type))
        .returning()

      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "notification.template.update",
        target: input.type,
      })
      return row
    }),

  /**
   * Preview a template with sample variable values filled in — lets the composer
   * show what the rendered push will look like. No persistence.
   */
  preview: protectedProcedure
    .input(z.object({ titleTemplate: z.string(), bodyTemplate: z.string(), vars: z.record(z.string(), z.string()) }))
    .query(({ input }) => ({
      title: renderTemplate(input.titleTemplate, input.vars),
      body: renderTemplate(input.bodyTemplate, input.vars),
    })),
})
