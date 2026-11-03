import { z } from "zod"
import { eq, asc, desc, ilike, and } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure, adminProcedure } from "../trpc"
import { db } from "@/db"
import { contentDailyQuestions, affirmations, contentBirthTopics, contentSources } from "@/db/schema"
import { writeAudit } from "@/lib/audit"

const sourceSchema = z.object({
  label: z.string().min(1).max(200),
  org: z.string().min(1).max(120),
  url: z.string().url().max(500),
})

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

  // ── Affirmations (already a live DB table; edits flow to the app instantly) ──

  /** List affirmations with optional search + category filter. Viewer+. */
  affirmations: protectedProcedure
    .input(z.object({ search: z.string().max(120).optional(), category: z.string().max(40).optional() }).optional())
    .query(async ({ input }) => {
      const conds = []
      if (input?.category) conds.push(eq(affirmations.category, input.category))
      if (input?.search) conds.push(ilike(affirmations.text, `%${input.search}%`))
      const where = conds.length ? and(...conds) : undefined
      return db.select().from(affirmations).where(where).orderBy(desc(affirmations.createdAt)).limit(500)
    }),

  /** Distinct categories for the filter dropdown. Viewer+. */
  affirmationCategories: protectedProcedure.query(async () => {
    const rows = await db
      .selectDistinct({ category: affirmations.category })
      .from(affirmations)
      .orderBy(asc(affirmations.category))
    return rows.map((r) => r.category)
  }),

  /** Create or update one affirmation. Admin + audited. */
  upsertAffirmation: adminProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        text: z.string().min(1).max(400),
        category: z.string().min(1).max(40).default("pregnancy"),
        weekMin: z.number().int().min(1).max(45).nullable().optional(),
        weekMax: z.number().int().min(1).max(45).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const values = {
        text: input.text.trim(),
        category: input.category.trim(),
        weekMin: input.weekMin ?? null,
        weekMax: input.weekMax ?? null,
      }
      let row
      if (input.id) {
        ;[row] = await db.update(affirmations).set(values).where(eq(affirmations.id, input.id)).returning()
        if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Affirmation not found" })
      } else {
        ;[row] = await db.insert(affirmations).values(values).returning()
      }
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: input.id ? "content.affirmation.update" : "content.affirmation.create",
        target: row.id,
        meta: { category: values.category },
      })
      return row
    }),

  /** Delete an affirmation. Admin + audited. */
  deleteAffirmation: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(affirmations).where(eq(affirmations.id, input.id))
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "content.affirmation.delete",
        target: input.id,
      })
      return { ok: true }
    }),

  // ── Birth guide topics + sources (Stage 3) ──────────────────────────────────

  /** All birth topics (ordered). Viewer+. Sections/sources come through as jsonb. */
  birthTopics: protectedProcedure.query(async () => {
    return db.select().from(contentBirthTopics).orderBy(asc(contentBirthTopics.sort))
  }),

  /** Update a topic's top-level fields + disclaimer. Admin + audited. */
  updateBirthTopicMeta: adminProcedure
    .input(
      z.object({
        key: z.string().min(1).max(40),
        emoji: z.string().max(8),
        title: z.string().min(1).max(120),
        subtitle: z.string().max(200),
        disclaimer: z.string().max(600).nullable(),
        active: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .update(contentBirthTopics)
        .set({
          emoji: input.emoji,
          title: input.title.trim(),
          subtitle: input.subtitle.trim(),
          disclaimer: input.disclaimer?.trim() || null,
          active: input.active,
          updatedAt: new Date(),
          updatedBy: ctx.userEmail ?? "unknown",
        })
        .where(eq(contentBirthTopics.key, input.key))
        .returning()
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Topic not found" })
      await writeAudit({ actorEmail: ctx.userEmail ?? "unknown", action: "content.birth_topic.meta", target: input.key })
      return row
    }),

  /** Replace a topic's sources list (the medical citations). Admin + audited. */
  updateBirthTopicSources: adminProcedure
    .input(z.object({ key: z.string().min(1).max(40), sources: z.array(sourceSchema).max(30) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .update(contentBirthTopics)
        .set({ sources: input.sources, updatedAt: new Date(), updatedBy: ctx.userEmail ?? "unknown" })
        .where(eq(contentBirthTopics.key, input.key))
        .returning()
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Topic not found" })
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "content.birth_topic.sources",
        target: input.key,
        meta: { count: input.sources.length },
      })
      return row
    }),

  /**
   * Replace a topic's full sections array (deeply-nested content) as validated
   * JSON. The editor sends the whole sections[] — we sanity-check it's an array
   * of objects with title/content before persisting so a malformed paste can't
   * corrupt the topic. Admin + audited.
   */
  updateBirthTopicSections: adminProcedure
    .input(z.object({ key: z.string().min(1).max(40), sections: z.string().max(200_000) }))
    .mutation(async ({ ctx, input }) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(input.sections)
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Sections is not valid JSON." })
      }
      if (!Array.isArray(parsed)) throw new TRPCError({ code: "BAD_REQUEST", message: "Sections must be a JSON array." })
      for (const s of parsed) {
        const sec = s as { title?: unknown; content?: unknown }
        if (typeof sec?.title !== "string" || typeof sec?.content !== "string") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Each section needs a title and content string." })
        }
      }
      const [row] = await db
        .update(contentBirthTopics)
        .set({ sections: parsed, updatedAt: new Date(), updatedBy: ctx.userEmail ?? "unknown" })
        .where(eq(contentBirthTopics.key, input.key))
        .returning()
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Topic not found" })
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "content.birth_topic.sections",
        target: input.key,
        meta: { count: parsed.length },
      })
      return row
    }),

  // ── Sources catalog — the app's managed medical evidence base ───────────────

  /** All medical sources (ordered by org then sort). Viewer+. */
  sources: protectedProcedure.query(async () => {
    return db.select().from(contentSources).orderBy(asc(contentSources.org), asc(contentSources.sort))
  }),

  /** Create or update one source. key is the app SOURCES key (or a new slug). */
  upsertSource: adminProcedure
    .input(
      z.object({
        key: z.string().min(1).max(60),
        org: z.string().min(1).max(120),
        title: z.string().min(1).max(300),
        url: z.string().url().max(600),
        topic: z.string().max(40).nullable().optional(),
        active: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .insert(contentSources)
        .values({
          key: input.key.trim(),
          org: input.org.trim(),
          title: input.title.trim(),
          url: input.url.trim(),
          topic: input.topic?.trim() || null,
          active: input.active,
          updatedBy: ctx.userEmail ?? "unknown",
        })
        .onConflictDoUpdate({
          target: contentSources.key,
          set: {
            org: input.org.trim(),
            title: input.title.trim(),
            url: input.url.trim(),
            topic: input.topic?.trim() || null,
            active: input.active,
            updatedAt: new Date(),
            updatedBy: ctx.userEmail ?? "unknown",
          },
        })
        .returning()
      await writeAudit({ actorEmail: ctx.userEmail ?? "unknown", action: "content.source.upsert", target: input.key })
      return row
    }),

  deleteSource: adminProcedure.input(z.object({ key: z.string() })).mutation(async ({ ctx, input }) => {
    await db.delete(contentSources).where(eq(contentSources.key, input.key))
    await writeAudit({ actorEmail: ctx.userEmail ?? "unknown", action: "content.source.delete", target: input.key })
    return { ok: true }
  }),
})
