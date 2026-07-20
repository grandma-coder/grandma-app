import { z } from "zod"
import { eq, desc } from "drizzle-orm"
import { router, protectedProcedure, adminProcedure } from "../trpc"
import { db } from "@/db"
import { contentReleases } from "@/db/schema"
import { ascConfigured, ascWriteEnabled, fetchBuilds, fetchVersions, setVersionWhatsNew } from "@/lib/asc/client"
import { easConfigured, fetchEasBuilds } from "@/lib/eas/client"
import { draftChangelog, isChangelogAiAvailable } from "@/lib/content/changelog"
import { writeAudit } from "@/lib/audit"

/**
 * Releases — App Store Connect builds/versions (live) merged with our own
 * editable changelog per version (content_releases). Builds/versions are
 * read-only from Apple; the changelog notes are managed here. Viewer+ can read;
 * editing is admin + audited.
 */
export const releasesRouter = router({
  /** Connection state — drives setup cards + whether Publish-to-Apple shows. */
  status: protectedProcedure.query(() => ({
    ascConfigured,
    ascWriteEnabled,
    easConfigured,
    changelogAi: isChangelogAiAvailable(),
  })),

  /**
   * Draft a clean changelog from raw commit text with Claude (does not save —
   * the UI prefills the editor for review). Admin only.
   */
  draftChangelog: adminProcedure
    .input(z.object({ commitText: z.string().min(1).max(8000), version: z.string().max(40) }))
    .mutation(async ({ input }) => {
      if (!isChangelogAiAvailable()) return { available: false as const, title: "", highlights: [] as string[], changelog: "" }
      const d = await draftChangelog(input.commitText, input.version)
      return { available: true as const, ...d }
    }),

  /** Live EAS builds (prod profile) with git commit/message. Empty when dormant. */
  easBuilds: protectedProcedure.query(async () => {
    return fetchEasBuilds(40)
  }),

  /**
   * Push "What's New" release notes to an App Store version — WRITES to Apple
   * (changes what users see). Admin only + audited. Gated by APPSTORE_WRITE=1
   * at the client layer; a leaked/read-only key can't publish.
   */
  publishWhatsNew: adminProcedure
    .input(z.object({ versionId: z.string().min(1), versionString: z.string().max(40), whatsNew: z.string().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const result = await setVersionWhatsNew(input.versionId, input.whatsNew.trim())
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "release.whatsnew.publish",
        target: input.versionString,
        meta: { ok: result.ok, updated: result.updated, error: result.error ?? null },
      })
      return result
    }),

  /** Live builds from App Store Connect (newest first). Empty when dormant. */
  builds: protectedProcedure.query(async () => {
    return fetchBuilds(40)
  }),

  /** Live App Store versions + their state. Empty when dormant. */
  versions: protectedProcedure.query(async () => {
    return fetchVersions(20)
  }),

  /** Our editable changelog notes, keyed by version. Viewer+. */
  notes: protectedProcedure.query(async () => {
    return db.select().from(contentReleases).orderBy(desc(contentReleases.updatedAt))
  }),

  /** Create or update the changelog for a version. Admin + audited. */
  upsertNote: adminProcedure
    .input(
      z.object({
        version: z.string().min(1).max(40),
        build: z.string().max(40).nullable().optional(),
        title: z.string().max(160).nullable().optional(),
        changelog: z.string().max(6000).nullable().optional(),
        highlights: z.array(z.string().max(200)).max(20).default([]),
        status: z.enum(["draft", "shipped"]).default("draft"),
        releasedAt: z.string().datetime().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const values = {
        build: input.build ?? null,
        title: input.title?.trim() || null,
        changelog: input.changelog?.trim() || null,
        highlights: input.highlights,
        status: input.status,
        releasedAt: input.releasedAt ? new Date(input.releasedAt) : null,
        updatedAt: new Date(),
      }
      const [row] = await db
        .insert(contentReleases)
        .values({ version: input.version.trim(), createdBy: ctx.userEmail ?? "unknown", ...values })
        .onConflictDoUpdate({ target: contentReleases.version, set: values })
        .returning()
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "release.note.upsert",
        target: input.version,
        meta: { status: input.status },
      })
      return row
    }),

  deleteNote: adminProcedure.input(z.object({ version: z.string() })).mutation(async ({ ctx, input }) => {
    await db.delete(contentReleases).where(eq(contentReleases.version, input.version))
    await writeAudit({ actorEmail: ctx.userEmail ?? "unknown", action: "release.note.delete", target: input.version })
    return { ok: true }
  }),
})
