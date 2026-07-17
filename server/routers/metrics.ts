import { z } from "zod"
import { sql } from "drizzle-orm"
import { router, protectedProcedure } from "../trpc"
import { db } from "@/db"
import { gapFillDaily, computeFunnelStages, wowPct, type DayRow, type FunnelStage } from "@/lib/reporting/transforms"

const range = z.object({
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

function priorWindow(since: string, until: string): { since: string; until: string } {
  const s = new Date(since + "T00:00:00Z")
  const u = new Date(until + "T00:00:00Z")
  const days = Math.round((u.getTime() - s.getTime()) / 86400000) + 1
  const priorUntil = new Date(s)
  priorUntil.setUTCDate(priorUntil.getUTCDate() - 1)
  const priorSince = new Date(priorUntil)
  priorSince.setUTCDate(priorSince.getUTCDate() - (days - 1))
  return { since: priorSince.toISOString().slice(0, 10), until: priorUntil.toISOString().slice(0, 10) }
}

export interface Totals {
  totalUsers: number
  premiumUsers: number
  dau: number
  wau: number
  mau: number
  modeSplit: { pre: number; pregnancy: number; kids: number }
}

export const metricsRouter = router({
  /** Headline totals + a signups/DAU timeseries (gap-filled) with WoW deltas. */
  kpis: protectedProcedure.input(range).query(async ({ input }) => {
    const prior = priorWindow(input.since, input.until)

    const [totalsRows, dailyRows, priorDailyRows] = await Promise.all([
      db.execute<Record<string, number | string>>(sql`select * from cc_get_totals()`),
      db.execute<{ day: string; dau: number; new_signups: number }>(
        sql`select to_char(day,'YYYY-MM-DD') as day, dau, new_signups from cc_get_daily_activity(${input.since}::date, ${input.until}::date)`,
      ),
      db.execute<{ dau: number; new_signups: number }>(
        sql`select dau, new_signups from cc_get_daily_activity(${prior.since}::date, ${prior.until}::date)`,
      ),
    ])

    const t = Array.from(totalsRows)[0] ?? {}
    const totals: Totals = {
      totalUsers: Number(t.total_users ?? 0),
      premiumUsers: Number(t.premium_users ?? 0),
      dau: Number(t.dau ?? 0),
      wau: Number(t.wau ?? 0),
      mau: Number(t.mau ?? 0),
      modeSplit: { pre: Number(t.mode_pre ?? 0), pregnancy: Number(t.mode_preg ?? 0), kids: Number(t.mode_kids ?? 0) },
    }

    const daily: DayRow[] = gapFillDaily(
      Array.from(dailyRows).map((r) => ({ day: r.day, dau: Number(r.dau), newSignups: Number(r.new_signups) })),
      input.since,
      input.until,
    )

    const curSignups = daily.reduce((a, r) => a + r.newSignups, 0)
    const priorSignups = Array.from(priorDailyRows).reduce((a, r) => a + Number(r.new_signups), 0)
    const signupsWow = wowPct(curSignups, priorSignups)

    return { totals, daily, curSignups, signupsWow }
  }),

  /** Activation funnel over the signup-cohort window, with conversion %s. */
  funnel: protectedProcedure.input(range).query(async ({ input }) => {
    const rows = await db.execute<{ stage: string; count: number }>(
      sql`select stage, count from cc_get_activation_funnel(${input.since}::date, ${input.until}::date)`,
    )
    const stages: FunnelStage[] = computeFunnelStages(
      Array.from(rows).map((r) => ({ stage: r.stage, count: Number(r.count) })),
    )
    return { stages }
  }),
})
