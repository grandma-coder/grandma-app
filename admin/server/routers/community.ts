import { z } from "zod"
import { sql } from "drizzle-orm"
import { router, protectedProcedure } from "../trpc"
import { db } from "@/db"
import { gapFillDaily } from "@/lib/reporting/transforms"

const range = z.object({
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export interface CommunityTotals {
  totalChannels: number
  totalPosts: number
  totalMembers: number
  totalComments: number
  totalReactions: number
  activeChannels7d: number
  postsToday: number
  pendingModeration: number
}

export interface ChannelRow {
  id: string
  name: string
  category: string | null
  channelType: string | null
  memberCount: number
  postCount: number
  avgRating: number | null
  ratingCount: number
  lastPostAt: string | null
}

export const communityRouter = router({
  /** High-level community KPIs + the channels list + category breakdown. Viewer+. */
  overview: protectedProcedure.query(async () => {
    const [totalsRows, channelRows, categoryRows] = await Promise.all([
      db.execute<Record<string, string | number>>(sql`select * from cc_get_community_totals()`),
      db.execute<{
        id: string; name: string; category: string | null; channel_type: string | null
        member_count: number; post_count: number; avg_rating: number | null; rating_count: number; last_post_at: string | null
      }>(sql`select id, name, category, channel_type, member_count, post_count, avg_rating, rating_count,
                to_char(last_post_at,'YYYY-MM-DD"T"HH24:MI:SSZ') as last_post_at from cc_get_channels()`),
      db.execute<{ category: string; channels: number; posts: number }>(sql`select * from cc_get_channel_categories()`),
    ])

    const t = Array.from(totalsRows)[0] ?? {}
    const totals: CommunityTotals = {
      totalChannels: Number(t.total_channels ?? 0),
      totalPosts: Number(t.total_posts ?? 0),
      totalMembers: Number(t.total_members ?? 0),
      totalComments: Number(t.total_comments ?? 0),
      totalReactions: Number(t.total_reactions ?? 0),
      activeChannels7d: Number(t.active_channels_7d ?? 0),
      postsToday: Number(t.posts_today ?? 0),
      pendingModeration: Number(t.pending_moderation ?? 0),
    }

    const channels: ChannelRow[] = Array.from(channelRows).map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      channelType: c.channel_type,
      memberCount: Number(c.member_count ?? 0),
      postCount: Number(c.post_count ?? 0),
      avgRating: c.avg_rating == null ? null : Number(c.avg_rating),
      ratingCount: Number(c.rating_count ?? 0),
      lastPostAt: c.last_post_at,
    }))

    const categories = Array.from(categoryRows).map((r) => ({
      category: r.category,
      channels: Number(r.channels),
      posts: Number(r.posts),
    }))

    return { totals, channels, categories }
  }),

  /** Posts-per-day timeseries (gap-filled) over the window. Viewer+. */
  postsDaily: protectedProcedure.input(range).query(async ({ input }) => {
    const rows = await db.execute<{ day: string; posts: number }>(
      sql`select to_char(day,'YYYY-MM-DD') as day, posts from cc_get_channel_posts_daily(${input.since}::date, ${input.until}::date)`,
    )
    // Reuse gapFillDaily's shape (dau/newSignups); map posts → its own field.
    const raw = Array.from(rows).map((r) => ({ day: r.day, dau: Number(r.posts), newSignups: 0 }))
    const filled = gapFillDaily(raw, input.since, input.until)
    return filled.map((r) => ({ day: r.day, posts: r.dau }))
  }),
})
