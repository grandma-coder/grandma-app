import { z } from "zod"
import { sql } from "drizzle-orm"
import { router, protectedProcedure, piiProcedure } from "../trpc"
import { db } from "@/db"
import { writeAudit } from "@/lib/audit"

export interface UserRow {
  id: string
  email: string | null
  name: string | null
  journeyMode: string | null
  tier: string | null
  language: string | null
  createdAt: string | null
  lastActive: string | null
  logsCount: number
}

const listInput = z.object({
  mode: z.enum(["pre_pregnancy", "pregnancy", "kids"]).optional(),
  tier: z.enum(["free", "premium_solo", "premium_family"]).optional(),
  language: z.string().min(2).max(5).optional(),
  search: z.string().max(120).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

export const usersRouter = router({
  /**
   * Paginated user table. Any allowlisted user (viewer+) may list. Derived
   * columns (last-active, logs count) come from a UNION over the activity
   * tables — the same "activity signal" the metrics pillar will use.
   */
  list: protectedProcedure.input(listInput).query(async ({ input }) => {
    const conds = [sql`true`]
    if (input.mode) conds.push(sql`p.journey_mode = ${input.mode}`)
    if (input.tier) conds.push(sql`p.subscription_tier = ${input.tier}`)
    if (input.language) conds.push(sql`p.language = ${input.language}`)
    if (input.search) {
      const q = `%${input.search.toLowerCase()}%`
      conds.push(sql`(lower(p.email) like ${q} or lower(p.name) like ${q})`)
    }
    const where = sql.join(conds, sql` and `)

    const rows = await db.execute<{
      id: string
      email: string | null
      name: string | null
      journey_mode: string | null
      subscription_tier: string | null
      language: string | null
      created_at: string | null
      last_active: string | null
      logs_count: number
    }>(sql`
      with activity as (
        select user_id, created_at from child_logs
        union all select user_id, created_at from cycle_logs
        union all select user_id, created_at from pregnancy_logs
        union all select author_id as user_id, created_at from channel_posts
      )
      select p.id, p.email, p.name, p.journey_mode, p.subscription_tier,
             p.language, p.created_at,
             (select max(a.created_at) from activity a where a.user_id = p.id) as last_active,
             (select count(*) from activity a where a.user_id = p.id)::int as logs_count
      from profiles p
      where ${where}
      order by p.created_at desc nulls last
      limit ${input.limit} offset ${input.offset}
    `)

    // postgres-js returns the rows array directly (a RowList), not { rows }.
    const mapped: UserRow[] = Array.from(rows).map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      journeyMode: r.journey_mode,
      tier: r.subscription_tier,
      language: r.language,
      createdAt: r.created_at,
      lastActive: r.last_active,
      logsCount: Number(r.logs_count ?? 0),
    }))

    return { rows: mapped, nextOffset: mapped.length === input.limit ? input.offset + input.limit : null }
  }),

  /**
   * Full user detail — PII. Admin only (piiProcedure) AND every view is written
   * to the audit log with the actor's email + target user id.
   */
  detail: piiProcedure.input(z.object({ userId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const res = await db.execute<Record<string, unknown>>(sql`
      with activity as (
        select user_id, created_at from child_logs
        union all select user_id, created_at from cycle_logs
        union all select user_id, created_at from pregnancy_logs
        union all select author_id as user_id, created_at from channel_posts
      )
      select p.*,
        (select count(*) from children c where c.parent_id = p.id)::int as children_count,
        (select count(*) from push_tokens t where t.user_id = p.id)::int as device_count,
        (select count(*) from child_logs x where x.user_id = p.id)::int as child_logs_count,
        (select count(*) from cycle_logs x where x.user_id = p.id)::int as cycle_logs_count,
        (select count(*) from pregnancy_logs x where x.user_id = p.id)::int as pregnancy_logs_count,
        (select max(a.created_at) from activity a where a.user_id = p.id) as last_active
      from profiles p where p.id = ${input.userId}
    `)
    const profile = Array.from(res)[0] ?? null

    await writeAudit({
      actorEmail: ctx.userEmail ?? "unknown",
      action: "user.detail.view",
      target: input.userId,
    })

    return profile
  }),

  /** Canned segments: quick counts for the common cohorts. Viewer+. */
  segments: protectedProcedure.query(async () => {
    const res = await db.execute<{ segment: string; count: number }>(sql`
      select 'pregnancy' as segment, count(*)::int as count from profiles where journey_mode = 'pregnancy'
      union all select 'pre_pregnancy', count(*)::int from profiles where journey_mode = 'pre_pregnancy'
      union all select 'kids', count(*)::int from profiles where journey_mode = 'kids'
      union all select 'premium', count(*)::int from profiles where subscription_tier <> 'free'
      union all select 'total', count(*)::int from profiles
    `)
    return Array.from(res).map((r) => ({ segment: r.segment, count: Number(r.count) }))
  }),
})
