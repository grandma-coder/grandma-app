import { z } from "zod"
import { sql, inArray, and, isNull } from "drizzle-orm"
import { router, protectedProcedure, piiProcedure, adminProcedure } from "../trpc"
import { db } from "@/db"
import { waitlist, betaTesters } from "@/db/schema"
import { writeAudit } from "@/lib/audit"
import { waitlistFilterSchema, buildWaitlistWhere, toCsv, type WaitlistRowOut } from "@/lib/waitlist"

const PAGE_SIZE = 50
const EXPORT_LIMIT = 20_000

type RawRow = {
  id: string; email: string; name: string | null; mode: string; locale: string; country: string; notify_launch: boolean
  utm_source: string | null; created_at: string | Date; invited_at: string | Date | null; signed_up: boolean
  [k: string]: unknown
}
const iso = (v: string | Date | null) => (v === null ? null : new Date(v).toISOString())
const toOut = (r: RawRow): WaitlistRowOut => ({
  id: r.id, email: r.email, name: r.name, mode: r.mode, locale: r.locale, country: r.country, notifyLaunch: r.notify_launch,
  utmSource: r.utm_source, createdAt: iso(r.created_at)!, invitedAt: iso(r.invited_at), signedUp: r.signed_up,
})

function selectRows(where: ReturnType<typeof buildWaitlistWhere>, limit: number, offset: number) {
  return db.execute<RawRow>(sql`
    select w.id, w.email, w.name, w.mode, w.locale, w.country, w.notify_launch, w.utm_source, w.created_at, w.invited_at,
      exists (select 1 from auth.users au where lower(au.email) = w.email) as signed_up
    from public.waitlist w
    ${where}
    order by w.created_at asc
    limit ${limit} offset ${offset}
  `)
}

type Count<K extends string> = { [k in K]: string } & { count: number; [k: string]: unknown }
const groupBy = <K extends "mode" | "locale" | "country">(col: K) =>
  db.execute<Count<K>>(sql`select ${sql.raw(col)} as ${sql.raw(col)}, count(*)::int as count from public.waitlist group by 1 order by 2 desc`)

/** Waitlist — marketing-site signups. Aggregates are viewer+; anything with an email is admin + audited. */
export const waitlistRouter = router({
  stats: protectedProcedure.query(async () => {
    const [totals, daily, byCountry, byMode, byLocale] = await Promise.all([
      db.execute<{ total: number; last7: number; [k: string]: unknown }>(sql`
        select count(*)::int as total, count(*) filter (where created_at > now() - interval '7 days')::int as last7
        from public.waitlist`),
      db.execute<{ day: string; count: number; [k: string]: unknown }>(sql`
        select to_char(d::date, 'YYYY-MM-DD') as day, count(w.id)::int as count
        from generate_series(current_date - 89, current_date, interval '1 day') d
        left join public.waitlist w on w.created_at::date = d::date
        group by d order by d`),
      groupBy("country"),
      groupBy("mode"),
      groupBy("locale"),
    ])
    const t = Array.from(totals)[0]
    return {
      total: t?.total ?? 0,
      last7: t?.last7 ?? 0,
      daily: Array.from(daily).map((r) => ({ day: r.day, count: r.count })),
      byCountry: Array.from(byCountry).map((r) => ({ country: r.country, count: r.count })),
      byMode: Array.from(byMode).map((r) => ({ mode: r.mode, count: r.count })),
      byLocale: Array.from(byLocale).map((r) => ({ locale: r.locale, count: r.count })),
    }
  }),

  list: piiProcedure
    .input(z.object({ filter: waitlistFilterSchema, page: z.number().int().min(0).default(0) }))
    .query(async ({ ctx, input }) => {
      const where = buildWaitlistWhere(input.filter)
      const [rows, count] = await Promise.all([
        selectRows(where, PAGE_SIZE, input.page * PAGE_SIZE),
        db.execute<{ n: number; [k: string]: unknown }>(sql`select count(*)::int as n from public.waitlist w ${where}`),
      ])
      await writeAudit({ actorEmail: ctx.userEmail ?? "unknown", action: "waitlist.list", meta: { filter: input.filter, page: input.page } })
      return { rows: Array.from(rows).map(toOut), total: Array.from(count)[0]?.n ?? 0, pageSize: PAGE_SIZE }
    }),

  exportCsv: piiProcedure.input(z.object({ filter: waitlistFilterSchema })).mutation(async ({ ctx, input }) => {
    const rows = Array.from(await selectRows(buildWaitlistWhere(input.filter), EXPORT_LIMIT, 0)).map(toOut)
    await writeAudit({ actorEmail: ctx.userEmail ?? "unknown", action: "waitlist.export", meta: { filter: input.filter, count: rows.length } })
    return { csv: toCsv(rows), count: rows.length }
  }),

  promoteToBeta: adminProcedure
    .input(z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const actor = ctx.userEmail ?? "unknown"
      const result = await db.transaction(async (tx) => {
        const rows = await tx.select().from(waitlist).where(inArray(waitlist.id, input.ids))
        if (rows.length === 0) return { promoted: 0, alreadyBeta: 0 }
        const inserted = await tx
          .insert(betaTesters)
          .values(rows.map((r) => ({ email: r.email, name: r.name, platform: "both", note: `from waitlist · ${r.country}`, invitedBy: actor })))
          .onConflictDoNothing({ target: betaTesters.email })
          .returning({ id: betaTesters.id })
        await tx.update(waitlist).set({ invitedAt: new Date(), invitedBy: actor }).where(and(inArray(waitlist.id, input.ids), isNull(waitlist.invitedAt)))
        return { promoted: inserted.length, alreadyBeta: rows.length - inserted.length }
      })
      await writeAudit({ actorEmail: actor, action: "waitlist.promote", meta: { ids: input.ids, ...result } })
      return result
    }),
})
