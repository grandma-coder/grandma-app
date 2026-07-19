import { z } from "zod"
import { eq, asc } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure, adminProcedure } from "../trpc"
import { db } from "@/db"
import { contentDailyQuestions } from "@/db/schema"
import { writeAudit } from "@/lib/audit"

const MODES = ["pregnancy", "pre-pregnancy", "kids"] as const

const optionSchema = z.object({
  label: z.string().min(1).max(80),
  tags: z.array(z.string().max(40)).max(6),
})

/**
 * Content DB — Stage 1: daily-tracking questions. The app reads these DB-first
 * with its bundled arrays as a fallback, so edits here flow live to the app but
 * a bad edit / outage never blanks the health content. All writes admin-gated +
 * audited (this is user-facing health-adjacent content).
 */
export const contentRouter = router({
  /** All daily questions, grouped-friendly (ordered by mode then sort). Viewer+. */
  dailyQuestions: protectedProcedure.query(async () => {
    return db
      .select()
      .from(contentDailyQuestions)
      .orderBy(asc(contentDailyQuestions.mode), asc(contentDailyQuestions.sort))
  }),

  /** Create or update one question. id is the stable app id (q_001 / pq_001 / new). */
  upsertDailyQuestion: adminProcedure
    .input(
      z.object({
        id: z.string().min(1).max(40),
        mode: z.enum(MODES),
        prompt: z.string().min(1).max(300),
        options: z.array(optionSchema).min(2).max(6),
        active: z.boolean().default(true),
        sort: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .insert(contentDailyQuestions)
        .values({
          id: input.id,
          mode: input.mode,
          prompt: input.prompt.trim(),
          options: input.options,
          active: input.active,
          sort: input.sort,
          updatedBy: ctx.userEmail ?? "unknown",
        })
        .onConflictDoUpdate({
          target: contentDailyQuestions.id,
          set: {
            mode: input.mode,
            prompt: input.prompt.trim(),
            options: input.options,
            active: input.active,
            sort: input.sort,
            updatedAt: new Date(),
            updatedBy: ctx.userEmail ?? "unknown",
          },
        })
        .returning()
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "content.daily_question.upsert",
        target: input.id,
        meta: { mode: input.mode },
      })
      return row
    }),

  /** Toggle active without editing content. */
  setDailyQuestionActive: adminProcedure
    .input(z.object({ id: z.string(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .update(contentDailyQuestions)
        .set({ active: input.active, updatedAt: new Date(), updatedBy: ctx.userEmail ?? "unknown" })
        .where(eq(contentDailyQuestions.id, input.id))
        .returning()
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" })
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "content.daily_question.active",
        target: input.id,
        meta: { active: input.active },
      })
      return row
    }),

  /** Hard-delete a question (rare — prefer deactivate). */
  deleteDailyQuestion: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(contentDailyQuestions).where(eq(contentDailyQuestions.id, input.id))
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "content.daily_question.delete",
        target: input.id,
      })
      return { ok: true }
    }),
})
