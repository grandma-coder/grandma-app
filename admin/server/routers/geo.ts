import { z } from "zod"
import { sql, type SQL } from "drizzle-orm"
import { router, protectedProcedure, piiProcedure } from "../trpc"
import { db } from "@/db"
import { writeAudit } from "@/lib/audit"
import { mergeCounts, foldSmall } from "@/lib/geo"

const country = z.string().regex(/^([A-Z]{2}|OTHER)$/, "Expected ISO 3166-1 alpha-2 (uppercase) or OTHER")
// '?' = signups from that country whose region is unknown (null).
const region = z.string().regex(/^([A-Z0-9]{1,3}|\?)$/)
const place = z.object({ country, region: region.optional(), city: z.string().trim().min(1).max(80).optional() })

/** Below this many people a city is folded into "others" for viewers (admins see every city). */
export const VIEWER_MIN_CITY = 3
const PEOPLE_LIMIT = 200

type Row = Record<string, unknown>
const rows = async <T extends Row>(q: SQL) => Array.from(await db.execute<T>(q))

// waitlist.region/city arrive with migrations/0019_waitlist_place.sql. Until it is applied the map is by
// country only. Only a positive answer is cached, so applying the migration needs no redeploy.
let placeReady = false
async function hasPlace(): Promise<boolean> {
  if (placeReady) return true
  const [r] = await rows<{ ok: boolean }>(sql`
    select exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'waitlist' and column_name = 'city') as ok`)
  placeReady = Boolean(r?.ok)
  return placeReady
}

function placeWhere(p: z.infer<typeof place>, withPlace: boolean): SQL {
  const parts: SQL[] = [sql`w.country = ${p.country}`]
  if (withPlace && p.region) parts.push(p.region === "?" ? sql`w.region is null` : sql`w.region = ${p.region}`)
  if (withPlace && p.city) parts.push(sql`w.city = ${p.city}`)
  return sql`where ${sql.join(parts, sql` and `)}`
}

/**
 * Pessoas › Mapa — where the waitlist and the app's accounts are. Counts are viewer+; the people
 * behind a place (names, emails) are admin-only and audited, like every other PII read.
 * App accounts only carry a country (profiles.country_code); region and city exist for waitlist
 * signups from 0019 on.
 */
export const geoRouter = router({
  overview: protectedProcedure.query(async () => {
    const [wl, app, totals, ready] = await Promise.all([
      rows<{ key: string; n: number }>(sql`select country as key, count(*)::int as n from public.waitlist group by 1`),
      rows<{ key: string; n: number }>(sql`
        select upper(country_code) as key, count(*)::int as n from profiles
        where country_code ~* '^[a-z]{2}$' group by 1`),
      rows<{ waitlist: number; app: number; app_unknown: number; waitlist_7d: number; app_7d: number }>(sql`
        select (select count(*) from public.waitlist)::int as waitlist,
               (select count(*) from public.waitlist where created_at > now() - interval '7 days')::int as waitlist_7d,
               (select count(*) from profiles)::int as app,
               (select count(*) from profiles where created_at > now() - interval '7 days')::int as app_7d,
               (select count(*) from profiles where country_code is null or country_code !~* '^[a-z]{2}$')::int as app_unknown`),
      hasPlace(),
    ])
    const t = totals[0]
    return {
      countries: mergeCounts(wl.map((r) => ({ key: r.key, n: Number(r.n) })), app.map((r) => ({ key: r.key, n: Number(r.n) }))),
      totals: {
        waitlist: Number(t?.waitlist ?? 0),
        waitlist7d: Number(t?.waitlist_7d ?? 0),
        app: Number(t?.app ?? 0),
        app7d: Number(t?.app_7d ?? 0),
        appUnknown: Number(t?.app_unknown ?? 0),
      },
      placeReady: ready,
    }
  }),

  /** One country: its regions and cities (waitlist), and what phase people there are in. */
  country: protectedProcedure.input(z.object({ country })).query(async ({ ctx, input }) => {
    const ready = await hasPlace()
    const where = sql`where w.country = ${input.country}`
    const [modes, appModes, regions, cities] = await Promise.all([
      rows<{ key: string; n: number }>(sql`select w.mode as key, count(*)::int as n from public.waitlist w ${where} group by 1 order by 2 desc`),
      rows<{ key: string; n: number }>(sql`
        select coalesce(journey_mode, '?') as key, count(*)::int as n from profiles
        where upper(country_code) = ${input.country} group by 1 order by 2 desc`),
      ready
        ? rows<{ key: string | null; n: number }>(sql`select w.region as key, count(*)::int as n from public.waitlist w ${where} group by 1 order by 2 desc`)
        : Promise.resolve([]),
      ready
        ? rows<{ city: string; region: string | null; n: number }>(sql`
            select w.city, w.region, count(*)::int as n from public.waitlist w ${where} and w.city is not null
            group by 1, 2 order by 3 desc, 1 limit 300`)
        : Promise.resolve([]),
    ])
    const min = ctx.role === "admin" ? 1 : VIEWER_MIN_CITY
    const cityRows = cities.map((c) => ({ city: c.city as string | null, region: c.region, n: Number(c.n), places: 1 }))
    return {
      country: input.country,
      placeReady: ready,
      modes: modes.map((r) => ({ key: r.key, n: Number(r.n) })),
      appModes: appModes.map((r) => ({ key: r.key, n: Number(r.n) })),
      regions: regions.map((r) => ({ key: r.key ?? "?", n: Number(r.n) })),
      // city null = the folded "others" bucket; places = how many cities it stands for.
      cities: foldSmall(cityRows, min, (n, places) => ({ city: null, region: null, n, places })),
    }
  }),

  /** The people in a place: waitlist signups and, for a whole country, app accounts. Admin + audited. */
  people: piiProcedure.input(place).query(async ({ ctx, input }) => {
    const ready = await hasPlace()
    const narrowed = ready && Boolean(input.region || input.city)
    const [wl, app] = await Promise.all([
      rows<{ id: string; email: string; name: string | null; mode: string; region?: string | null; city?: string | null; created_at: string | Date; signed_up: boolean }>(sql`
        select w.id, w.email, w.name, w.mode, ${ready ? sql`w.region, w.city,` : sql``} w.created_at,
               exists (select 1 from auth.users au where lower(au.email) = w.email) as signed_up
        from public.waitlist w ${placeWhere(input, ready)}
        order by w.created_at desc limit ${PEOPLE_LIMIT}`),
      // App accounts have no region/city, so a narrower place lists only the waitlist.
      narrowed
        ? Promise.resolve([])
        : rows<{ id: string; email: string | null; name: string | null; journey_mode: string | null; created_at: string | Date | null }>(sql`
            select id, email, name, journey_mode, created_at from profiles
            where upper(country_code) = ${input.country}
            order by created_at desc nulls last limit ${PEOPLE_LIMIT}`),
    ])
    await writeAudit({ actorEmail: ctx.userEmail ?? "unknown", action: "geo.people", meta: { ...input } })
    const iso = (v: string | Date | null) => (v === null ? null : new Date(v).toISOString())
    return {
      limit: PEOPLE_LIMIT,
      narrowed,
      waitlist: wl.map((r) => ({
        id: r.id, email: r.email, name: r.name, mode: r.mode, region: r.region ?? null, city: r.city ?? null,
        createdAt: iso(r.created_at), signedUp: Boolean(r.signed_up),
      })),
      app: app.map((r) => ({ id: r.id, email: r.email, name: r.name, journeyMode: r.journey_mode, createdAt: iso(r.created_at) })),
    }
  }),
})
