import { sql, type SQL } from "drizzle-orm"
import { router, protectedProcedure } from "../trpc"
import { db } from "@/db"
import { OPEN_REPORT } from "./moderation"

/** One count; null when its query failed, so one broken source never blanks the others. */
async function count(q: SQL): Promise<number | null> {
  try {
    const [r] = Array.from(await db.execute<{ n: number }>(q))
    return Number(r?.n ?? 0)
  } catch (err) {
    console.error("[ops] count failed", err)
    return null
  }
}

/**
 * Ops — what needs a person today. Feeds the home "Precisa de você" tiles and the sidebar
 * badges from the same numbers, so the two can never disagree. Counts only, viewer+.
 */
export const opsRouter = router({
  attention: protectedProcedure.query(async () => {
    const [support, reports, waitlistToday, waitlistPending, newUsers7d, newWaitlist7d] = await Promise.all([
      count(sql`select count(*)::int as n from support_tickets where status in ('open', 'in_progress')`),
      count(sql`select count(*)::int as n from content_reports where ${OPEN_REPORT}`),
      count(sql`select count(*)::int as n from public.waitlist where created_at >= current_date`),
      count(sql`select count(*)::int as n from public.waitlist where invited_at is null`),
      count(sql`select count(*)::int as n from profiles where created_at > now() - interval '7 days'`),
      count(sql`select count(*)::int as n from public.waitlist where created_at > now() - interval '7 days'`),
    ])
    return { support, reports, waitlistToday, waitlistPending, newUsers7d, newWaitlist7d, at: new Date().toISOString() }
  }),
})
