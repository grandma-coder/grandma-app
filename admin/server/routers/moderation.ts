import { z } from "zod"
import { sql } from "drizzle-orm"
import { router, protectedProcedure, adminProcedure } from "../trpc"
import { db } from "@/db"
import { writeAudit } from "@/lib/audit"

/**
 * Community moderation — works the `content_reports` queue the app writes when
 * a user reports a post/comment. Reading the queue is viewer+ (triage
 * visibility); taking action (resolving a report, hiding/removing a post) is
 * admin + audited. Actions write to the app's own tables (channel_posts
 * .moderation_status, content_reports.status) via service-role.
 *
 * user_blocks is user-to-user (not admin-imposed) and surfaced read-only for
 * context; an admin-level user ban is a separate concept not built here.
 */

export const OPEN_REPORT = sql`(status IS NULL OR status IN ('pending','open','new','reported'))`

export interface ReportRow {
  id: string
  contentType: string
  contentId: string
  authorId: string | null
  authorName: string | null
  reason: string | null
  details: string | null
  status: string | null
  createdAt: string | null
  reportCount: number // how many open reports target this same content
  // resolved reported content (post only, when resolvable)
  content: string | null
  channelName: string | null
  moderationStatus: string | null
}

export const moderationRouter = router({
  /**
   * The report queue. Defaults to open reports, newest first. Joins the
   * reported post's content + channel when the report targets a post, and
   * counts how many open reports hit the same content (dupes cluster).
   */
  queue: protectedProcedure
    .input(
      z.object({
        scope: z.enum(["open", "resolved", "all"]).default("open"),
        limit: z.number().int().min(1).max(200).default(100),
      }),
    )
    .query(async ({ input }) => {
      const scopeCond =
        input.scope === "open" ? OPEN_REPORT : input.scope === "resolved" ? sql`(status IN ('resolved','dismissed','actioned'))` : sql`true`
      const rows = await db.execute<{
        id: string
        content_type: string
        content_id: string
        author_id: string | null
        reason: string | null
        details: string | null
        status: string | null
        created_at: string | null
        report_count: number
        content: string | null
        author_name: string | null
        channel_name: string | null
        moderation_status: string | null
      }>(sql`
        select r.id, r.content_type, r.content_id, r.author_id, r.reason, r.details, r.status,
               to_char(r.created_at,'YYYY-MM-DD"T"HH24:MI:SSZ') as created_at,
               (select count(*) from content_reports r2 where r2.content_id = r.content_id and ${OPEN_REPORT})::int as report_count,
               p.content, p.author_name, c.name as channel_name, p.moderation_status
        from content_reports r
        left join channel_posts p on p.id = r.content_id and r.content_type = 'post'
        left join channels c on c.id = p.channel_id
        where ${scopeCond}
        order by r.created_at desc
        limit ${input.limit}
      `)
      return Array.from(rows).map(
        (r): ReportRow => ({
          id: r.id,
          contentType: r.content_type,
          contentId: r.content_id,
          authorId: r.author_id,
          authorName: r.author_name,
          reason: r.reason,
          details: r.details,
          status: r.status,
          createdAt: r.created_at,
          reportCount: Number(r.report_count ?? 1),
          content: r.content,
          channelName: r.channel_name,
          moderationStatus: r.moderation_status,
        }),
      )
    }),

  /**
   * Resolve a report — 'dismiss' (no action needed) or 'actioned' (content was
   * dealt with). Stamps reviewed_at. Admin + audited.
   */
  resolveReport: adminProcedure
    .input(z.object({ id: z.string().uuid(), outcome: z.enum(["dismissed", "actioned"]) }))
    .mutation(async ({ ctx, input }) => {
      await db.execute(sql`
        update content_reports set status = ${input.outcome}, reviewed_at = now() where id = ${input.id}
      `)
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "moderation.report.resolve",
        target: input.id,
        meta: { outcome: input.outcome },
      })
      return { ok: true }
    }),

  /**
   * Set a post's moderation_status — 'hidden' / 'removed' take it out of the
   * feed, 'visible' restores it. Also resolves any open reports on that post as
   * 'actioned' when hiding/removing (one action clears the cluster). Admin +
   * audited.
   */
  setPostStatus: adminProcedure
    .input(z.object({ postId: z.string().uuid(), status: z.enum(["visible", "hidden", "removed"]) }))
    .mutation(async ({ ctx, input }) => {
      await db.execute(sql`update channel_posts set moderation_status = ${input.status} where id = ${input.postId}`)
      if (input.status !== "visible") {
        await db.execute(sql`
          update content_reports set status = 'actioned', reviewed_at = now()
          where content_id = ${input.postId} and content_type = 'post' and ${OPEN_REPORT}
        `)
      }
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "moderation.post.status",
        target: input.postId,
        meta: { status: input.status },
      })
      return { ok: true }
    }),
})
