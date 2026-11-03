import { z } from "zod"
import { sql } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure, piiProcedure, adminProcedure } from "../trpc"
import { db } from "@/db"
import { writeAudit } from "@/lib/audit"

const TIERS = ["free", "premium_solo", "premium_family"] as const

export interface UserRow {
  id: string
  email: string | null
  name: string | null
  /** The single currently-active mode (profiles.journey_mode). */
  journeyMode: string | null
  /** ALL behaviors the user is enrolled in (behaviors table), normalized to
   *  pre_pregnancy | pregnancy | kids. Falls back to [journeyMode] if the user
   *  has no behaviors rows. */
  behaviors: string[]
  tier: string | null
  language: string | null
  createdAt: string | null
  lastActive: string | null
  logsCount: number
}

// The behaviors table stores 'cycle' for the pre-pregnancy journey; the rest of
// the app (journey_mode, filters) uses 'pre_pregnancy'. Normalize on read.
function normalizeBehavior(b: string): string {
  if (b === "cycle" || b === "pre-pregnancy") return "pre_pregnancy"
  return b
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
    if (input.tier) conds.push(sql`p.subscription_tier = ${input.tier}`)
    if (input.language) conds.push(sql`p.language = ${input.language}`)
    if (input.search) {
      const q = `%${input.search.toLowerCase()}%`
      conds.push(sql`(lower(p.email) like ${q} or lower(p.name) like ${q})`)
    }
    // Mode filter now matches ANY enrolled behavior (behaviors table), not just
    // the single active journey_mode — a multi-behavior user shows under each.
    // 'cycle' in behaviors == 'pre_pregnancy' everywhere else.
    if (input.mode) {
      const behaviorValue = input.mode === "pre_pregnancy" ? "cycle" : input.mode
      conds.push(sql`(
        exists (select 1 from behaviors b where b.user_id = p.id and b.active and b.type in (${behaviorValue}, ${input.mode}))
        or p.journey_mode = ${input.mode}
      )`)
    }
    const where = sql.join(conds, sql` and `)

    const rows = await db.execute<{
      id: string
      email: string | null
      name: string | null
      journey_mode: string | null
      behaviors: string[] | null
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
             (select array_agg(b.type order by b.type) from behaviors b where b.user_id = p.id and b.active) as behaviors,
             (select max(a.created_at) from activity a where a.user_id = p.id) as last_active,
             (select count(*) from activity a where a.user_id = p.id)::int as logs_count
      from profiles p
      where ${where}
      order by p.created_at desc nulls last
      limit ${input.limit} offset ${input.offset}
    `)

    // postgres-js returns the rows array directly (a RowList), not { rows }.
    const mapped: UserRow[] = Array.from(rows).map((r) => {
      const raw = Array.isArray(r.behaviors) ? r.behaviors : []
      // normalized, de-duped; fall back to journey_mode when no behaviors rows
      const behaviors = Array.from(new Set(raw.map(normalizeBehavior)))
      const fallback = r.journey_mode ? [normalizeBehavior(r.journey_mode)] : []
      return {
        id: r.id,
        email: r.email,
        name: r.name,
        journeyMode: r.journey_mode,
        behaviors: behaviors.length ? behaviors : fallback,
        tier: r.subscription_tier,
        language: r.language,
        createdAt: r.created_at,
        lastActive: r.last_active,
        logsCount: Number(r.logs_count ?? 0),
      }
    })

    return { rows: mapped, nextOffset: mapped.length === input.limit ? input.offset + input.limit : null }
  }),

  /**
   * Full user detail — PII. Admin only (piiProcedure) AND every view is written
   * to the audit log. Returns a rich profile: core fields, engagement/churn,
   * behavior breakdown, subscription/lifecycle, children/devices/care-circle.
   *
   * "Last active" has no dedicated column in grandma's DB — we take the GREATEST
   * of MAX(created_at) across every activity table plus push_tokens.last_seen_at
   * (the best passive "opened the app" signal). Email lives on auth.users, not
   * profiles, so it's joined in.
   */
  detail: piiProcedure.input(z.object({ userId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const id = input.userId
    const res = await db.execute<Record<string, unknown>>(sql`
      with activity as (
        select user_id, created_at from child_logs
        union all select user_id, created_at from cycle_logs
        union all select user_id, created_at from pregnancy_logs
        union all select author_id as user_id, created_at from channel_posts
        union all select author_id as user_id, created_at from post_comments
      )
      select
        p.id, p.name, p.journey_mode, p.subscription_tier::text as subscription_tier,
        p.subscription_status, p.language, p.country_code, p.dob, p.due_date,
        p.consented_at, p.is_verified_expert, p.expert_title, p.created_at,
        p.privacy_settings, p.notification_prefs,
        au.email as email,
        (select count(*) from children c where c.parent_id = p.id)::int as children_count,
        (select count(*) from push_tokens t where t.user_id = p.id)::int as device_count,
        (select count(*) from push_tokens t where t.user_id = p.id and t.is_active)::int as active_device_count,
        (select max(t.last_seen_at) from push_tokens t where t.user_id = p.id) as device_last_seen,
        (select count(*) from child_logs x where x.user_id = p.id)::int as child_logs_count,
        (select count(*) from cycle_logs x where x.user_id = p.id)::int as cycle_logs_count,
        (select count(*) from pregnancy_logs x where x.user_id = p.id)::int as pregnancy_logs_count,
        (select count(*) from channel_posts x where x.author_id = p.id)::int as posts_count,
        (select count(*) from post_comments x where x.author_id = p.id)::int as comments_count,
        (select count(*) from notifications n where n.user_id = p.id)::int as notifications_count,
        (select count(*) from notifications n where n.user_id = p.id and n.is_read = false)::int as notifications_unread,
        (select count(*) from care_circle cc where cc.owner_id = p.id and cc.status = 'accepted')::int as caregivers_count,
        (select count(*) from care_circle cc where cc.member_user_id = p.id and cc.status = 'accepted')::int as caregiver_for_count,
        (select count(*) from activity a where a.user_id = p.id and a.created_at >= now() - interval '7 days')::int as logs_7d,
        (select count(*) from activity a where a.user_id = p.id and a.created_at >= now() - interval '30 days')::int as logs_30d,
        greatest(
          coalesce((select max(a.created_at) from activity a where a.user_id = p.id), 'epoch'::timestamptz),
          coalesce((select max(t.last_seen_at) from push_tokens t where t.user_id = p.id), 'epoch'::timestamptz)
        ) as last_active,
        coalesce((select total_points from leaderboard_scores l where l.user_id = p.id), 0)::int as total_points,
        (select array_agg(b.type order by b.type) from behaviors b where b.user_id = p.id and b.active) as behaviors,
        exists(select 1 from account_deletion_requests d where d.user_id = p.id) as deletion_requested
      from profiles p
      left join auth.users au on au.id = p.id
      where p.id = ${id}
    `)
    const profile = Array.from(res)[0] ?? null

    await writeAudit({
      actorEmail: ctx.userEmail ?? "unknown",
      action: "user.detail.view",
      target: id,
    })

    return profile
  }),

  /**
   * Daily activity series (last N days) + derived current streak. Powers the
   * activity chart + streak KPI on the detail page. Admin only (per-user PII-ish
   * behavior), but not itself a PII field read, so no separate audit row (the
   * detail view already logged the access).
   */
  detailMetrics: piiProcedure
    .input(z.object({ userId: z.string().uuid(), days: z.number().int().min(7).max(365).default(90) }))
    .query(async ({ input }) => {
      const id = input.userId
      // Daily counts across all activity tables, gap-filled to a continuous series.
      const series = await db.execute<{ day: string; count: number }>(sql`
        with activity as (
          select user_id, created_at::date as d from child_logs
          union all select user_id, created_at::date from cycle_logs
          union all select user_id, created_at::date from pregnancy_logs
          union all select author_id, created_at::date from channel_posts
          union all select author_id, created_at::date from post_comments
        ),
        days as (
          select generate_series(
            (now() - make_interval(days => ${input.days - 1}))::date,
            now()::date,
            make_interval(days => 1)
          )::date as day
        )
        select to_char(days.day, 'YYYY-MM-DD') as day,
               coalesce((select count(*) from activity a where a.user_id = ${id} and a.d = days.day), 0)::int as count
        from days order by days.day
      `)

      // Current streak: consecutive days (ending today or yesterday) with >=1 log.
      const streakRes = await db.execute<{ streak: number }>(sql`
        with days as (
          select distinct d from (
            select created_at::date as d from child_logs where user_id = ${id}
            union select created_at::date from cycle_logs where user_id = ${id}
            union select created_at::date from pregnancy_logs where user_id = ${id}
          ) x
          where d <= now()::date
        ),
        islands as (
          select d, d - (row_number() over (order by d))::int as grp from days
        ),
        runs as (
          select max(d) as run_end, count(*)::int as len from islands group by grp
        )
        select coalesce(max(len), 0)::int as streak
        from runs
        where run_end >= now()::date - 1
      `)

      const rows = Array.from(series).map((r) => ({ day: r.day, count: Number(r.count) }))
      const streak = Number(Array.from(streakRes)[0]?.streak ?? 0)
      return { series: rows, streak }
    }),

  /**
   * Change a user's subscription tier — a direct DB grant (comp/support tool),
   * audit-logged. Admin only. The grandma DB has a guard_subscription_tier
   * trigger that only permits tier changes from the service role; the command
   * center's Postgres connection IS the service role, so this succeeds where an
   * app-side write would be rejected.
   *
   * NOTE: this does NOT create a real paid RevenueCat subscription. It's a grant
   * that unlocks premium features in-app; a future RevenueCat promotional-
   * entitlement call can layer on without changing this interface.
   */
  setTier: adminProcedure
    .input(z.object({ userId: z.string().uuid(), tier: z.enum(TIERS), reason: z.string().max(200).optional() }))
    .mutation(async ({ ctx, input }) => {
      const before = await db.execute<{ subscription_tier: string }>(sql`
        select subscription_tier::text as subscription_tier from profiles where id = ${input.userId}
      `)
      const prev = Array.from(before)[0]?.subscription_tier
      if (prev === undefined) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" })

      const status = input.tier === "free" ? "free" : "premium"
      await db.execute(sql`
        update profiles
        set subscription_tier = ${input.tier}::subscription_tier,
            subscription_status = ${status}
        where id = ${input.userId}
      `)

      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "user.tier.set",
        target: input.userId,
        meta: { from: prev, to: input.tier, reason: input.reason ?? null },
      })

      return { from: prev, to: input.tier }
    }),

  /** Canned segments: quick counts for the common cohorts. Viewer+. */
  segments: protectedProcedure.query(async () => {
    // Behavior counts are DISTINCT USERS enrolled in each behavior (behaviors
    // table), so a multi-behavior user is counted in each — matching the list's
    // multi-mode display. 'cycle' == pre_pregnancy. Users with no behaviors rows
    // fall back to their journey_mode so nobody is missed. These segments
    // intentionally overlap; `total` is distinct users.
    const res = await db.execute<{ segment: string; count: number }>(sql`
      with enrolled as (
        select distinct p.id, case when b.type = 'cycle' then 'pre_pregnancy' else b.type end as mode
        from profiles p join behaviors b on b.user_id = p.id and b.active
        union
        select p.id, p.journey_mode as mode
        from profiles p
        where p.journey_mode is not null
          and not exists (select 1 from behaviors b where b.user_id = p.id and b.active)
      )
      select 'pregnancy' as segment, count(*)::int as count from enrolled where mode = 'pregnancy'
      union all select 'pre_pregnancy', count(*)::int from enrolled where mode = 'pre_pregnancy'
      union all select 'kids', count(*)::int from enrolled where mode = 'kids'
      union all select 'premium', count(*)::int from profiles where subscription_tier <> 'free'
      union all select 'total', count(*)::int from profiles
    `)
    return Array.from(res).map((r) => ({ segment: r.segment, count: Number(r.count) }))
  }),
})
