import { z } from "zod"
import { eq, desc } from "drizzle-orm"
import { router, protectedProcedure, adminProcedure } from "../trpc"
import { db } from "@/db"
import { contentReleases } from "@/db/schema"
import { ascConfigured, ascWriteEnabled, fetchBuilds, fetchVersions, setVersionWhatsNew, setBuildWhatToTest } from "@/lib/asc/client"
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
   * ONE unified builds view — every App Store build joined with its matching EAS
   * build (git commit) and our changelog note. This is the single table the
   * Releases page renders; no more separate EAS / ASC / notes lists.
   */
  buildsMerged: protectedProcedure.query(async () => {
    const [ascBuilds, easBuilds, notes] = await Promise.all([
      fetchBuilds(40),
      easConfigured ? fetchEasBuilds(100) : Promise.resolve([]),
      db.select().from(contentReleases),
    ])
    // Match EAS build by build number (appBuildVersion == ASC build.version),
    // preferring a production/finished one when there are duplicates.
    const easByNum = new Map<string, (typeof easBuilds)[number]>()
    for (const e of easBuilds) {
      if (!e.buildNumber) continue
      const cur = easByNum.get(e.buildNumber)
      const better = !cur || (e.profile === "production" && cur.profile !== "production") || (e.status === "FINISHED" && cur.status !== "FINISHED")
      if (better) easByNum.set(e.buildNumber, e)
    }
    const noteByBuild = new Map(notes.filter((n) => n.build).map((n) => [n.build as string, n]))

    return ascBuilds.map((b) => {
      const eas = easByNum.get(b.version)
      const note = noteByBuild.get(b.version)
      return {
        buildId: b.id,
        buildNumber: b.version,
        appVersion: eas?.appVersion ?? null,
        processingState: b.processingState,
        expired: b.expired,
        uploadedDate: b.uploadedDate,
        commitHash: eas?.gitCommitHash ?? null,
        commitMessage: eas?.gitCommitMessage ?? null,
        profile: eas?.profile ?? null,
        // our changelog note
        noteVersion: note?.version ?? null,
        title: note?.title ?? null,
        changelog: note?.changelog ?? null,
        highlights: (note?.highlights as string[] | null) ?? [],
        noteStatus: note?.status ?? null,
      }
    })
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

  /**
   * Push a build's changelog to its TestFlight "What to Test" note — WRITES to
   * Apple (what testers see). Admin only + audited. Gated by APPSTORE_WRITE=1.
   */
  pushToTestFlight: adminProcedure
    .input(z.object({ buildId: z.string().min(1), buildNumber: z.string().max(40), whatsNew: z.string().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const result = await setBuildWhatToTest(input.buildId, input.whatsNew.trim())
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "release.testflight.push",
        target: input.buildNumber,
        meta: { ok: result.ok, error: result.error ?? null },
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
