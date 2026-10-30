# grandma.app waitlist site (BR first, then US) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A lean, visual PT/EN site whose only job is collecting a waitlist for the Brazil-first, then-US launch; signups (with country) land in Supabase and are managed from a Waitlist pillar in grandma-command-center; every app image is a real recording from the iOS Simulator.

**Architecture:** `public.waitlist` + `waitlist_join()` live in grandma's Supabase Postgres, owned by grandma-command-center. The site (Next 16 + next-intl, `/en` and `/pt`) writes through a server action using the service-role key. A capture pipeline in this repo (Maestro + `simctl` + ffmpeg) records the installed dev-client app with demo data and outputs looping videos into `public/media/app/<lang>/`. The UI is rebuilt on the real Diffuse v3 system (Cormorant Garamond / Hanken Grotesk / Space Mono, generative fields, glass).

**Tech Stack:** Next.js 16, React 19, Tailwind 4, next-intl 4, zod 3 (site) / zod 4 (CC), @supabase/supabase-js 2, Drizzle + postgres-js, tRPC 11, Clerk, Vitest, Maestro, xcrun simctl, ffmpeg.

**Spec:** `docs/superpowers/specs/2026-10-30-site-waitlist-diffuse-i18n-design.md` (revision 2). Visual reference: `docs/mockups/2026-10-30-diffuse-site-and-waitlist.html`.

**Repos and paths:**
- SITE = `/Users/igorcarvalhorodrigues/dev/v0-grandma-app` (branch `feat/waitlist-diffuse-i18n`, exists)
- CC = `/Users/igorcarvalhorodrigues/dev/grandma-command-center` (branch `feat/waitlist-pillar`, created in Task 1)
- APP = `/Users/igorcarvalhorodrigues/dev/grandma-app` (read-only; never modified; used to install/run the dev client)

## Global Constraints

- Never modify the `grandma-app` repo. Running `npm start` / `npm run eas:install:sim` there is allowed.
- Locales are exactly `en` and `pt`; `pt` = pt-BR (`<html lang="pt-BR">`, hreflang `pt-BR`).
- Modes are exactly `pre`, `preg`, `kids`, `meno`. No caregiver anywhere on the site.
- Countries are exactly `BR`, `US`, `OTHER`.
- Waitlist emails are stored trimmed + lowercased; `created_at` never changes after insert.
- Service-role key only in `server-only` modules.
- CC tables: RLS on, no policies. Every PII read/export calls `writeAudit`. CC DB results: `Array.from(res)`.
- Diffuse v3 per `APP/docs/design/design-system-v3.html`: display = **Cormorant Garamond** (300/400 + italic, italic "feeling words" in `--ink-2`); reading = Hanken Grotesk 300–600; labels/data = Space Mono. No filled black buttons except the small `.gchip` inside glass panels. Primary CTA = mono label + arrow on a hairline.
- No pricing page, no prices anywhere on the site.
- No fabricated numbers on the site.
- Every app image comes from `public/media/app/` (capture pipeline). No hand-drawn app screens.
- PT glossary: "a Vovó" in prose; "grandma.app" brand; Ciclo / Gravidez / Filhos / Menopausa; "você".
- Capture uses a demo account only; no real user data in any frame.

## Review Focus

1. **Same email with different case/whitespace, possibly a different country**: one row, original `created_at`, country updated, success both times. Pinned in Task 1 (SQL verify) and Task 13 (schema test).
2. **Geo header missing or unexpected (`DE`, empty, lowercase `br`)**: form defaults to Brasil on `/pt`, Other on `/en`, `BR`/`US` mapped case-insensitively. Pinned in Task 8 (`countryFromGeo` tests).
3. **CSV opened in Excel with `=HYPERLINK(...)` in a name**: rendered as text. Pinned in Task 2.
4. **Visitor with reduced motion, iOS Low Power Mode, or a failed video**: poster image shows, no layout shift. Pinned in Task 9 (`AppVideo`) and Task 15 manual check.
5. **Form submitted before hydration / without JS**: server action still runs and renders the result. Pinned in Task 14 Step 5, item 6.

---

## Part A — grandma-command-center

### Task 1: Waitlist table (with country), join function, Drizzle schema

**Files:**
- Create: `CC/migrations/0018_waitlist.sql`, `CC/scripts/verify-waitlist.mjs`
- Modify: `CC/db/schema/center.ts` (append after `betaTesters`)

**Interfaces:**
- Produces: `public.waitlist`; `public.waitlist_join(p_email text, p_name text, p_mode text, p_locale text, p_country text, p_notify_launch boolean, p_utm_source text, p_utm_medium text, p_utm_campaign text, p_referrer text, p_ip_hash text) returns text` (`'ok' | 'rate_limited'`); Drizzle `waitlist`, `WAITLIST_MODES`, `WAITLIST_LOCALES`, `WAITLIST_COUNTRIES` from `@/db/schema`.

- [ ] **Step 1: Branch**

```bash
cd /Users/igorcarvalhorodrigues/dev/grandma-command-center
git checkout main && git pull && git checkout -b feat/waitlist-pillar
```

- [ ] **Step 2: Migration** — `migrations/0018_waitlist.sql`:

```sql
-- Waitlist — signups from the grandma.app marketing site (v0-grandma-app).
-- Launch is Brazil first, then the US, so country is first-class.
-- Command-center-owned. The site WRITES only through waitlist_join() with the
-- service role; the console READS, exports and promotes rows to beta_testers.
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.waitlist (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  name          TEXT,
  mode          TEXT NOT NULL CHECK (mode IN ('pre','preg','kids','meno')),
  locale        TEXT NOT NULL CHECK (locale IN ('en','pt')),
  country       TEXT NOT NULL DEFAULT 'OTHER' CHECK (country IN ('BR','US','OTHER')),
  notify_launch BOOLEAN NOT NULL DEFAULT false,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  referrer      TEXT,
  ip_hash       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_at    TIMESTAMPTZ,
  invited_by    TEXT,
  CONSTRAINT waitlist_email_key UNIQUE (email),
  CONSTRAINT waitlist_email_lower_chk CHECK (email = lower(email))
);

CREATE INDEX IF NOT EXISTS waitlist_created_at_idx ON public.waitlist (created_at DESC);
CREATE INDEX IF NOT EXISTS waitlist_country_created_idx ON public.waitlist (country, created_at);
CREATE INDEX IF NOT EXISTS waitlist_ip_hash_created_idx ON public.waitlist (ip_hash, created_at DESC);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
-- No policies: service role only.

CREATE OR REPLACE FUNCTION public.waitlist_join(
  p_email text, p_name text, p_mode text, p_locale text, p_country text, p_notify_launch boolean,
  p_utm_source text, p_utm_medium text, p_utm_campaign text, p_referrer text, p_ip_hash text
) RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_ip_hash IS NOT NULL AND (
    SELECT count(*) FROM public.waitlist
    WHERE ip_hash = p_ip_hash AND created_at > now() - interval '1 hour'
  ) >= 5 THEN
    RETURN 'rate_limited';
  END IF;

  INSERT INTO public.waitlist
    (email, name, mode, locale, country, notify_launch, utm_source, utm_medium, utm_campaign, referrer, ip_hash)
  VALUES
    (lower(trim(p_email)), nullif(trim(p_name), ''), p_mode, p_locale, coalesce(p_country, 'OTHER'),
     coalesce(p_notify_launch, false), p_utm_source, p_utm_medium, p_utm_campaign, p_referrer, p_ip_hash)
  ON CONFLICT (email) DO UPDATE SET
    name          = coalesce(excluded.name, waitlist.name),
    mode          = excluded.mode,
    locale        = excluded.locale,
    country       = excluded.country,
    notify_launch = excluded.notify_launch,
    updated_at    = now();

  RETURN 'ok';
END
$$;

REVOKE ALL ON FUNCTION public.waitlist_join(text,text,text,text,text,boolean,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waitlist_join(text,text,text,text,text,boolean,text,text,text,text,text) TO service_role;

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 3: Drizzle** — append to `db/schema/center.ts` after `betaTesters` (helpers already imported on line 1):

```ts
export const WAITLIST_MODES = ["pre", "preg", "kids", "meno"] as const
export type WaitlistMode = (typeof WAITLIST_MODES)[number]
export const WAITLIST_LOCALES = ["en", "pt"] as const
export type WaitlistLocale = (typeof WAITLIST_LOCALES)[number]
export const WAITLIST_COUNTRIES = ["BR", "US", "OTHER"] as const
export type WaitlistCountry = (typeof WAITLIST_COUNTRIES)[number]

/** Marketing-site waitlist. Written by the site via waitlist_join(); see migrations/0018_waitlist.sql. */
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  mode: text("mode").notNull(),
  locale: text("locale").notNull(),
  country: text("country").notNull().default("OTHER"),
  notifyLaunch: boolean("notify_launch").notNull().default(false),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  referrer: text("referrer"),
  ipHash: text("ip_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  invitedBy: text("invited_by"),
})
```

If `db/schema/index.ts` lists exports by name instead of `export *`, add the new names.

- [ ] **Step 4: Apply**

```bash
set -a; source .env.local; set +a
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/0018_waitlist.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/0018_waitlist.sql   # idempotent: must succeed again
```

Without `psql`: `node -e "const s=require('postgres')(process.env.DATABASE_URL,{prepare:false});s.file('migrations/0018_waitlist.sql').then(()=>s.end())"`.

- [ ] **Step 5: Verification script** — `scripts/verify-waitlist.mjs`:

```js
// Throwaway live check for migrations/0018_waitlist.sql. Uses unique test
// emails and deletes everything it creates. Run: node scripts/verify-waitlist.mjs
import postgres from "postgres"

const sql = postgres(process.env.DATABASE_URL, { prepare: false })
const tag = `verify-${Date.now()}`
const email = `${tag}@example.com`
const ip = `iphash-${tag}`
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exitCode = 1 } else console.log("ok:", m) }
const join = (e, name, mode, country, ipHash = ip) =>
  sql`select public.waitlist_join(${e}, ${name}, ${mode}, 'pt', ${country}, true, 'ig', 'social', 'launch', null, ${ipHash}) as r`

try {
  const [a] = await join(`  ${email.toUpperCase()} `, "Ana", "preg", "BR")
  assert(a.r === "ok", "first join ok")
  const [row1] = await sql`select * from public.waitlist where email = ${email}`
  assert(row1?.country === "BR", "country stored")

  await new Promise((r) => setTimeout(r, 1100))
  const [b] = await join(email, null, "kids", "US")
  assert(b.r === "ok", "repeat join ok")
  const rows = await sql`select * from public.waitlist where email = ${email}`
  assert(rows.length === 1, "one row")
  assert(rows[0].created_at.getTime() === row1.created_at.getTime(), "created_at unchanged")
  assert(rows[0].mode === "kids" && rows[0].country === "US", "mode + country updated")
  assert(rows[0].name === "Ana", "name kept when new name is null")
  assert(rows[0].utm_source === "ig", "first-touch utm kept")

  for (let i = 0; i < 4; i++) await join(`${tag}-${i}@example.com`, null, "pre", "BR")
  const [c] = await join(`${tag}-x@example.com`, null, "pre", "BR")
  assert(c.r === "rate_limited", "6th signup from same ip_hash in 1h is rate_limited")
  const [d] = await join(`${tag}-y@example.com`, null, "pre", "OTHER", null)
  assert(d.r === "ok", "null ip_hash not rate limited")

  let threw = false
  try { await join(`${tag}-z@example.com`, null, "pre", "DE", null) } catch { threw = true }
  assert(threw, "unknown country rejected by CHECK")

  const [{ has }] = await sql`select has_function_privilege('anon', 'public.waitlist_join(text,text,text,text,text,boolean,text,text,text,text,text)', 'execute') as has`
  assert(has === false, "anon cannot execute waitlist_join")
} finally {
  await sql`delete from public.beta_testers where email like ${tag + "%"}`
  await sql`delete from public.waitlist where email like ${tag + "%"}`
  await sql.end()
}
```

- [ ] **Step 6: Run** — `set -a; source .env.local; set +a; node scripts/verify-waitlist.mjs` → every line `ok:`, exit 0.

- [ ] **Step 7: Commit**

```bash
pnpm typecheck
git add migrations/0018_waitlist.sql db/schema/center.ts scripts/verify-waitlist.mjs
git commit -m "feat(waitlist): waitlist table with country, waitlist_join() and Drizzle schema"
```

---

### Task 2: Pure waitlist helpers (filters, WHERE builder, CSV)

**Files:** Create `CC/lib/waitlist.ts`; Test `CC/lib/__tests__/waitlist.test.ts`

**Interfaces:**
- Consumes: `WAITLIST_MODES`, `WAITLIST_LOCALES`, `WAITLIST_COUNTRIES`.
- Produces: `waitlistFilterSchema` → `WaitlistFilter = { mode?; locale?; country?; from?; to?; invited: "all"|"invited"|"pending"; q? }`; `buildWaitlistWhere(f): SQL` (starts with `where`, alias `w`); `WaitlistRowOut = { id; email; name: string|null; mode; locale; country; notifyLaunch: boolean; utmSource: string|null; createdAt: string; invitedAt: string|null; signedUp: boolean }`; `toCsv(rows): string`.

- [ ] **Step 1: Failing tests** — `lib/__tests__/waitlist.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core"
import { waitlistFilterSchema, buildWaitlistWhere, toCsv, type WaitlistRowOut } from "../waitlist"

const dialect = new PgDialect()
const render = (f: unknown) => dialect.sqlToQuery(buildWaitlistWhere(waitlistFilterSchema.parse(f)))

describe("waitlistFilterSchema", () => {
  it("defaults invited to all", () => expect(waitlistFilterSchema.parse({}).invited).toBe("all"))
  it("rejects unknown mode and country", () => {
    expect(() => waitlistFilterSchema.parse({ mode: "care" })).toThrow()
    expect(() => waitlistFilterSchema.parse({ country: "DE" })).toThrow()
  })
  it("rejects a malformed date", () => expect(() => waitlistFilterSchema.parse({ from: "30/10/2026" })).toThrow())
})

describe("buildWaitlistWhere", () => {
  it("is a no-op when empty", () => expect(render({}).sql).toBe("where true"))
  it("combines every filter with parameters", () => {
    const q = render({ mode: "meno", locale: "pt", country: "BR", from: "2026-10-01", to: "2026-10-30", invited: "pending", q: "ana" })
    expect(q.sql).toContain("w.mode = $1")
    expect(q.sql).toContain("w.locale = $2")
    expect(q.sql).toContain("w.country = $3")
    expect(q.sql).toContain("w.created_at >= $4::date")
    expect(q.sql).toContain("w.created_at < ($5::date + 1)")
    expect(q.sql).toContain("w.invited_at is null")
    expect(q.sql).toContain("(w.email ilike $6 or w.name ilike $7)")
    expect(q.params).toEqual(["meno", "pt", "BR", "2026-10-01", "2026-10-30", "%ana%", "%ana%"])
  })
  it("escapes LIKE wildcards", () => expect(render({ q: "50%_off" }).params).toEqual(["%50\\%\\_off%", "%50\\%\\_off%"]))
})

const row = (o: Partial<WaitlistRowOut> = {}): WaitlistRowOut => ({
  id: "1", email: "ana@x.com", name: "Ana", mode: "preg", locale: "pt", country: "BR", notifyLaunch: true,
  utmSource: null, createdAt: "2026-10-30T12:00:00.000Z", invitedAt: null, signedUp: false, ...o,
})

describe("toCsv", () => {
  it("header + one line per row", () => {
    const [h, l] = toCsv([row()]).split("\r\n")
    expect(h).toBe("email,name,mode,locale,country,notify_launch,utm_source,created_at,invited_at,signed_up")
    expect(l).toBe("ana@x.com,Ana,preg,pt,BR,true,,2026-10-30T12:00:00.000Z,,false")
  })
  it("quotes commas, quotes and newlines", () =>
    expect(toCsv([row({ name: 'Ana, "Nana"\nSilva' })])).toContain('"Ana, ""Nana""\nSilva"'))
  it("neutralises spreadsheet formulas", () => {
    expect(toCsv([row({ name: '=HYPERLINK("x")' })])).toContain(`"'=HYPERLINK(""x"")"`)
    expect(toCsv([row({ name: "+1" })])).toContain(",'+1,")
    expect(toCsv([row({ name: "-1" })])).toContain(",'-1,")
    expect(toCsv([row({ name: "@SUM(A1)" })])).toContain(",'@SUM(A1),")
  })
})
```

- [ ] **Step 2: Run** — `pnpm vitest run lib/__tests__/waitlist.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement** — `lib/waitlist.ts`:

```ts
import { z } from "zod"
import { sql, type SQL } from "drizzle-orm"
import { WAITLIST_MODES, WAITLIST_LOCALES, WAITLIST_COUNTRIES } from "@/db/schema"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")

export const waitlistFilterSchema = z.object({
  mode: z.enum(WAITLIST_MODES).optional(),
  locale: z.enum(WAITLIST_LOCALES).optional(),
  country: z.enum(WAITLIST_COUNTRIES).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  invited: z.enum(["all", "invited", "pending"]).default("all"),
  q: z.string().trim().max(120).optional(),
})
export type WaitlistFilter = z.infer<typeof waitlistFilterSchema>

export interface WaitlistRowOut {
  id: string
  email: string
  name: string | null
  mode: string
  locale: string
  country: string
  notifyLaunch: boolean
  utmSource: string | null
  createdAt: string
  invitedAt: string | null
  signedUp: boolean
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`)

/** WHERE clause over `public.waitlist w`. Always starts with `where`. */
export function buildWaitlistWhere(f: WaitlistFilter): SQL {
  const parts: SQL[] = []
  if (f.mode) parts.push(sql`w.mode = ${f.mode}`)
  if (f.locale) parts.push(sql`w.locale = ${f.locale}`)
  if (f.country) parts.push(sql`w.country = ${f.country}`)
  if (f.from) parts.push(sql`w.created_at >= ${f.from}::date`)
  if (f.to) parts.push(sql`w.created_at < (${f.to}::date + 1)`)
  if (f.invited === "invited") parts.push(sql`w.invited_at is not null`)
  if (f.invited === "pending") parts.push(sql`w.invited_at is null`)
  if (f.q) {
    const like = `%${escapeLike(f.q)}%`
    parts.push(sql`(w.email ilike ${like} or w.name ilike ${like})`)
  }
  return parts.length === 0 ? sql`where true` : sql`where ${sql.join(parts, sql` and `)}`
}

const COLS: [string, (r: WaitlistRowOut) => string | boolean | null][] = [
  ["email", (r) => r.email], ["name", (r) => r.name], ["mode", (r) => r.mode], ["locale", (r) => r.locale],
  ["country", (r) => r.country], ["notify_launch", (r) => r.notifyLaunch], ["utm_source", (r) => r.utmSource],
  ["created_at", (r) => r.createdAt], ["invited_at", (r) => r.invitedAt], ["signed_up", (r) => r.signedUp],
]

function cell(v: string | boolean | null): string {
  if (v === null) return ""
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}` // OWASP CSV-injection guard
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(rows: WaitlistRowOut[]): string {
  return [COLS.map(([h]) => h).join(","), ...rows.map((r) => COLS.map(([, g]) => cell(g(r))).join(","))].join("\r\n")
}
```

- [ ] **Step 4: Run** → PASS. If only whitespace around `and` differs, fix the implementation.

- [ ] **Step 5: Commit** — `git add lib/waitlist.ts lib/__tests__/waitlist.test.ts && git commit -m "feat(waitlist): filters (incl. country), WHERE builder, formula-safe CSV"`

---

### Task 3: Waitlist tRPC router

**Files:** Create `CC/server/routers/waitlist.ts`, `CC/server/__tests__/waitlist-router.test.ts`; Modify `CC/server/routers/index.ts`, `CC/scripts/verify-waitlist.mjs`

**Interfaces:**
- Consumes: Task 1 + Task 2 exports; `router`, `protectedProcedure`, `piiProcedure`, `adminProcedure`; `writeAudit`.
- Produces: `trpc.waitlist.stats` → `{ total; last7; daily: {day; count}[]; byCountry: {country; count}[]; byMode: {mode; count}[]; byLocale: {locale; count}[] }`; `trpc.waitlist.list({ filter, page })` → `{ rows: WaitlistRowOut[]; total; pageSize: 50 }`; `trpc.waitlist.exportCsv({ filter })` → `{ csv; count }`; `trpc.waitlist.promoteToBeta({ ids })` → `{ promoted; alreadyBeta }`.

- [ ] **Step 1: Failing gate test** — `server/__tests__/waitlist-router.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest"
import type { TRPCError } from "@trpc/server"

vi.mock("@/db", () => ({ db: { execute: vi.fn(async () => []) } }))
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn(async () => true) }))

import { waitlistRouter } from "../routers/waitlist"
import type { Context } from "../context"

const ctx = (p: Partial<Context>): Context => ({ userId: null, userEmail: null, role: null, allowed: false, ...p })
const viewer = ctx({ userId: "v", userEmail: "v@grandma.app", role: "viewer", allowed: true })
const admin = ctx({ userId: "a", userEmail: "a@grandma.app", role: "admin", allowed: true })
const FORBIDDEN = { code: "FORBIDDEN" } as Partial<TRPCError>

describe("waitlist router", () => {
  it("viewer reads stats, including byCountry", async () => {
    const s = await waitlistRouter.createCaller(viewer).stats()
    expect(s).toMatchObject({ total: 0, byCountry: [] })
  })
  it("viewer is FORBIDDEN on list, export, promote", async () => {
    const c = waitlistRouter.createCaller(viewer)
    await expect(c.list({ filter: {}, page: 0 })).rejects.toMatchObject(FORBIDDEN)
    await expect(c.exportCsv({ filter: {} })).rejects.toMatchObject(FORBIDDEN)
    await expect(c.promoteToBeta({ ids: ["00000000-0000-4000-8000-000000000000"] })).rejects.toMatchObject(FORBIDDEN)
  })
  it("admin list writes an audit entry", async () => {
    const { writeAudit } = await import("@/lib/audit")
    await waitlistRouter.createCaller(admin).list({ filter: { country: "BR" }, page: 0 })
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "waitlist.list", actorEmail: "a@grandma.app" }))
  })
  it("promote rejects an empty id list", async () => {
    await expect(waitlistRouter.createCaller(admin).promoteToBeta({ ids: [] })).rejects.toMatchObject({ code: "BAD_REQUEST" } as Partial<TRPCError>)
  })
})
```

Run: `pnpm vitest run server/__tests__/waitlist-router.test.ts` → FAIL.

- [ ] **Step 2: Implement** — `server/routers/waitlist.ts`:

```ts
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
```

In `server/routers/index.ts`: `import { waitlistRouter } from "./waitlist"` and `waitlist: waitlistRouter,` after `graph: graphRouter,`.

- [ ] **Step 3: Run test** → PASS.

- [ ] **Step 4: Live promote check** — in `scripts/verify-waitlist.mjs`, before `} finally {`:

```js
  const [w] = await sql`select email, name from public.waitlist where email = ${email}`
  for (let i = 0; i < 2; i++)
    await sql`insert into public.beta_testers (email, name, platform, note, invited_by)
              values (${w.email}, ${w.name}, 'both', 'from waitlist', 'verify') on conflict (email) do nothing`
  const bt = await sql`select * from public.beta_testers where email = ${email}`
  assert(bt.length === 1, "promoting twice leaves one beta_testers row")
```

Run `node scripts/verify-waitlist.mjs` → all `ok:`.

- [ ] **Step 5: Commit**

```bash
pnpm typecheck && pnpm test
git add server/routers/waitlist.ts server/routers/index.ts server/__tests__/waitlist-router.test.ts scripts/verify-waitlist.mjs
git commit -m "feat(waitlist): router — stats by country, audited list/export, promote to beta"
```

---

### Task 4: Waitlist pillar UI and sidebar

**Files:** Create `CC/app/(app)/waitlist/page.tsx`, `WaitlistStats.tsx`, `WaitlistTable.tsx`; Modify `CC/components/CommandCenterSidebar.tsx`

**Interfaces:** Consumes Task 3 procedures; `createContext`; `trpc` from `@/lib/trpc`.

- [ ] **Step 1: Page** — `app/(app)/waitlist/page.tsx`:

```tsx
import { createContext } from "@/server/context"
import { WaitlistStats } from "./WaitlistStats"
import { WaitlistTable } from "./WaitlistTable"

/** Waitlist — marketing-site signups. Launch order: Brazil, then the US. Viewers see aggregates; admins also see the audited list. */
export default async function WaitlistPage() {
  const ctx = await createContext()
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">No access.</main>
  return (
    <main className="mx-auto max-w-6xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Audience</p>
      <h1 className="display text-3xl font-bold tracking-tight text-fg-primary">Waitlist</h1>
      <p className="mt-2 max-w-2xl text-sm text-fg-tertiary">
        People who joined from grandma.app. Brazil opens first, then the US. Within a country it&apos;s first come, first
        served — promote people to the beta roster when it&apos;s their turn.
      </p>
      <div className="mt-8 space-y-8">
        <WaitlistStats />
        {ctx.role === "admin" ? <WaitlistTable /> : <p className="text-sm text-fg-tertiary">The list of emails is visible to admins only.</p>}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Stats** — `app/(app)/waitlist/WaitlistStats.tsx`:

```tsx
"use client"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { trpc } from "@/lib/trpc"

const LABEL: Record<string, string> = {
  BR: "Brasil", US: "United States", OTHER: "Other",
  pre: "Cycle", preg: "Pregnancy", kids: "Kids", meno: "Menopause",
  en: "English", pt: "Português",
}
const fmt = (rows: { count: number; key: string }[]) => rows.map((r) => `${LABEL[r.key] ?? r.key} ${r.count.toLocaleString()}`).join(" · ") || "—"

function Tile({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{label}</p>
      <p className={small ? "mt-2 text-sm font-medium leading-6 text-fg-secondary" : "display mt-1 text-3xl font-bold tabular-nums text-fg-primary"}>{value}</p>
    </div>
  )
}

export function WaitlistStats() {
  const { data, isLoading, error } = trpc.waitlist.stats.useQuery()
  if (isLoading) return <p className="text-sm text-fg-tertiary">Loading…</p>
  if (error || !data) return <p className="text-sm text-fg-secondary">Couldn&apos;t load stats: {error?.message}</p>
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Total" value={data.total.toLocaleString()} />
        <Tile label="Last 7 days" value={data.last7.toLocaleString()} />
        <Tile label="By country" small value={fmt(data.byCountry.map((r) => ({ key: r.country, count: r.count })))} />
        <Tile label="By mode" small value={fmt(data.byMode.map((r) => ({ key: r.mode, count: r.count })))} />
      </div>
      <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Signups per day · 90 days</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.daily} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--accent-500)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
```

(`--accent-500` is defined in CC `app/globals.css` for both themes.)

- [ ] **Step 3: Table** — `app/(app)/waitlist/WaitlistTable.tsx`:

```tsx
"use client"
import { useState } from "react"
import { trpc } from "@/lib/trpc"
import type { WaitlistFilter } from "@/lib/waitlist"

const COUNTRIES = [["", "All countries"], ["BR", "Brasil"], ["US", "United States"], ["OTHER", "Other"]] as const
const MODES = [["", "All modes"], ["pre", "Cycle"], ["preg", "Pregnancy"], ["kids", "Kids"], ["meno", "Menopause"]] as const
const LOCALES = [["", "All languages"], ["en", "English"], ["pt", "Português"]] as const
const INVITED = [["all", "Everyone"], ["pending", "Not invited"], ["invited", "Invited"]] as const
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—")

export function WaitlistTable() {
  const utils = trpc.useUtils()
  const [filter, setFilter] = useState<WaitlistFilter>({ invited: "all" })
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState<string | null>(null)

  const list = trpc.waitlist.list.useQuery({ filter, page })
  const exportCsv = trpc.waitlist.exportCsv.useMutation({
    onSuccess: ({ csv, count }) => {
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
      const a = document.createElement("a")
      a.href = url
      a.download = `waitlist-${filter.country ?? "all"}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setNotice(`Exported ${count} rows.`)
    },
    onError: (e) => setNotice(e.message),
  })
  const promote = trpc.waitlist.promoteToBeta.useMutation({
    onSuccess: ({ promoted, alreadyBeta }) => {
      setSelected(new Set())
      setNotice(`Promoted ${promoted} to beta${alreadyBeta ? ` · ${alreadyBeta} were already on the beta list` : ""}.`)
      utils.waitlist.invalidate()
      utils.beta.list.invalidate()
    },
    onError: (e) => setNotice(e.message),
  })

  const rows = list.data?.rows ?? []
  const total = list.data?.total ?? 0
  const pageSize = list.data?.pageSize ?? 50
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const update = (p: Partial<WaitlistFilter>) => { setFilter((f) => ({ ...f, ...p })); setPage(0); setSelected(new Set()) }
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const ctl = "rounded-lg border border-border-default bg-card px-3 py-2 text-sm text-fg-primary"
  const opt = <T extends readonly (readonly [string, string])[]>(o: T) => o.map(([v, l]) => <option key={v} value={v}>{l}</option>)

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${ctl} min-w-[220px]`} placeholder="Search email or name" value={filter.q ?? ""} onChange={(e) => update({ q: e.target.value || undefined })} />
        <select className={ctl} value={filter.country ?? ""} onChange={(e) => update({ country: (e.target.value || undefined) as WaitlistFilter["country"] })}>{opt(COUNTRIES)}</select>
        <select className={ctl} value={filter.mode ?? ""} onChange={(e) => update({ mode: (e.target.value || undefined) as WaitlistFilter["mode"] })}>{opt(MODES)}</select>
        <select className={ctl} value={filter.locale ?? ""} onChange={(e) => update({ locale: (e.target.value || undefined) as WaitlistFilter["locale"] })}>{opt(LOCALES)}</select>
        <select className={ctl} value={filter.invited} onChange={(e) => update({ invited: e.target.value as WaitlistFilter["invited"] })}>{opt(INVITED)}</select>
        <input type="date" aria-label="From" className={ctl} value={filter.from ?? ""} onChange={(e) => update({ from: e.target.value || undefined })} />
        <input type="date" aria-label="To" className={ctl} value={filter.to ?? ""} onChange={(e) => update({ to: e.target.value || undefined })} />
        <div className="ml-auto flex gap-2">
          <button className={ctl} disabled={exportCsv.isPending} onClick={() => exportCsv.mutate({ filter })}>{exportCsv.isPending ? "Exporting…" : "Export CSV"}</button>
          <button className={`${ctl} font-semibold`} disabled={selected.size === 0 || promote.isPending} onClick={() => promote.mutate({ ids: [...selected] })}>
            {promote.isPending ? "Promoting…" : `Promote to beta (${selected.size})`}
          </button>
        </div>
      </div>
      {notice && <p role="status" className="text-sm text-fg-secondary">{notice}</p>}
      {list.error && <p className="text-sm text-fg-secondary">Couldn&apos;t load the list: {list.error.message}</p>}
      <div className="overflow-x-auto rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
            <tr className="border-b border-border-default">
              <th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Select page" checked={rows.length > 0 && rows.every((r) => selected.has(r.id))} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} /></th>
              {["#", "Email", "Name", "Country", "Mode", "Lang", "Joined", "Invited", "In app"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.isLoading && <tr><td colSpan={10} className="px-4 py-6 text-fg-tertiary">Loading…</td></tr>}
            {!list.isLoading && rows.length === 0 && <tr><td colSpan={10} className="px-4 py-6 text-fg-tertiary">No one matches these filters.</td></tr>}
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-border-default last:border-0">
                <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${r.email}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                <td className="px-4 py-3 tabular-nums text-fg-muted">{page * pageSize + i + 1}</td>
                <td className="px-4 py-3 text-fg-primary">{r.email}</td>
                <td className="px-4 py-3 text-fg-secondary">{r.name ?? "—"}</td>
                <td className="px-4 py-3">{r.country}</td>
                <td className="px-4 py-3">{r.mode}</td>
                <td className="px-4 py-3 uppercase">{r.locale}</td>
                <td className="px-4 py-3 tabular-nums">{fmt(r.createdAt)}</td>
                <td className="px-4 py-3 tabular-nums">{fmt(r.invitedAt)}</td>
                <td className="px-4 py-3">{r.signedUp ? "Yes" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-fg-tertiary">
        <span>{total.toLocaleString()} people</span>
        <div className="flex items-center gap-2">
          <button className={ctl} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="tabular-nums">{page + 1} / {pages}</span>
          <button className={ctl} disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
    </section>
  )
}
```

`#` = position within the current filter (ordered by `created_at asc`); filter by Brasil to see the BR queue.

- [ ] **Step 4: Sidebar** — in `components/CommandCenterSidebar.tsx`: import `ListPlus` from `lucide-react`; in the `Audience` items after Revenue add `{ href: "/waitlist", label: "Waitlist", icon: ListPlus },`; add `"/waitlist"` to `READY`.

- [ ] **Step 5: Browser check** — `pnpm dev`; insert `select public.waitlist_join('qa-cc@example.com','QA','meno','pt','BR',false,null,null,null,null,null)`; as admin open `/waitlist`: tiles (By country shows "Brasil 1"), chart, row with country BR, Country filter, CSV download has a `country` column, Promote → "Promoted 1 to beta", `/beta` shows it. As viewer: tiles + chart only. Clean up: `delete from waitlist where email='qa-cc@example.com'; delete from beta_testers where email='qa-cc@example.com';`.

- [ ] **Step 6: Commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add "app/(app)/waitlist" components/CommandCenterSidebar.tsx
git commit -m "feat(waitlist): Waitlist pillar — country-first stats, audited table, CSV, promote to beta"
```

---

## Part B — App capture pipeline (in SITE)

All Part B files live in `SITE/scripts/capture/`. Commands run from SITE unless stated.

### Task 5: Capture setup (simulator, dev client, demo data)

**Files:** Create `scripts/capture/README.md`, `scripts/capture/prepare.sh`, `scripts/capture/flows/_open-panel.yaml`, `scripts/capture/flows/00-seed.yaml`, `scripts/capture/flows/lang-en.yaml`, `scripts/capture/flows/lang-pt.yaml`, `scripts/capture/flows/mode-pre.yaml`, `mode-preg.yaml`, `mode-kids.yaml`, `mode-meno.yaml`, `scripts/capture/flows/_home.yaml`

**Interfaces:**
- Produces: `bash scripts/capture/prepare.sh` (exit 0 = ready); subflows `_open-panel.yaml`, `_home.yaml`, `lang-<en|pt>.yaml`, `mode-<pre|preg|kids|meno>.yaml` used by Task 6.

- [ ] **Step 1: prepare.sh**

```bash
#!/usr/bin/env bash
# Readies the booted iOS Simulator for capture: app installed, Metro reachable,
# clean status bar. Does not sign in — Igor does that once by hand (README).
set -euo pipefail
APP_ID="co.sauceroom.grandma"
APP_REPO="${APP_REPO:-/Users/igorcarvalhorodrigues/dev/grandma-app}"

booted=$(xcrun simctl list devices booted | grep -c Booted || true)
if [ "$booted" -eq 0 ]; then echo "✗ No booted simulator. Open Simulator.app (iPhone 16 Pro / 17 Pro) first."; exit 1; fi

if ! xcrun simctl get_app_container booted "$APP_ID" >/dev/null 2>&1; then
  echo "• Installing latest EAS simulator build of grandma…"
  (cd "$APP_REPO" && npm run eas:install:sim)
fi
xcrun simctl get_app_container booted "$APP_ID" >/dev/null || { echo "✗ $APP_ID still not installed. Run 'npm run eas:build:sim' in $APP_REPO."; exit 1; }

if ! curl -sf http://localhost:8081/status | grep -q running; then
  echo "✗ Metro is not running. In another terminal: cd $APP_REPO && npm start"; exit 1
fi

xcrun simctl status_bar booted override --time "9:41" --dataNetwork wifi --wifiMode active --wifiBars 3 \
  --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
xcrun simctl ui booted appearance light
which maestro >/dev/null || export PATH="$PATH:$HOME/.maestro/bin"
maestro --version >/dev/null
echo "✓ Ready. App installed, Metro up, status bar 9:41."
```

`chmod +x scripts/capture/prepare.sh`.

- [ ] **Step 2: README** — `scripts/capture/README.md`:

```markdown
# App capture — real grandma.app clips for the site

Records the installed grandma dev-client app in the iOS Simulator with demo data,
in English and Portuguese, and encodes looping clips into `public/media/app/<lang>/`.
Nothing here modifies the grandma-app repo.

## One-time (per machine)
1. Open Simulator.app with an iPhone 16 Pro or 17 Pro.
2. `cd ../grandma-app && npm start` (Metro) — keep it running.
3. `bash scripts/capture/prepare.sh` (installs the latest EAS simulator build if missing).
4. **Igor:** open the app in the simulator and sign in with the demo account.
   Never a real user. Credentials stay out of this repo.
5. `maestro test scripts/capture/flows/00-seed.yaml` — seeds every mode with demo data.

## Record + encode
    bash scripts/capture/record.sh          # all shots, both languages → scripts/capture/raw/
    bash scripts/capture/encode.sh          # → public/media/app/{en,pt}/*.{mp4,webm,jpg}
    open scripts/capture/review.html        # Igor reviews every clip before commit

Re-run whenever the app's UI changes. Raw recordings are gitignored.

## If a step can't find a label
`maestro hierarchy` prints the current screen's elements. Update the flow's text
selector and re-run only that shot: `bash scripts/capture/record.sh home-meno`.
```

- [ ] **Step 3: Subflows**

`flows/_open-panel.yaml` (dev panel via deep link; the panel is `__DEV__`-only):

```yaml
appId: co.sauceroom.grandma
---
- openLink: grandma-app://dev-panel
- extendedWaitUntil:
    visible: "SEED DATA"
    timeout: 20000
```

`flows/_home.yaml` (back to the tabbed home and drop dev mode so its banner never appears in a clip):

```yaml
appId: co.sauceroom.grandma
---
- runFlow:
    when:
      visible: "EXIT"
    commands:
      - tapOn: "EXIT"
- openLink: grandma-app:///
- waitForAnimationToEnd:
    timeout: 5000
- assertNotVisible: "DEV MODE"
```

`flows/00-seed.yaml`:

```yaml
appId: co.sauceroom.grandma
---
- launchApp
- runFlow: _open-panel.yaml
- scrollUntilVisible:
    element: "Seed everything"
    direction: DOWN
- tapOn: "Seed everything"
- extendedWaitUntil:
    visible: "OK"
    timeout: 120000
- tapOn: "OK"
- scrollUntilVisible:
    element: "Seed menopause data"
    direction: UP
- tapOn: "Seed menopause data"
- extendedWaitUntil:
    visible: "OK"
    timeout: 60000
- tapOn: "OK"
- runFlow: _home.yaml
```

`flows/mode-pre.yaml` (same shape for the other three; only the label differs: `Preg`, `Kids`, `Menopause`):

```yaml
appId: co.sauceroom.grandma
---
- runFlow: _open-panel.yaml
- scrollUntilVisible:
    element: "MODE"
    direction: UP
- tapOn: "Pre-Preg"
- runFlow: _home.yaml
```

`flows/lang-en.yaml` / `flows/lang-pt.yaml` (Settings language picker; only the tapped label differs — `English` / `Português (Brasil)`):

```yaml
appId: co.sauceroom.grandma
---
- openLink: grandma-app://profile/settings
- waitForAnimationToEnd
- scrollUntilVisible:
    element: "English|Português \\(Brasil\\)|Language|Idioma"
    direction: DOWN
- tapOn: "English|Português \\(Brasil\\)"   # opens the language list on the current value
- tapOn: "English"
- runFlow: _home.yaml
```

- [ ] **Step 4: Dry run (with Igor signed in)**

```bash
bash scripts/capture/prepare.sh
maestro test scripts/capture/flows/00-seed.yaml
maestro test scripts/capture/flows/lang-pt.yaml
maestro test scripts/capture/flows/mode-meno.yaml
xcrun simctl io booted screenshot /tmp/capture-check.png && open /tmp/capture-check.png
```

Expected: app in Portuguese, menopause home with seeded data, no DEV MODE pill, status bar 9:41. For any failed step run `maestro hierarchy` and fix the selector (labels come from `APP/app/dev-panel.tsx` and `APP/app/profile/settings.tsx`).

- [ ] **Step 5: Commit**

```bash
printf "scripts/capture/raw/\n" >> .gitignore
git add .gitignore scripts/capture
git commit -m "chore(capture): simulator prep, demo seed, mode and language subflows"
```

---

### Task 6: Shot flows and recorder

**Files:** Create `scripts/capture/record.sh`, `scripts/capture/flows/shot-*.yaml` (8 files)

**Interfaces:**
- Consumes: Task 5 subflows.
- Produces: `scripts/capture/raw/<lang>/<shot>.mov` for shots `onboarding-picker`, `home-pre`, `home-preg`, `home-kids`, `home-meno`, `talk`, `insights-pre`, `calendar-meno`.

- [ ] **Step 1: Shot flows.** Each shot sets its mode, then performs ~6–8 s of motion. Recording is started/stopped by `record.sh`, so the flows contain only the action.

`flows/shot-home-pre.yaml`:

```yaml
appId: co.sauceroom.grandma
---
- runFlow: mode-pre.yaml
- waitForAnimationToEnd
- swipe: { direction: UP, duration: 1400 }
- waitForAnimationToEnd
- swipe: { direction: UP, duration: 1400 }
- waitForAnimationToEnd
- swipe: { direction: DOWN, duration: 1800 }
- waitForAnimationToEnd
```

`flows/shot-home-preg.yaml` and `flows/shot-home-kids.yaml`: identical to the above with `mode-preg.yaml` / `mode-kids.yaml`.

`flows/shot-home-meno.yaml` (home week strip → quick log → tap a symptom → close):

```yaml
appId: co.sauceroom.grandma
---
- runFlow: mode-meno.yaml
- waitForAnimationToEnd
- tapOn:
    id: "quick-log"
    optional: true
- runFlow:
    when:
      notVisible: "Hot flash|Onda de calor"
    commands:
      - tapOn: "Log|Registrar"
- waitForAnimationToEnd
- tapOn: "Hot flash|Onda de calor"
- waitForAnimationToEnd
- swipe: { direction: DOWN, duration: 900 }
- waitForAnimationToEnd
```

`flows/shot-talk.yaml`:

```yaml
appId: co.sauceroom.grandma
---
- runFlow: mode-kids.yaml
- openLink: grandma-app://grandma-talk
- waitForAnimationToEnd
- tapOn:
    point: "50%,92%"
- inputText: "${QUESTION}"
- pressKey: Enter
- extendedWaitUntil:
    notVisible: "…"
    timeout: 25000
- waitForAnimationToEnd
```

(`QUESTION` is passed by `record.sh` per language.)

`flows/shot-onboarding-picker.yaml`:

```yaml
appId: co.sauceroom.grandma
---
- openLink: grandma-app://onboarding/journey?addMode=true
- waitForAnimationToEnd
- tapOn: "Pregnancy|Gravidez"
- waitForAnimationToEnd
- swipe: { direction: UP, duration: 900 }
- waitForAnimationToEnd
```

`flows/shot-insights-pre.yaml`:

```yaml
appId: co.sauceroom.grandma
---
- runFlow: mode-pre.yaml
- openLink: grandma-app://insights
- waitForAnimationToEnd
- swipe: { direction: UP, duration: 1600 }
- waitForAnimationToEnd
```

`flows/shot-calendar-meno.yaml`:

```yaml
appId: co.sauceroom.grandma
---
- runFlow: mode-meno.yaml
- tapOn: "Agenda"
- waitForAnimationToEnd
- swipe: { direction: UP, duration: 1400 }
- waitForAnimationToEnd
```

`record.sh` records the whole flow, including the mode switch at the start; `encode.sh` trims those first seconds with per-shot values from `shots.tsv` (Task 7).

- [ ] **Step 2: record.sh**

```bash
#!/usr/bin/env bash
# Records each shot flow in each language: scripts/capture/raw/<lang>/<shot>.mov
# Usage: record.sh [shot ...]   (default: all shots)
set -uo pipefail
cd "$(dirname "$0")"
export PATH="$PATH:$HOME/.maestro/bin"
SHOTS=(onboarding-picker home-pre home-preg home-kids home-meno talk insights-pre calendar-meno)
[ $# -gt 0 ] && SHOTS=("$@")
declare -A Q=( [en]="Rio woke up 4 times last night. Is this a regression?" [pt]="O Rio acordou 4 vezes esta noite. É regressão?" )
failed=()

bash ./prepare.sh || exit 1
for lang in pt en; do
  maestro test "flows/lang-$lang.yaml" || { echo "✗ could not switch language to $lang"; exit 1; }
  mkdir -p "raw/$lang"
  for shot in "${SHOTS[@]}"; do
    out="raw/$lang/$shot.mov"
    rm -f "$out"
    xcrun simctl io booted recordVideo --codec h264 --force "$out" >/dev/null 2>&1 &
    rec=$!
    sleep 1.5
    if maestro test -e QUESTION="${Q[$lang]}" "flows/shot-$shot.yaml"; then echo "✓ $lang/$shot"; else failed+=("$lang/$shot"); fi
    sleep 0.8
    kill -INT "$rec"; wait "$rec" 2>/dev/null
  done
done
xcrun simctl status_bar booted clear
if [ ${#failed[@]} -gt 0 ]; then echo "✗ Failed shots: ${failed[*]}"; exit 1; fi
echo "✓ All shots recorded."
```

(`declare -A` needs bash ≥ 4: run with `/opt/homebrew/bin/bash` if macOS bash 3.2 errors — the shebang `env bash` picks Homebrew bash when it's first on `PATH`.)

- [ ] **Step 3: Run** — `bash scripts/capture/record.sh`. Expected: 16 `✓` lines, `raw/pt/*.mov` and `raw/en/*.mov`. Open two of them (`open scripts/capture/raw/pt/home-meno.mov`) and confirm: Portuguese UI, demo data, no DEV MODE pill.

- [ ] **Step 4: Commit** — `git add scripts/capture && git commit -m "chore(capture): eight shot flows + recorder for both languages"`

---

### Task 7: Encode clips and review gallery

**Files:** Create `scripts/capture/encode.sh`, `scripts/capture/shots.tsv`, `scripts/capture/review.html`; Output `public/media/app/{en,pt}/<shot>.{mp4,webm,jpg}`

**Interfaces:**
- Produces: `/media/app/<lang>/<shot>.mp4|.webm|.jpg` — consumed by `AppVideo` (Task 9) with `shot` ∈ the 8 names above and `lang` ∈ `en|pt`.

- [ ] **Step 1: shots.tsv** (seconds to skip at the start — the mode switch — and clip length):

```
shot	start	length
onboarding-picker	1.0	7
home-pre	4.0	7
home-preg	4.0	7
home-kids	4.0	7
home-meno	4.0	8
talk	5.0	8
insights-pre	5.0	6
calendar-meno	5.0	6
```

- [ ] **Step 2: encode.sh**

```bash
#!/usr/bin/env bash
# raw/<lang>/<shot>.mov → public/media/app/<lang>/<shot>.{mp4,webm,jpg}
set -euo pipefail
cd "$(dirname "$0")"
OUT=../../public/media/app
tail -n +2 shots.tsv | while IFS=$'\t' read -r shot start length; do
  for lang in en pt; do
    in="raw/$lang/$shot.mov"; [ -f "$in" ] || { echo "skip $lang/$shot (no raw)"; continue; }
    mkdir -p "$OUT/$lang"
    vf="scale=720:-2:flags=lanczos,fps=30"
    ffmpeg -loglevel error -y -ss "$start" -t "$length" -i "$in" -an -vf "$vf" \
      -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 28 -preset slow -movflags +faststart "$OUT/$lang/$shot.mp4"
    ffmpeg -loglevel error -y -ss "$start" -t "$length" -i "$in" -an -vf "$vf" \
      -c:v libvpx-vp9 -b:v 0 -crf 40 -row-mt 1 "$OUT/$lang/$shot.webm"
    ffmpeg -loglevel error -y -ss "$(echo "$start + 0.5" | bc)" -i "$in" -frames:v 1 -vf "scale=720:-2" -q:v 3 "$OUT/$lang/$shot.jpg"
    size=$(du -k "$OUT/$lang/$shot.mp4" | cut -f1)
    [ "$size" -le 1536 ] && echo "✓ $lang/$shot ${size}KB" || echo "⚠ $lang/$shot ${size}KB > 1.5MB — raise crf or shorten"
  done
done
```

- [ ] **Step 3: review.html** — a static gallery Igor opens locally:

```html
<!doctype html><meta charset="utf-8"><title>Capture review</title>
<style>body{font:14px system-ui;background:#F4F1E8;margin:24px}h2{font:600 13px ui-monospace;letter-spacing:.1em;text-transform:uppercase;color:#807A6E}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px}figure{margin:0}video{width:100%;border-radius:22px;background:#000}figcaption{font:12px ui-monospace;margin-top:6px}</style>
<h1>Capture review — check: demo data only, no DEV MODE pill, right language, no notifications</h1>
<div id="r"></div>
<script>
const shots=["onboarding-picker","home-pre","home-preg","home-kids","home-meno","talk","insights-pre","calendar-meno"];
document.getElementById("r").innerHTML=["pt","en"].map(l=>`<h2>${l}</h2><div class="g">${shots.map(s=>`<figure><video src="../../public/media/app/${l}/${s}.mp4" poster="../../public/media/app/${l}/${s}.jpg" autoplay muted loop playsinline></video><figcaption>${l}/${s}</figcaption></figure>`).join("")}</div>`).join("");
</script>
```

- [ ] **Step 4: Encode and review**

```bash
bash scripts/capture/encode.sh
open scripts/capture/review.html
```

Expected: 16 `✓` lines, each ≤ 1.5 MB. Adjust `shots.tsv` start/length until each clip begins on the destination screen. **Gate:** Igor approves the 16 clips (demo data only, right language, no dev UI, nothing personal). Do not commit media before that.

- [ ] **Step 5: Commit**

```bash
git add scripts/capture/encode.sh scripts/capture/shots.tsv scripts/capture/review.html public/media/app
git commit -m "feat(media): real app clips (PT + EN) from the capture pipeline"
```

---

## Part C — Site (SITE repo)

### Task 8: Diffuse v3 foundation — tokens, fonts, modes, countries

**Files:**
- Create: `vitest.config.ts`, `test/server-only-stub.ts`, `lib/modes.ts`, `lib/modes.test.ts`, `lib/countries.ts`, `lib/countries.test.ts`
- Modify: `package.json` (deps + scripts), `app/globals.css` (replace entirely)

**Interfaces:**
- Produces: `MODES`, `Mode`, `isMode`, `FIELDS` (`Record<Mode, {g1,g2,g3,g4,accent,accentSoft}>`), `fieldStops(mode)`; `COUNTRIES = ['BR','US','OTHER']`, `Country`, `countryFromGeo(header: string | null | undefined, locale: 'en' | 'pt'): Country`; CSS tokens/utilities listed in Step 5; scripts `test`, `typecheck`, `i18n:check`.

- [ ] **Step 1: Dependencies and scripts**

```bash
pnpm add next-intl @supabase/supabase-js server-only
pnpm add -D vitest
```

`package.json` scripts: add `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`, `"i18n:check": "vitest run messages"`.

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'node', include: ['{lib,messages,components}/**/*.test.ts'] },
  resolve: {
    alias: {
      '@': new URL('./', import.meta.url).pathname,
      'server-only': new URL('./test/server-only-stub.ts', import.meta.url).pathname,
    },
  },
})
```

`test/server-only-stub.ts`: `export {}`.

- [ ] **Step 2: Failing tests**

`lib/modes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { MODES, FIELDS, fieldStops, isMode } from './modes'

describe('modes', () => {
  it('has exactly the four live modes', () => expect(MODES).toEqual(['pre', 'preg', 'kids', 'meno']))
  it('matches the app diffuseFields', () => {
    expect(FIELDS.meno).toEqual({ g1: '#F5C89A', g2: '#F0B27A', g3: '#E8975A', g4: '#F7DCC0', accent: '#C2703A', accentSoft: '#F7E3D2' })
    expect(fieldStops('preg')).toEqual(['#F8C9A6', '#F2AEC6', '#BDA4E2', '#F8E1B2'])
  })
  it('isMode rejects caregiver and junk', () => {
    expect(isMode('kids')).toBe(true)
    expect(isMode('care')).toBe(false)
    expect(isMode(undefined)).toBe(false)
  })
})
```

`lib/countries.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { COUNTRIES, countryFromGeo } from './countries'

describe('countryFromGeo', () => {
  it('lists the launch countries', () => expect(COUNTRIES).toEqual(['BR', 'US', 'OTHER']))
  it('maps BR and US case-insensitively', () => {
    expect(countryFromGeo('BR', 'en')).toBe('BR')
    expect(countryFromGeo('us', 'pt')).toBe('US')
  })
  it('maps any other country to OTHER', () => expect(countryFromGeo('DE', 'pt')).toBe('OTHER'))
  it('falls back by locale when the header is missing', () => {
    expect(countryFromGeo(null, 'pt')).toBe('BR')
    expect(countryFromGeo('', 'en')).toBe('OTHER')
    expect(countryFromGeo(undefined, 'en')).toBe('OTHER')
  })
})
```

Run `pnpm test` → FAIL (modules missing).

- [ ] **Step 3: Implement**

`lib/modes.ts`:

```ts
/** The app's four live behaviors and their Diffuse fields (grandma-app constants/theme.ts `diffuseFields`). */
export const MODES = ['pre', 'preg', 'kids', 'meno'] as const
export type Mode = (typeof MODES)[number]
export const isMode = (v: unknown): v is Mode => typeof v === 'string' && (MODES as readonly string[]).includes(v)

export interface Field { g1: string; g2: string; g3: string; g4: string; accent: string; accentSoft: string }

export const FIELDS: Record<Mode, Field> = {
  pre: { g1: '#F0A99A', g2: '#F0B8C8', g3: '#C9B7E6', g4: '#F7DCC0', accent: '#C25872', accentSoft: '#F6DCE4' },
  preg: { g1: '#F8C9A6', g2: '#F2AEC6', g3: '#BDA4E2', g4: '#F8E1B2', accent: '#8F5FC6', accentSoft: '#E7D8F5' },
  kids: { g1: '#F4D888', g2: '#A2D8B4', g3: '#A6BCE6', g4: '#F4B396', accent: '#4C79CE', accentSoft: '#CBDCF7' },
  meno: { g1: '#F5C89A', g2: '#F0B27A', g3: '#E8975A', g4: '#F7DCC0', accent: '#C2703A', accentSoft: '#F7E3D2' },
}

export const fieldStops = (m: Mode): [string, string, string, string] => [FIELDS[m].g1, FIELDS[m].g2, FIELDS[m].g3, FIELDS[m].g4]
```

`lib/countries.ts`:

```ts
/** Launch countries: Brazil opens first, then the US. */
export const COUNTRIES = ['BR', 'US', 'OTHER'] as const
export type Country = (typeof COUNTRIES)[number]

/** Default for the form from Vercel's x-vercel-ip-country header, falling back by site language. */
export function countryFromGeo(header: string | null | undefined, locale: 'en' | 'pt'): Country {
  const c = (header ?? '').trim().toUpperCase()
  if (c === 'BR' || c === 'US') return c
  if (c) return 'OTHER'
  return locale === 'pt' ? 'BR' : 'OTHER'
}
```

Run `pnpm test` → PASS.

- [ ] **Step 4: Replace `app/globals.css`** entirely:

```css
@import 'tailwindcss';

/* Diffuse v3 — grandma-app docs/design/design-system-v3.html */
:root {
  --bg: #F4F1E8; --paper: #FBFAF5; --paper-2: #F7F4EC; --deep: #E7E3D7;
  --ink: #1A1916; --ink-2: #4A463E; --ink-3: #807A6E; --ink-4: #B3AC9C;
  --line: rgba(26,25,22,.12); --line-2: rgba(26,25,22,.20); --hair: rgba(26,25,22,.55);
  --err: #C62828;
  --r-sm: 14px; --r-md: 20px; --r-lg: 28px; --r-xl: 40px;
  --blur-glass: 18px;
  --sh-card: 0 1px 2px rgba(26,25,22,.04), 0 8px 30px -18px rgba(26,25,22,.18);
  --sh-pop: 0 2px 6px rgba(26,25,22,.06), 0 22px 50px -24px rgba(26,25,22,.30);
  --grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  /* default field = pregnancy; [data-mode] overrides */
  --g1: #F8C9A6; --g2: #F2AEC6; --g3: #BDA4E2; --g4: #F8E1B2; --accent: #8F5FC6; --accent-soft: #E7D8F5;
}
[data-mode=pre]  { --g1:#F0A99A; --g2:#F0B8C8; --g3:#C9B7E6; --g4:#F7DCC0; --accent:#C25872; --accent-soft:#F6DCE4 }
[data-mode=preg] { --g1:#F8C9A6; --g2:#F2AEC6; --g3:#BDA4E2; --g4:#F8E1B2; --accent:#8F5FC6; --accent-soft:#E7D8F5 }
[data-mode=kids] { --g1:#F4D888; --g2:#A2D8B4; --g3:#A6BCE6; --g4:#F4B396; --accent:#4C79CE; --accent-soft:#CBDCF7 }
[data-mode=meno] { --g1:#F5C89A; --g2:#F0B27A; --g3:#E8975A; --g4:#F7DCC0; --accent:#C2703A; --accent-soft:#F7E3D2 }

@theme inline {
  --font-display: var(--font-cormorant), Georgia, serif;
  --font-sans: var(--font-hanken), system-ui, sans-serif;
  --font-mono: var(--font-space-mono), ui-monospace, monospace;
  --color-bg: var(--bg); --color-paper: var(--paper); --color-paper-2: var(--paper-2); --color-deep: var(--deep);
  --color-ink: var(--ink); --color-ink-2: var(--ink-2); --color-ink-3: var(--ink-3); --color-ink-4: var(--ink-4);
  --color-line: var(--line); --color-line-2: var(--line-2); --color-hair: var(--hair); --color-err: var(--err);
  --color-accent: var(--accent); --color-accent-soft: var(--accent-soft);
  --radius-d-sm: var(--r-sm); --radius-d-md: var(--r-md); --radius-d-lg: var(--r-lg); --radius-d-xl: var(--r-xl);
  --shadow-card: var(--sh-card); --shadow-pop: var(--sh-pop);
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font-sans); font-size: 16px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
::selection { background: var(--accent-soft); }

/* page grain */
body::after { content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 40; opacity: .22; background-image: var(--grain); mix-blend-mode: soft-light; }

/* generative field engine (v3 .gfield) */
.gfield { position: relative; overflow: hidden; isolation: isolate; }
.gfield::before { content: ""; position: absolute; inset: -20%; z-index: -2;
  background: radial-gradient(52% 58% at 20% 24%, var(--g1), transparent 74%), radial-gradient(54% 60% at 82% 20%, var(--g2), transparent 74%),
    radial-gradient(60% 64% at 74% 84%, var(--g3), transparent 74%), radial-gradient(54% 60% at 22% 80%, var(--g4), transparent 74%), var(--bg);
  filter: blur(46px) saturate(1.14); }
.gfield::after { content: ""; position: absolute; inset: 0; z-index: -1; opacity: .30; background-image: var(--grain); mix-blend-mode: soft-light; pointer-events: none; }
.gfield.soft::before { opacity: .55; }

/* glass panel + gradient-glass pill (v3 .glass / .gradpill) */
.glass { background: rgba(255,255,255,.55); backdrop-filter: blur(var(--blur-glass)); -webkit-backdrop-filter: blur(var(--blur-glass)); border: 1px solid rgba(255,255,255,.6); border-radius: var(--r-md); }
.gradpill { position: relative; overflow: hidden; color: var(--ink);
  background: linear-gradient(135deg, color-mix(in oklab, var(--g1) 60%, transparent), color-mix(in oklab, var(--g2) 48%, transparent), color-mix(in oklab, var(--g3) 56%, transparent));
  backdrop-filter: blur(18px) saturate(1.6); -webkit-backdrop-filter: blur(18px) saturate(1.6);
  box-shadow: inset 0 1.5px 1px rgba(255,255,255,.9), inset 0 0 0 1px rgba(255,255,255,.45); }
.gradpill::after { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 55%; pointer-events: none; background: linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,0)); }

/* heart-eye mark motion */
.mark-eye { transform-origin: 100px 100px; animation: mark-blink 6s infinite; }
.mark-heart { transform-origin: 100px 100px; animation: mark-beat 1.6s ease-in-out infinite; }
@keyframes mark-blink { 0%, 46%, 50%, 100% { transform: scaleY(1) } 48% { transform: scaleY(.08) } }
@keyframes mark-beat { 0%, 100% { transform: scale(1) } 14% { transform: scale(1.08) } 28% { transform: scale(1) } }
@media (prefers-reduced-motion: reduce) { .mark-eye, .mark-heart { animation: none; } html { scroll-behavior: auto; } }
```

The old `styles/globals.css` and the shadcn `components/ui/*` still compile (they reference CSS variables that may now be undefined; they are unused by the new pages and are deleted in Task 15).

- [ ] **Step 5: Verify and commit** — `pnpm test && pnpm typecheck`. (The current pages will look unstyled until Task 11; that's expected on this branch.)

```bash
git add -A
git commit -m "feat(diffuse): v3 tokens, field engine, modes + launch countries"
```

---

### Task 9: Diffuse v3 component kit

**Files:** Create in `components/diffuse/`: `mark.tsx`, `section-head.tsx`, `field-card.tsx`, `action-rule.tsx`, `chip.tsx`, `underline-field.tsx`, `bloom-picker.tsx`, `app-video.tsx`, `index.ts`

**Interfaces (all exported from `@/components/diffuse`):**
- `Mark({ size?: number; still?: boolean; className? })`
- `SectionHead({ n: string; children: ReactNode; sub?: ReactNode; id?: string })` — children may include `<em>`.
- `FieldCard({ mode: Mode; label: string; title: string; children?: ReactNode; className? })` — swatches top-right.
- `ActionRule({ href?: string; type?: 'submit'|'button'; pending?: boolean; disabled?: boolean; onClick?; children; className? })`
- `Chip({ selected?: boolean; onClick?; dot?: string; children; as?: 'button'|'span'; role?; 'aria-checked'? })`
- `UnderlineField({ label: string; error?: string; ref?; ...InputHTMLAttributes })`
- `BloomPicker<T extends string>({ name: string; legend: ReactNode; value: T | ''; onChange(v: T): void; options: { value: T; kicker: string; label: string; mode: Mode }[]; error?: string })` — posts `name=value` through a hidden input.
- `AppVideo({ shot: string; lang: 'en'|'pt'; alt: string; priority?: boolean; size?: 'md'|'sm' })` — phone frame; plays `/media/app/<lang>/<shot>.{webm,mp4}` with `.jpg` poster.

- [ ] **Step 1: Components**

`mark.tsx` (paths from `APP/docs/design/Onboarding.html`):

```tsx
export function Mark({ size = 40, still = false, className = '' }: { size?: number; still?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} aria-hidden="true">
      <g stroke="#1A1916" strokeWidth="4.5" strokeLinecap="round" fill="none">
        <path d="M100 35 L100 60" /><path d="M70 42 L78 65" /><path d="M130 42 L122 65" /><path d="M48 58 L62 74" /><path d="M152 58 L138 74" />
        <path d="M100 160 L100 140" /><path d="M70 158 L78 138" /><path d="M130 158 L122 138" /><path d="M48 142 L62 128" /><path d="M152 142 L138 128" />
      </g>
      <g className={still ? undefined : 'mark-eye'}>
        <path d="M 35 100 Q 100 55 165 100 Q 100 145 35 100 Z" fill="#F5D652" stroke="#1A1916" strokeWidth="4.5" strokeLinejoin="round" />
        <g className={still ? undefined : 'mark-heart'}>
          <path d="M100 128 C 72 106 64 86 82 76 C 92 71 100 80 100 88 C 100 80 108 71 118 76 C 136 86 128 106 100 128 Z" fill="#1A1916" />
          <path d="M100 122 C 78 104 72 88 86 80 C 94 77 100 83 100 90 C 100 83 106 77 114 80 C 128 88 122 104 100 122 Z" fill="#EE7B6D" />
        </g>
      </g>
    </svg>
  )
}
```

`section-head.tsx`:

```tsx
import type { ReactNode } from 'react'

export function SectionHead({ n, children, sub, id }: { n: string; children: ReactNode; sub?: ReactNode; id?: string }) {
  return (
    <header id={id} className="mb-10">
      <div className="flex items-baseline gap-[18px] border-t border-hair pt-[18px]">
        <span className="font-mono text-[12px] tracking-[0.14em] text-ink-3">{n}</span>
        <h2 className="m-0 font-display text-[clamp(34px,4.2vw,52px)] font-normal leading-none tracking-[-0.01em] [&_em]:italic [&_em]:text-ink-2">{children}</h2>
      </div>
      {sub && <p className="mt-4 max-w-[640px] text-[15.5px] font-light leading-[1.6] text-ink-3">{sub}</p>}
    </header>
  )
}
```

`field-card.tsx`:

```tsx
import type { ReactNode } from 'react'
import type { Mode } from '@/lib/modes'

export function FieldCard({ mode, label, title, children, className = '' }: { mode: Mode; label: string; title: string; children?: ReactNode; className?: string }) {
  return (
    <article data-mode={mode} className={`gfield flex min-h-[360px] flex-col rounded-d-lg p-7 shadow-card ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[rgba(26,25,22,.62)]">{label}</span>
        <span className="flex gap-1.5" aria-hidden="true">
          {(['--g1', '--g2', '--g3', '--g4'] as const).map((v) => (
            <i key={v} className="h-[18px] w-[18px] rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.06)]" style={{ background: `var(${v})` }} />
          ))}
        </span>
      </div>
      <h3 className="mt-2 font-display text-[clamp(44px,5vw,58px)] font-normal leading-[0.9] text-ink [font-variant-numeric:lining-nums]">{title}</h3>
      {children}
    </article>
  )
}
```

`action-rule.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'

const BASE =
  'group flex w-full items-center justify-between border-t border-line-2 px-0.5 pb-0.5 pt-[18px] font-mono text-[13px] font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:border-hair focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-hair disabled:cursor-default disabled:border-line disabled:text-ink-4'

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="opacity-85 transition-transform duration-[250ms] group-hover:translate-x-1.5">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  )
}

export function ActionRule({ href, type = 'button', pending, disabled, onClick, className = '', children }: {
  href?: string; type?: 'submit' | 'button'; pending?: boolean; disabled?: boolean; onClick?: () => void; className?: string; children: ReactNode
}) {
  if (href) return <Link href={href} className={`${BASE} ${className}`}><span>{children}</span><Arrow /></Link>
  return (
    <button type={type} onClick={onClick} disabled={disabled || pending} aria-busy={pending || undefined} className={`${BASE} ${className}`}>
      <span>{children}</span><Arrow />
    </button>
  )
}
```

`chip.tsx`:

```tsx
import type { ReactNode } from 'react'

export function Chip({ selected = false, onClick, dot, children, as = 'button', role, ...aria }: {
  selected?: boolean; onClick?: () => void; dot?: string; children: ReactNode; as?: 'button' | 'span'; role?: string; 'aria-checked'?: boolean
}) {
  const cls = `inline-flex items-center rounded-full border px-[18px] py-[11px] font-mono text-[12px] tracking-[0.04em] transition-all duration-200 ${
    selected
      ? 'border-hair bg-[color-mix(in_oklab,var(--paper)_80%,transparent)] font-bold text-ink shadow-[inset_0_1px_1px_rgba(255,255,255,.5)]'
      : 'border-line bg-[color-mix(in_oklab,var(--paper)_55%,transparent)] text-ink-3'
  } ${as === 'button' ? 'cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-hair' : ''}`
  const inner = <>{dot && <span aria-hidden="true" className="mr-2 h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}{children}</>
  if (as === 'span') return <span className={cls}>{inner}</span>
  return <button type="button" role={role} aria-checked={aria['aria-checked']} aria-pressed={role ? undefined : selected} onClick={onClick} className={cls}>{inner}</button>
}
```

`underline-field.tsx`:

```tsx
import { useId, type InputHTMLAttributes, type Ref } from 'react'

export function UnderlineField({ label, error, id, className = '', ref, ...input }: { label: string; error?: string; ref?: Ref<HTMLInputElement> } & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">{label}</label>
      <input
        id={fid}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-err` : undefined}
        className="w-full rounded-none border-0 border-b-[1.5px] border-line-2 bg-transparent px-0.5 pb-3.5 pt-2.5 text-[18px] text-ink outline-none placeholder:text-ink-4 focus:border-hair aria-[invalid=true]:border-err"
        {...input}
      />
      {error && <p id={`${fid}-err`} className="mt-2 text-[14px] text-err">{error}</p>}
    </div>
  )
}
```

`bloom-picker.tsx` (the onboarding journey picker):

```tsx
'use client'

import type { ReactNode } from 'react'
import type { Mode } from '@/lib/modes'

const POS: Record<Mode, [number, number]> = { pre: [20, 36], preg: [68, 26], kids: [36, 76], meno: [82, 72] }

export function BloomPicker<T extends string>({ name, legend, value, onChange, options, error }: {
  name: string; legend: ReactNode; value: T | ''; onChange: (v: T) => void
  options: { value: T; kicker: string; label: string; mode: Mode }[]; error?: string
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="font-display text-[26px] leading-[1.1] [&_em]:italic [&_em]:text-ink-2">{legend}</legend>
      <input type="hidden" name={name} value={value} />
      <div role="radiogroup" className="relative mt-1.5 h-[250px]">
        {options.map((o) => {
          const on = o.value === value
          const [x, y] = POS[o.mode]
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              data-mode={o.mode}
              onClick={() => onChange(o.value)}
              style={{ left: `${x}%`, top: `${y}%` }}
              className={`absolute flex h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-full transition-transform duration-300 [transition-timing-function:cubic-bezier(.32,.72,0,1)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[6px] focus-visible:outline-hair ${on ? 'scale-[1.08]' : ''}`}
            >
              <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-full transition-all duration-300"
                style={{ background: 'radial-gradient(circle, var(--g2) 0%, var(--g1) 38%, color-mix(in oklab, var(--g3) 70%, transparent) 58%, transparent 72%)', filter: on ? 'blur(7px) saturate(1.15)' : 'blur(10px) saturate(.9)', opacity: on ? 1 : 0.75 }} />
              {on && <span aria-hidden="true" className="absolute -inset-1.5 rounded-full border border-hair" />}
              <small className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-[rgba(26,25,22,.62)]">{o.kicker}</small>
              <span className="font-display text-[23px] italic leading-none text-ink">{o.label}</span>
            </button>
          )
        })}
      </div>
      {error && <p className="mt-2 text-center text-[14px] text-err" role="alert">{error}</p>}
    </fieldset>
  )
}
```

Keyboard: each bloom is a focusable `role="radio"` button; Space/Enter selects. (Arrow-key roving is not required for 4 options; Tab order is fine.)

`app-video.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'

/** Real app clip in a phone frame. Lazy-loads when near the viewport; poster only under reduced motion. */
export function AppVideo({ shot, lang, alt, priority = false, size = 'md' }: { shot: string; lang: 'en' | 'pt'; alt: string; priority?: boolean; size?: 'md' | 'sm' }) {
  const ref = useRef<HTMLDivElement>(null)
  const [load, setLoad] = useState(priority)
  const [reduce, setReduce] = useState(false)
  const base = `/media/app/${lang}/${shot}`

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    if (priority || !ref.current) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setLoad(true); io.disconnect() } }, { rootMargin: '300px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [priority])

  const frame = size === 'md' ? 'w-[300px] rounded-[48px] border-[11px]' : 'w-[240px] rounded-[40px] border-[9px]'
  return (
    <div ref={ref} className={`relative mx-auto aspect-[9/19.5] overflow-hidden border-[#121110] bg-bg shadow-[0_30px_60px_-30px_rgba(26,25,22,.45)] ${frame}`}>
      {load && !reduce ? (
        <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline preload={priority ? 'auto' : 'metadata'} poster={`${base}.jpg`} aria-label={alt}>
          <source src={`${base}.webm`} type="video/webm" />
          <source src={`${base}.mp4`} type="video/mp4" />
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="absolute inset-0 h-full w-full object-cover" src={`${base}.jpg`} alt={alt} loading={priority ? 'eager' : 'lazy'} />
      )}
    </div>
  )
}
```

`index.ts`:

```ts
export { Mark } from './mark'
export { SectionHead } from './section-head'
export { FieldCard } from './field-card'
export { ActionRule } from './action-rule'
export { Chip } from './chip'
export { UnderlineField } from './underline-field'
export { BloomPicker } from './bloom-picker'
export { AppVideo } from './app-video'
```

(`ActionRule` imports `@/i18n/navigation`, created in Task 10; typecheck this task together with Task 10's Step 2 if running strictly in order, or create `i18n/` files first.)

- [ ] **Step 2: Commit** — `git add components/diffuse && git commit -m "feat(diffuse): v3 kit — mark, section head, field card, action rule, chip, field, bloom picker, app video"`

---

### Task 10: i18n infrastructure and layout

**Files:**
- Create: `i18n/routing.ts`, `i18n/navigation.ts`, `i18n/request.ts`, `proxy.ts`, `app/[locale]/layout.tsx`, `components/site/locale-switcher.tsx`, `messages/en.json`, `messages/pt.json` (namespaces `meta`, `locale` for now), `messages/messages.test.ts`
- Modify: `next.config.mjs`
- Delete: `app/layout.tsx`, `app/page.tsx`, `app/pricing/`, `app/privacy/`, `app/terms/` (privacy/terms are recreated under `[locale]` in Task 12)

**Interfaces:**
- Produces: `routing` (`['en','pt']`, default `en`), `Locale`, `htmlLang(locale)`; `Link`, `usePathname`, `useRouter` from `@/i18n/navigation`; `LocaleSwitcher`; layout with fonts `--font-cormorant`, `--font-hanken`, `--font-space-mono`.

- [ ] **Step 1: Message parity test** — `messages/messages.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import en from './en.json'
import pt from './pt.json'

const keys = (o: unknown, p = ''): string[] =>
  typeof o !== 'object' || o === null || Array.isArray(o) ? [p] : Object.entries(o).flatMap(([k, v]) => keys(v, p ? `${p}.${k}` : k))
const strings = (o: unknown, p = ''): [string, string][] =>
  typeof o === 'string' ? [[p, o]] : Array.isArray(o) ? o.flatMap((v, i) => strings(v, `${p}[${i}]`)) : typeof o === 'object' && o ? Object.entries(o).flatMap(([k, v]) => strings(v, p ? `${p}.${k}` : k)) : []
const arrays = (o: unknown, p = ''): [string, number][] =>
  Array.isArray(o) ? [[p, o.length]] : typeof o === 'object' && o ? Object.entries(o).flatMap(([k, v]) => arrays(v, p ? `${p}.${k}` : k)) : []

describe('messages', () => {
  it('same keys in en and pt', () => {
    const e = new Set(keys(en)), p = new Set(keys(pt))
    expect([...e].filter((k) => !p.has(k)), 'missing in pt').toEqual([])
    expect([...p].filter((k) => !e.has(k)), 'missing in en').toEqual([])
  })
  it('no empty strings', () => expect([...strings(en), ...strings(pt)].filter(([, s]) => !s.trim())).toEqual([]))
  it('same array lengths', () => expect(arrays(pt)).toEqual(arrays(en)))
  it('no prices on the site', () => expect([...strings(en), ...strings(pt)].filter(([, s]) => /\$\s?\d/.test(s))).toEqual([]))
})
```

- [ ] **Step 2: Routing**

`i18n/routing.ts`:

```ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({ locales: ['en', 'pt'], defaultLocale: 'en', localePrefix: 'always' })
export type Locale = (typeof routing.locales)[number]
export const htmlLang = (l: Locale): 'en' | 'pt-BR' => (l === 'pt' ? 'pt-BR' : 'en')
```

`i18n/navigation.ts`:

```ts
import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
```

`i18n/request.ts`:

```ts
import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale
  return { locale, messages: (await import(`../messages/${locale}.json`)).default }
})
```

`proxy.ts`:

```ts
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)
export const config = { matcher: '/((?!api|_next|_vercel|media|.*\\..*).*)' }
```

`next.config.mjs`:

```js
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
}

export default withNextIntl(nextConfig)
```

- [ ] **Step 3: Layout** — delete the old entry files, then create `app/[locale]/layout.tsx`:

```bash
git rm app/layout.tsx app/page.tsx app/pricing/page.tsx app/privacy/page.tsx app/terms/page.tsx
```

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Cormorant_Garamond, Hanken_Grotesk, Space_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing, htmlLang, type Locale } from '@/i18n/routing'
import '../globals.css'

const cormorant = Cormorant_Garamond({ subsets: ['latin'], variable: '--font-cormorant', display: 'swap', weight: ['300', '400', '500'], style: ['normal', 'italic'] })
const hanken = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-hanken', display: 'swap', weight: ['300', '400', '500', '600'] })
const spaceMono = Space_Mono({ subsets: ['latin'], variable: '--font-space-mono', display: 'swap', weight: ['400', '700'] })

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://grandma.app'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: 'meta' })
  return {
    metadataBase: new URL(SITE_URL),
    title: t('title'),
    description: t('description'),
    alternates: { canonical: `/${locale}`, languages: { en: '/en', 'pt-BR': '/pt', 'x-default': '/en' } },
    openGraph: { title: t('ogTitle'), description: t('description'), type: 'website', locale: locale === 'pt' ? 'pt_BR' : 'en_US' },
    twitter: { card: 'summary_large_image' },
    icons: { icon: '/favicon.svg' },
  }
}

export default async function LocaleLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  return (
    <html lang={htmlLang(locale as Locale)} className={`${cormorant.variable} ${hanken.variable} ${spaceMono.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Switcher** — `components/site/locale-switcher.tsx`:

```tsx
'use client'

import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'

export function LocaleSwitcher({ className = '' }: { className?: string }) {
  const t = useTranslations('locale')
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const router = useRouter()
  return (
    <div role="group" aria-label={t('label')} className={`flex items-center gap-1.5 font-mono text-[11px] tracking-[0.14em] text-ink-4 ${className}`}>
      {routing.locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden="true">·</span>}
          <button
            type="button"
            lang={l === 'pt' ? 'pt-BR' : 'en'}
            aria-pressed={l === locale}
            onClick={() => l !== locale && router.replace(pathname, { locale: l, scroll: false })}
            className={l === locale ? 'font-bold text-ink underline underline-offset-4' : 'text-ink-3 hover:text-ink'}
          >
            {t(l)}
          </button>
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: First messages** — `messages/en.json`:

```json
{
  "meta": {
    "title": "Grandma · Waitlist open — Brasil first, then the US",
    "description": "A calm companion for your cycle, pregnancy, kids and menopause. Join the waitlist: invites open in Brasil first, then the United States.",
    "ogTitle": "Grandma · Join the waitlist"
  },
  "locale": { "label": "Language", "en": "EN", "pt": "PT" }
}
```

`messages/pt.json`:

```json
{
  "meta": {
    "title": "Grandma · Lista de espera aberta — Brasil primeiro, depois EUA",
    "description": "Uma companhia tranquila para o seu ciclo, gravidez, filhos e menopausa. Entre na lista de espera: os convites abrem primeiro no Brasil, depois nos Estados Unidos.",
    "ogTitle": "Grandma · Entre na lista de espera"
  },
  "locale": { "label": "Idioma", "en": "EN", "pt": "PT" }
}
```

- [ ] **Step 6: Verify and commit** — `pnpm i18n:check && pnpm typecheck` (the build needs a page; Task 11 adds it).

```bash
git add -A
git commit -m "feat(i18n): next-intl routing /en /pt, v3 fonts layout, localized metadata, switcher"
```

---

### Task 11: Lean home

**Files:**
- Create: `app/[locale]/page.tsx`, `components/site/nav.tsx`, `components/site/hero.tsx`, `components/site/launch.tsx`, `components/site/chapters.tsx`, `components/site/grandma.tsx`, `components/site/faq.tsx`, `components/site/closing.tsx`, `components/site/footer.tsx`, `lib/geo.ts`
- Modify: `messages/en.json`, `messages/pt.json`
- Delete: every file in `components/` except `components/diffuse/`, `components/site/`, and `components/waitlist-form.tsx` (Task 14); also `components/ui/`, `hooks/`, `styles/`, `components.json`

**Interfaces:**
- Consumes: kit (Task 9), `Link` (Task 10), `countryFromGeo` (Task 8).
- Produces: `getDefaultCountry(locale): Promise<Country>` in `lib/geo.ts`; `Hero({ locale, country, form: ReactNode })` with a `form` slot that Task 14 fills with `<WaitlistForm />` (until then the slot renders the email field + ActionRule linking to `#join`); anchor `#join` on the hero form.

- [ ] **Step 1: Messages** — add these namespaces to both files.

`messages/en.json` (merge into the existing object):

```json
{
  "nav": { "join": "Join the waitlist", "home": "grandma.app home" },
  "hero": {
    "status": "Waitlist open",
    "first": "Brasil first",
    "then": "Then the US",
    "title": "With you through every <em>chapter.</em>",
    "lede": "Cycle, pregnancy, the first years and menopause — one calm companion who remembers everything, judges nothing, and answers at 3am.",
    "videoAlt": "The grandma app: choosing your chapter, then the home screen"
  },
  "launch": {
    "title": "How the <em>launch</em> works.",
    "sub": "Invites go out in the order people join, country by country.",
    "steps": [
      { "k": "01", "title": "Join the list", "body": "Leave your email and where you are in life. That's all." },
      { "k": "02", "title": "Brasil, first", "body": "The first invites open in Brazil, in Portuguese." },
      { "k": "03", "title": "United States, next", "body": "Then the US, in English. Everywhere else after that." }
    ],
    "you": "You're here"
  },
  "chapters": {
    "title": "One companion, <em>four chapters.</em>",
    "sub": "The whole app reshapes itself around where you are. Switch any time — Grandma keeps your history.",
    "items": {
      "pre": { "label": "Chapter 01 · Trying", "title": "Cycle", "body": "Your cycle, hormones and fertile window — explained, not just tracked.", "alt": "Cycle home screen in the grandma app" },
      "preg": { "label": "Chapter 02 · Expecting", "title": "Pregnancy", "body": "Forty weeks, one at a time, with your baby's size and what's next.", "alt": "Pregnancy home screen in the grandma app" },
      "kids": { "label": "Chapter 03 · Raising", "title": "Kids", "body": "Sleep, feeds, growth and milestones from newborn to five — shared with your people.", "alt": "Kids home screen in the grandma app" },
      "meno": { "label": "Chapter 04 · The change", "title": "Menopause", "body": "Hot flashes, sleep and mood, with patterns over weeks and steady answers.", "alt": "Menopause quick log in the grandma app" }
    }
  },
  "grandma": {
    "title": "Meet <em>Grandma.</em>",
    "quote": "The friend who's awake at 3am — and actually knows things.",
    "body": "She knows your kids by name, remembers their ages and sleep patterns, tells you what the science says and what your grandmother would have done — and lets you decide.",
    "traits": ["Always there", "Knows your kids by name", "Never judges", "Cites real sources"],
    "videoAlt": "Asking Grandma a question in the app"
  },
  "faq": {
    "title": "The obvious <em>questions.</em>",
    "items": [
      { "q": "When does it launch?", "a": "Invites open in Brasil first, then in the United States. Within each country we go in the order people joined, and we never skip ahead." },
      { "q": "Is it only for pregnancy and babies?", "a": "No. Grandma has four chapters: Cycle, Pregnancy, Kids (newborn to five) and Menopause. Switch any time — she keeps your history." },
      { "q": "What will it cost?", "a": "Free to start. An optional Premium plan adds more, and you'll see it before you ever pay." },
      { "q": "Is my data private?", "a": "Yes. Your data is encrypted, never sold, and never used to train AI models. You can export it or delete your account at any time." }
    ]
  },
  "closing": { "eyebrow": "Ready when you are", "title": "Take your time. <em>We'll be here.</em>", "cta": "Save my seat" },
  "footer": { "tag": "A calm companion for your cycle, pregnancy, kids and menopause.", "line": "Calm where it counts, warm where it helps.", "privacy": "Privacy", "terms": "Terms", "rights": "© 2026 grandma.app" }
}
```

`messages/pt.json`:

```json
{
  "nav": { "join": "Entrar na lista", "home": "Início do grandma.app" },
  "hero": {
    "status": "Lista de espera aberta",
    "first": "Brasil primeiro",
    "then": "Depois os EUA",
    "title": "Com você em cada <em>capítulo.</em>",
    "lede": "Ciclo, gravidez, os primeiros anos e a menopausa — uma companhia calma que lembra de tudo, não julga nada e responde às 3 da manhã.",
    "videoAlt": "O app grandma: escolhendo o seu capítulo e depois a tela inicial"
  },
  "launch": {
    "title": "Como o <em>lançamento</em> funciona.",
    "sub": "Os convites saem na ordem de inscrição, país por país.",
    "steps": [
      { "k": "01", "title": "Entre na lista", "body": "Deixe o seu email e em que momento da vida você está. Só isso." },
      { "k": "02", "title": "Brasil, primeiro", "body": "Os primeiros convites abrem no Brasil, em português." },
      { "k": "03", "title": "Estados Unidos, depois", "body": "Depois os EUA, em inglês. O resto do mundo em seguida." }
    ],
    "you": "Você está aqui"
  },
  "chapters": {
    "title": "Uma companhia, <em>quatro capítulos.</em>",
    "sub": "O app inteiro se ajusta ao momento em que você está. Troque quando quiser — a Vovó guarda o seu histórico.",
    "items": {
      "pre": { "label": "Capítulo 01 · Tentando", "title": "Ciclo", "body": "Seu ciclo, seus hormônios e a janela fértil — explicados, não só registrados.", "alt": "Tela inicial do Ciclo no app grandma" },
      "preg": { "label": "Capítulo 02 · Esperando", "title": "Gravidez", "body": "Quarenta semanas, uma de cada vez, com o tamanho do bebê e o que vem pela frente.", "alt": "Tela inicial da Gravidez no app grandma" },
      "kids": { "label": "Capítulo 03 · Criando", "title": "Filhos", "body": "Sono, mamadas, crescimento e marcos do recém-nascido aos cinco anos — compartilhado com quem cuida junto.", "alt": "Tela inicial de Filhos no app grandma" },
      "meno": { "label": "Capítulo 04 · A mudança", "title": "Menopausa", "body": "Ondas de calor, sono e humor, com padrões ao longo das semanas e respostas calmas.", "alt": "Registro rápido da Menopausa no app grandma" }
    }
  },
  "grandma": {
    "title": "Conheça a <em>Vovó.</em>",
    "quote": "A amiga que está acordada às 3 da manhã — e que sabe das coisas.",
    "body": "Ela sabe o nome dos seus filhos, lembra das idades e do sono deles, conta o que a ciência diz e o que a sua avó teria feito — e deixa você decidir.",
    "traits": ["Sempre por perto", "Sabe o nome dos seus filhos", "Nunca julga", "Cita fontes reais"],
    "videoAlt": "Fazendo uma pergunta para a Vovó no app"
  },
  "faq": {
    "title": "As perguntas <em>óbvias.</em>",
    "items": [
      { "q": "Quando vai ser lançado?", "a": "Os convites abrem primeiro no Brasil, depois nos Estados Unidos. Em cada país seguimos a ordem de inscrição e nunca furamos a fila." },
      { "q": "É só para gravidez e bebês?", "a": "Não. A Vovó tem quatro capítulos: Ciclo, Gravidez, Filhos (do recém-nascido aos cinco anos) e Menopausa. Troque quando quiser — ela guarda o seu histórico." },
      { "q": "Quanto vai custar?", "a": "Grátis para começar. Um plano Premium opcional acrescenta mais, e você vê tudo antes de pagar qualquer coisa." },
      { "q": "Meus dados são privados?", "a": "Sim. Seus dados são criptografados, nunca são vendidos e nunca são usados para treinar modelos de IA. Você pode exportar tudo ou apagar a conta quando quiser." }
    ]
  },
  "closing": { "eyebrow": "Quando você quiser", "title": "Sem pressa. <em>A gente vai estar aqui.</em>", "cta": "Garantir meu lugar" },
  "footer": { "tag": "Uma companhia tranquila para o seu ciclo, gravidez, filhos e menopausa.", "line": "Calma onde importa, carinho onde ajuda.", "privacy": "Privacidade", "terms": "Termos", "rights": "© 2026 grandma.app" }
}
```

(The FAQ privacy answer no longer names vendors or Claude; Igor confirms wording in review.)

- [ ] **Step 2: Geo helper** — `lib/geo.ts`:

```ts
import 'server-only'
import { headers } from 'next/headers'
import { countryFromGeo, type Country } from './countries'

export async function getDefaultCountry(locale: 'en' | 'pt'): Promise<Country> {
  const h = await headers()
  return countryFromGeo(h.get('x-vercel-ip-country'), locale)
}
```

- [ ] **Step 3: Sections**

`components/site/nav.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Mark } from '@/components/diffuse'
import { LocaleSwitcher } from './locale-switcher'

export function Nav() {
  const t = useTranslations('nav')
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 30)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <header className={`sticky top-0 z-50 border-b transition-colors ${scrolled ? 'border-line bg-[color-mix(in_oklab,var(--bg)_82%,transparent)] backdrop-blur-[18px]' : 'border-transparent'}`}>
      <div className="mx-auto flex h-[78px] max-w-[1280px] items-center justify-between px-[22px] md:px-14">
        <Link href="/" aria-label={t('home')} className="flex items-center gap-2.5 font-display text-[32px] leading-none tracking-[-0.01em]">
          <Mark size={42} />grandma
        </Link>
        <div className="flex items-center gap-6">
          <LocaleSwitcher />
          <a href="#join" className="hidden font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-ink sm:inline">{t('join')} →</a>
        </div>
      </div>
    </header>
  )
}
```

`components/site/hero.tsx`:

```tsx
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { AppVideo } from '@/components/diffuse'
import type { Country } from '@/lib/countries'

export async function Hero({ locale, form }: { locale: 'en' | 'pt'; country: Country; form: ReactNode }) {
  const t = await getTranslations({ locale, namespace: 'hero' })
  return (
    <section className="pt-10">
      <p className="mb-8 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
        <span className="text-ink"><span aria-hidden="true" className="mr-2 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-[#3DAA6E] align-middle" />{t('status')}</span>
        <span aria-hidden="true">·</span><span>{t('first')}</span><span aria-hidden="true">·</span><span>{t('then')}</span>
      </p>
      <div className="grid items-start gap-14 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <h1 className="m-0 font-display text-[clamp(56px,8vw,118px)] font-light leading-[0.92] tracking-[-0.015em] [&_em]:italic [&_em]:text-ink-2">
            {t.rich('title', { em: (c) => <em>{c}</em> })}
          </h1>
          <p className="mt-6 max-w-[540px] text-[17px] font-light leading-[1.6] text-ink-2">{t('lede')}</p>
          <div id="join" className="mt-10 max-w-[520px] scroll-mt-28">{form}</div>
        </div>
        <div className="lg:sticky lg:top-28">
          <AppVideo shot="onboarding-picker" lang={locale} alt={t('videoAlt')} priority />
        </div>
      </div>
    </section>
  )
}
```

`components/site/launch.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { SectionHead } from '@/components/diffuse'
import type { Country } from '@/lib/countries'

type Step = { k: string; title: string; body: string }

export async function Launch({ locale, country }: { locale: 'en' | 'pt'; country: Country }) {
  const t = await getTranslations({ locale, namespace: 'launch' })
  const steps = t.raw('steps') as Step[]
  const here = country === 'BR' ? 1 : country === 'US' ? 2 : 0
  return (
    <section className="pt-[110px]">
      <SectionHead n="01" sub={t('sub')}>{t.rich('title', { em: (c) => <em>{c}</em> })}</SectionHead>
      <ol className="relative grid list-none gap-8 p-0 md:grid-cols-3 md:gap-6">
        <span aria-hidden="true" className="absolute left-[6px] top-0 h-full w-px bg-hair md:left-0 md:right-0 md:top-[6px] md:h-px md:w-auto" />
        {steps.map((s, i) => (
          <li key={s.k} className="relative pl-8 md:pl-0 md:pt-8">
            <span aria-hidden="true" className={`absolute left-0 top-1 h-[13px] w-[13px] rounded-full border-[1.5px] md:top-0 ${i === here ? 'border-accent bg-accent shadow-[inset_0_0_0_2.5px_var(--bg),0_0_0_6px_color-mix(in_oklab,var(--accent)_18%,transparent)]' : 'border-hair bg-bg'}`} />
            <p className="font-mono text-[11px] tracking-[0.14em] text-ink-3">{s.k}{i === here && <span className="ml-3 text-ink">· {t('you')}</span>}</p>
            <h3 className="mt-2 font-display text-[30px] font-normal leading-[1.05]">{s.title}</h3>
            <p className="mt-2 max-w-[320px] text-[15px] font-light text-ink-2">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
```

(`data-mode="pre"` on the `<section>` wrapper in the page gives the accent; see Step 4.)

`components/site/chapters.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { AppVideo, FieldCard, SectionHead } from '@/components/diffuse'
import { MODES } from '@/lib/modes'

const SHOT = { pre: 'home-pre', preg: 'home-preg', kids: 'home-kids', meno: 'home-meno' } as const
type Item = { label: string; title: string; body: string; alt: string }

export async function Chapters({ locale }: { locale: 'en' | 'pt' }) {
  const t = await getTranslations({ locale, namespace: 'chapters' })
  return (
    <section className="pt-[110px]">
      <SectionHead n="02" sub={t('sub')}>{t.rich('title', { em: (c) => <em>{c}</em> })}</SectionHead>
      <div className="grid gap-[22px] md:grid-cols-2">
        {MODES.map((m) => {
          const it = t.raw(`items.${m}`) as Item
          return (
            <FieldCard key={m} mode={m} label={it.label} title={it.title}>
              <p className="mb-6 mt-3.5 max-w-[380px] text-[15px] font-light text-[rgba(26,25,22,.72)]">{it.body}</p>
              <div className="mt-auto flex justify-center pt-2"><AppVideo shot={SHOT[m]} lang={locale} alt={it.alt} size="sm" /></div>
            </FieldCard>
          )
        })}
      </div>
    </section>
  )
}
```

`components/site/grandma.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { AppVideo, Chip, SectionHead } from '@/components/diffuse'

export async function Grandma({ locale }: { locale: 'en' | 'pt' }) {
  const t = await getTranslations({ locale, namespace: 'grandma' })
  return (
    <section className="pt-[110px]">
      <SectionHead n="03">{t.rich('title', { em: (c) => <em>{c}</em> })}</SectionHead>
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <p className="m-0 max-w-[520px] font-display text-[clamp(28px,3vw,38px)] italic leading-[1.15]">“{t('quote')}”</p>
          <p className="mt-6 max-w-[520px] text-[17px] font-light text-ink-2">{t('body')}</p>
          <div className="mt-7 flex flex-wrap gap-2.5">{(t.raw('traits') as string[]).map((x) => <Chip key={x} as="span">{x}</Chip>)}</div>
        </div>
        <div data-mode="kids" className="gfield soft rounded-d-xl py-10"><AppVideo shot="talk" lang={locale} alt={t('videoAlt')} /></div>
      </div>
    </section>
  )
}
```

`components/site/faq.tsx` (no JS — native `<details>`):

```tsx
import { getTranslations } from 'next-intl/server'
import { SectionHead } from '@/components/diffuse'

export async function Faq({ locale }: { locale: 'en' | 'pt' }) {
  const t = await getTranslations({ locale, namespace: 'faq' })
  const items = t.raw('items') as { q: string; a: string }[]
  return (
    <section className="pt-[110px]">
      <SectionHead n="04">{t.rich('title', { em: (c) => <em>{c}</em> })}</SectionHead>
      <div>
        {items.map((it, i) => (
          <details key={it.q} open={i === 0} className="group border-b border-line-2 py-[22px] first:border-t">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-display text-[clamp(24px,2.4vw,30px)] leading-[1.15] [&::-webkit-details-marker]:hidden">
              {it.q}
              <span aria-hidden="true" className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border border-line-2 transition-transform duration-300 group-open:rotate-45">
                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 2v10M2 7h10" stroke="#1A1916" strokeWidth="1.2" strokeLinecap="round" /></svg>
              </span>
            </summary>
            <p className="mb-0 mt-3 max-w-[720px] text-[16px] font-light leading-[1.7] text-ink-2">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
```

`components/site/closing.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'

export async function Closing({ locale }: { locale: 'en' | 'pt' }) {
  const t = await getTranslations({ locale, namespace: 'closing' })
  return (
    <section data-mode="kids" className="gfield mt-[110px] rounded-d-xl px-6 py-24 text-center shadow-card">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[rgba(26,25,22,.62)]">{t('eyebrow')}</p>
      <h2 className="mt-3.5 font-display text-[clamp(46px,6.4vw,92px)] font-light leading-[0.95] [&_em]:italic [&_em]:text-ink-2">{t.rich('title', { em: (c) => <em>{c}</em> })}</h2>
      <a href="#join" className="gradpill mx-auto mt-10 inline-flex items-center justify-center rounded-full px-9 py-4 text-[15px] font-semibold">{t('cta')}</a>
    </section>
  )
}
```

`components/site/footer.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Mark } from '@/components/diffuse'
import { LocaleSwitcher } from './locale-switcher'

export async function Footer({ locale }: { locale: 'en' | 'pt' }) {
  const t = await getTranslations({ locale, namespace: 'footer' })
  return (
    <footer className="mt-[90px] pb-16">
      <div className="flex flex-wrap items-start justify-between gap-8 border-t border-hair pt-8">
        <div>
          <div className="flex items-center gap-2.5 font-display text-[28px]"><Mark size={36} still />grandma</div>
          <p className="mt-3.5 max-w-[300px] text-[14px] font-light text-ink-3">{t('tag')}</p>
        </div>
        <nav className="flex gap-8 text-[15px] font-light text-ink-2">
          <Link href="/privacy" className="hover:text-ink">{t('privacy')}</Link>
          <Link href="/terms" className="hover:text-ink">{t('terms')}</Link>
          <a href="mailto:support@grandma.app" className="hover:text-ink">support@grandma.app</a>
        </nav>
      </div>
      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-hair pt-6">
        <p className="m-0 font-display text-[22px] italic text-ink-2">{t('line')}</p>
        <div className="flex items-center gap-6"><LocaleSwitcher /><span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-4">{t('rights')}</span></div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 4: Page** — `app/[locale]/page.tsx`:

```tsx
import { setRequestLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'
import { Nav } from '@/components/site/nav'
import { Hero } from '@/components/site/hero'
import { Launch } from '@/components/site/launch'
import { Chapters } from '@/components/site/chapters'
import { Grandma } from '@/components/site/grandma'
import { Faq } from '@/components/site/faq'
import { Closing } from '@/components/site/closing'
import { Footer } from '@/components/site/footer'
import { ActionRule, UnderlineField } from '@/components/diffuse'
import { getDefaultCountry } from '@/lib/geo'

export default async function Home({ params }: { params: Promise<{ locale: 'en' | 'pt' }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const country = await getDefaultCountry(locale)
  const t = await getTranslations({ locale, namespace: 'hero' })
  // Placeholder until Task 14 swaps in <WaitlistForm defaultCountry={country} />.
  const form = (
    <div className="grid gap-6">
      <UnderlineField label="Email" type="email" placeholder="you@example.com" />
      <ActionRule href="#join">{t('status')}</ActionRule>
    </div>
  )
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1180px] px-[22px] md:px-14">
        <Hero locale={locale} country={country} form={form} />
        <div data-mode="pre"><Launch locale={locale} country={country} /></div>
        <Chapters locale={locale} />
        <Grandma locale={locale} />
        <Faq locale={locale} />
        <Closing locale={locale} />
        <Footer locale={locale} />
      </main>
    </>
  )
}
```

- [ ] **Step 5: Delete the old site**

```bash
git rm -r components/ui hooks styles components.json \
  components/three-stages-section.tsx components/theme-provider.tsx components/connections-section.tsx \
  components/animated-hero-card.tsx components/grandma-logo.tsx components/memories-section.tsx components/pillars-section.tsx \
  components/meet-grandma-section.tsx components/phone-mockup.tsx components/footer.tsx components/testimonials-section.tsx \
  components/hero-section.tsx components/scroll-animations.tsx components/waitlist-faq-section.tsx components/navigation.tsx components/stickers.tsx
pnpm remove $(node -e "const p=require('./package.json').dependencies;console.log(Object.keys(p).filter(k=>k.startsWith('@radix-ui/')||['cmdk','embla-carousel-react','input-otp','react-day-picker','react-resizable-panels','recharts','sonner','vaul','next-themes','date-fns','react-hook-form','@hookform/resolvers','framer-motion','class-variance-authority','clsx','tailwind-merge','lucide-react','tw-animate-css'].includes(k)).join(' '))")
grep -rn "lib/utils" app components lib || git rm lib/utils.ts
```

- [ ] **Step 6: Verify**

```bash
pnpm i18n:check && pnpm test && pnpm typecheck && pnpm build
pnpm start & sleep 4
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -H "Accept-Language: pt-BR" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -H "Accept-Language: pt-PT" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -H "Accept-Language: de" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/en/pricing
curl -s -H "x-vercel-ip-country: US" http://localhost:3000/en | grep -o "You're here" | head -1
kill %1
```

Expected: `/pt`, `/pt`, `/en`; pricing `404`; "You're here" present (US step highlighted). Open `/pt` and `/en` at 390 / 768 / 1280: compare with the mockup; clips play; the four chapter cards show their own field colours.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(site): lean waitlist-first home — hero, launch BR→US, four chapters, Grandma, FAQ; remove old site + pricing"`

---

### Task 12: Privacy and terms

**Files:** Create `app/[locale]/privacy/page.tsx`, `app/[locale]/terms/page.tsx`, `components/site/legal-page.tsx`; Modify `messages/en.json`, `messages/pt.json` (namespaces `privacy`, `terms`)

**Interfaces:** `LegalPage({ locale, ns: 'privacy' | 'terms' })`; message shape `{ metaTitle, title, updated, note, sections: { id?: string; heading: string; paragraphs: string[] }[] }`.

- [ ] **Step 1: Messages.** Take the English text of the deleted pages from git (`git show HEAD~1:app/privacy/page.tsx`, `git show HEAD~1:app/terms/page.tsx` — use the commit before Task 10's deletion: `git log --oneline -- app/privacy/page.tsx`), put each heading and paragraph into `privacy.sections[]` / `terms.sections[]` verbatim, then translate into pt-BR (glossary). Remove any mention of prices. Add to **both** privacy files a section with `"id": "waitlist-data"`:

EN:
```json
{ "id": "waitlist-data", "heading": "The waitlist", "paragraphs": [
  "When you join the waitlist we store your email, your name if you give it, the chapter you chose, your country, the site language, whether you want the launch notice, where you came from (campaign tags and referring site) and a one-way hash of your IP address used only to prevent abuse.",
  "We use this only to send your invite and, if you asked, one launch notice. We never sell it or share it for marketing.",
  "To be removed, email support@grandma.app and we'll delete your entry."
]}
```

PT:
```json
{ "id": "waitlist-data", "heading": "A lista de espera", "paragraphs": [
  "Quando você entra na lista de espera, guardamos o seu email, o seu nome se você informar, o capítulo que escolheu, o seu país, o idioma do site, se você quer o aviso de lançamento, de onde você veio (tags de campanha e site de origem) e um hash irreversível do seu endereço IP, usado só para evitar abuso.",
  "Usamos esses dados só para enviar o seu convite e, se você pediu, um aviso de lançamento. Nunca vendemos nem compartilhamos para marketing.",
  "Para sair da lista, escreva para support@grandma.app e apagamos o seu registro."
]}
```

Also set `privacy.note` / `terms.note`: EN "This is the authoritative version." / PT "Esta é uma tradução. Em caso de divergência, vale a versão em inglês."

- [ ] **Step 2: Shared page** — `components/site/legal-page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { Nav } from './nav'
import { Footer } from './footer'

type Section = { id?: string; heading: string; paragraphs: string[] }

export async function LegalPage({ locale, ns }: { locale: 'en' | 'pt'; ns: 'privacy' | 'terms' }) {
  const t = await getTranslations({ locale, namespace: ns })
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1180px] px-[22px] md:px-14">
        <article className="mx-auto max-w-[720px] pt-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">{t('updated')}</p>
          <h1 className="mt-3 font-display text-[clamp(48px,6vw,80px)] font-light leading-[0.95]">{t('title')}</h1>
          <p className="mt-4 text-[14px] text-ink-3">{t('note')}</p>
          {(t.raw('sections') as Section[]).map((s) => (
            <section key={s.heading} id={s.id} className="mt-10 scroll-mt-28 border-t border-line pt-10">
              <h2 className="font-display text-[28px] font-normal">{s.heading}</h2>
              {s.paragraphs.map((p) => <p key={p.slice(0, 32)} className="mt-4 font-light leading-[1.7] text-ink-2">{p}</p>)}
            </section>
          ))}
        </article>
        <Footer locale={locale} />
      </main>
    </>
  )
}
```

`app/[locale]/privacy/page.tsx` (terms: same with `'terms'`):

```tsx
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { LegalPage } from '@/components/site/legal-page'

export async function generateMetadata({ params }: { params: Promise<{ locale: 'en' | 'pt' }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'privacy' })
  return { title: t('metaTitle'), alternates: { canonical: `/${locale}/privacy`, languages: { en: '/en/privacy', 'pt-BR': '/pt/privacy' } } }
}

export default async function Page({ params }: { params: Promise<{ locale: 'en' | 'pt' }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <LegalPage locale={locale} ns="privacy" />
}
```

- [ ] **Step 3: Verify and commit** — `pnpm i18n:check && pnpm build`; open `/pt/privacy#waitlist-data` and `/en/terms`.

```bash
git add -A && git commit -m "feat(site): privacy and terms in PT/EN with waitlist data section"
```

---

### Task 13: Waitlist submission core (schema with country, IP hash, submit)

**Files:** Create `lib/waitlist/types.ts`, `lib/waitlist/schema.ts`, `lib/waitlist/hash.ts`, `lib/waitlist/submit.ts`; Tests `lib/waitlist/schema.test.ts`, `hash.test.ts`, `submit.test.ts`

**Interfaces:**
- `types.ts`:
  ```ts
  import type { Mode } from '@/lib/modes'
  import type { Country } from '@/lib/countries'
  import type { Locale } from '@/i18n/routing'
  export type WaitlistErrorCode = 'email_required' | 'email_invalid' | 'email_too_long' | 'name_too_long' | 'mode_required' | 'country_required'
  export type WaitlistField = 'email' | 'name' | 'mode' | 'country'
  export type WaitlistState =
    | { status: 'idle' }
    | { status: 'success'; country: Country }
    | { status: 'invalid'; fieldErrors: Partial<Record<WaitlistField, WaitlistErrorCode>> }
    | { status: 'rate_limited' }
    | { status: 'error' }
  export interface WaitlistRow {
    email: string; name: string | null; mode: Mode; locale: Locale; country: Country; notifyLaunch: boolean
    utmSource: string | null; utmMedium: string | null; utmCampaign: string | null; referrer: string | null
  }
  export interface WaitlistDeps {
    join(row: WaitlistRow, ipHash: string | null): Promise<'ok' | 'rate_limited'>
    hashIp(ip: string | null): string | null
  }
  ```
- `waitlistSchema` (zod 3), `formDataToObject(fd)`, `makeIpHasher(salt)`, `submitWaitlist(raw, ip, deps): Promise<WaitlistState>`.

- [ ] **Step 1: Failing tests**

`lib/waitlist/schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { waitlistSchema, formDataToObject } from './schema'

const base = { email: 'ana@example.com', mode: 'preg', locale: 'pt', country: 'BR' }

describe('waitlistSchema', () => {
  it('normalises email', () => expect(waitlistSchema.parse({ ...base, email: '  Ana@Example.COM ' }).email).toBe('ana@example.com'))
  it('maps empty name to null', () => {
    expect(waitlistSchema.parse({ ...base, name: '   ' }).name).toBeNull()
    expect(waitlistSchema.parse({ ...base, name: ' Ana ' }).name).toBe('Ana')
  })
  it('reads the checkbox', () => {
    expect(waitlistSchema.parse({ ...base, notify_launch: 'on' }).notifyLaunch).toBe(true)
    expect(waitlistSchema.parse(base).notifyLaunch).toBe(false)
  })
  it('falls back to en for unknown locale', () => expect(waitlistSchema.parse({ ...base, locale: 'de' }).locale).toBe('en'))
  it('accepts the three countries', () => {
    for (const c of ['BR', 'US', 'OTHER']) expect(waitlistSchema.parse({ ...base, country: c }).country).toBe(c)
  })
  it('drops oversized utm values', () => {
    const r = waitlistSchema.parse({ ...base, utm_source: 'x'.repeat(201), utm_medium: 'social' })
    expect(r.utmSource).toBeNull()
    expect(r.utmMedium).toBe('social')
  })
  it.each([
    [{ ...base, email: '' }, 'email', 'email_required'],
    [{ ...base, email: 'ana@' }, 'email', 'email_invalid'],
    [{ ...base, email: `${'a'.repeat(250)}@x.co` }, 'email', 'email_too_long'],
    [{ ...base, name: 'n'.repeat(81) }, 'name', 'name_too_long'],
    [{ ...base, mode: 'care' }, 'mode', 'mode_required'],
    [{ email: 'ana@example.com', locale: 'pt', country: 'BR' }, 'mode', 'mode_required'],
    [{ ...base, country: 'DE' }, 'country', 'country_required'],
    [{ email: 'ana@example.com', locale: 'pt', mode: 'preg' }, 'country', 'country_required'],
  ])('rejects %j (%s=%s)', (input, field, code) => {
    const r = waitlistSchema.safeParse(input)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.flatten().fieldErrors[field as 'email']?.[0]).toBe(code)
  })
})

describe('formDataToObject', () => {
  it('keeps string entries only', () => {
    const fd = new FormData()
    fd.set('email', 'a@b.co')
    fd.set('file', new Blob(['x']))
    expect(formDataToObject(fd)).toEqual({ email: 'a@b.co' })
  })
})
```

`lib/waitlist/hash.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { makeIpHasher } from './hash'

describe('makeIpHasher', () => {
  const h = makeIpHasher('salt-1')
  it('deterministic hex', () => { expect(h('1.2.3.4')).toBe(h('1.2.3.4')); expect(h('1.2.3.4')).toMatch(/^[0-9a-f]{64}$/) })
  it('salted, never the raw ip', () => { expect(makeIpHasher('salt-2')('1.2.3.4')).not.toBe(h('1.2.3.4')); expect(h('1.2.3.4')).not.toContain('1.2.3.4') })
  it('null for missing ip', () => { expect(h(null)).toBeNull(); expect(h('')).toBeNull() })
  it('refuses an empty salt', () => expect(() => makeIpHasher('')).toThrow())
})
```

`lib/waitlist/submit.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { submitWaitlist } from './submit'
import type { WaitlistDeps } from './types'

const deps = (result: 'ok' | 'rate_limited' | Error = 'ok') => {
  const join = vi.fn(async () => { if (result instanceof Error) throw result; return result })
  return { join, hashIp: vi.fn((ip: string | null) => (ip ? `h(${ip})` : null)) } satisfies WaitlistDeps
}
const valid = { email: ' Ana@Example.com ', name: 'Ana', mode: 'meno', locale: 'pt', country: 'BR', notify_launch: 'on', utm_source: 'ig' }

describe('submitWaitlist', () => {
  it('writes a normalised row with hashed ip and echoes the country', async () => {
    const d = deps()
    expect(await submitWaitlist(valid, '1.2.3.4', d)).toEqual({ status: 'success', country: 'BR' })
    expect(d.join).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@example.com', mode: 'meno', country: 'BR', notifyLaunch: true, utmSource: 'ig' }), 'h(1.2.3.4)')
  })
  it('honeypot → success without writing', async () => {
    const d = deps()
    expect(await submitWaitlist({ ...valid, company: 'Acme' }, null, d)).toEqual({ status: 'success', country: 'BR' })
    expect(d.join).not.toHaveBeenCalled()
  })
  it('invalid → field errors, no write', async () => {
    const d = deps()
    expect(await submitWaitlist({ ...valid, email: 'nope', mode: '', country: '' }, null, d)).toEqual({
      status: 'invalid', fieldErrors: { email: 'email_invalid', mode: 'mode_required', country: 'country_required' },
    })
    expect(d.join).not.toHaveBeenCalled()
  })
  it('rate limit passes through', async () => expect(await submitWaitlist(valid, '1.2.3.4', deps('rate_limited'))).toEqual({ status: 'rate_limited' }))
  it('storage failure → generic error, email masked in logs', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await submitWaitlist(valid, null, deps(new Error('db down for ana@example.com')))).toEqual({ status: 'error' })
    expect(JSON.stringify(spy.mock.calls)).not.toContain('ana@example.com')
    spy.mockRestore()
  })
})
```

Run `pnpm test lib/waitlist` → FAIL.

- [ ] **Step 2: Implement**

`lib/waitlist/types.ts`: exactly the Interfaces block above.

`lib/waitlist/schema.ts`:

```ts
import { z } from 'zod'
import { MODES } from '@/lib/modes'
import { COUNTRIES } from '@/lib/countries'
import { routing } from '@/i18n/routing'
import type { WaitlistRow } from './types'

const optionalText = (max: number) => z.string().trim().max(max).optional().catch(undefined).transform((v) => v || null)

export const waitlistSchema = z
  .object({
    email: z.string({ required_error: 'email_required' }).trim().toLowerCase().min(1, 'email_required').max(254, 'email_too_long').email('email_invalid'),
    name: z.string().trim().max(80, 'name_too_long').optional().transform((v) => v || null),
    mode: z.enum(MODES, { errorMap: () => ({ message: 'mode_required' }) }),
    country: z.enum(COUNTRIES, { errorMap: () => ({ message: 'country_required' }) }),
    locale: z.enum(routing.locales).catch('en'),
    notify_launch: z.string().optional().transform((v) => v === 'on' || v === 'true'),
    utm_source: optionalText(200),
    utm_medium: optionalText(200),
    utm_campaign: optionalText(200),
    referrer: optionalText(200),
  })
  .transform((v): WaitlistRow => ({
    email: v.email, name: v.name, mode: v.mode, locale: v.locale, country: v.country, notifyLaunch: v.notify_launch,
    utmSource: v.utm_source, utmMedium: v.utm_medium, utmCampaign: v.utm_campaign, referrer: v.referrer,
  }))

export function formDataToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of fd.entries()) if (typeof v === 'string') out[k] = v
  return out
}
```

`lib/waitlist/hash.ts`:

```ts
import { createHash } from 'node:crypto'

/** One-way hash of the client IP for rate limiting. The raw IP is never stored. */
export function makeIpHasher(salt: string): (ip: string | null) => string | null {
  if (!salt) throw new Error('WAITLIST_IP_SALT is not set')
  return (ip) => (ip ? createHash('sha256').update(`${salt}:${ip}`).digest('hex') : null)
}
```

`lib/waitlist/submit.ts`:

```ts
import { waitlistSchema } from './schema'
import { COUNTRIES, type Country } from '@/lib/countries'
import type { WaitlistDeps, WaitlistErrorCode, WaitlistField, WaitlistState } from './types'

const FIELDS: WaitlistField[] = ['email', 'name', 'mode', 'country']
const asCountry = (v: string | undefined): Country => ((COUNTRIES as readonly string[]).includes(v ?? '') ? (v as Country) : 'OTHER')

export async function submitWaitlist(raw: Record<string, string>, ip: string | null, deps: WaitlistDeps): Promise<WaitlistState> {
  if (raw.company && raw.company.trim() !== '') return { status: 'success', country: asCountry(raw.country) }

  const parsed = waitlistSchema.safeParse(raw)
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>
    const fieldErrors: Partial<Record<WaitlistField, WaitlistErrorCode>> = {}
    for (const f of FIELDS) if (flat[f]?.[0]) fieldErrors[f] = flat[f]![0] as WaitlistErrorCode
    return { status: 'invalid', fieldErrors }
  }

  try {
    const result = await deps.join(parsed.data, deps.hashIp(ip))
    return result === 'rate_limited' ? { status: 'rate_limited' } : { status: 'success', country: parsed.data.country }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[waitlist] join failed:', message.replace(/[^\s@]+@[^\s@]+/g, '<email>'))
    return { status: 'error' }
  }
}
```

- [ ] **Step 3: Run** → PASS. Commit: `git add lib/waitlist && git commit -m "feat(waitlist): validation with country, IP hashing, submit core"`

---

### Task 14: Server action, Supabase client, waitlist form in the hero

**Files:** Create `lib/waitlist/supabase.ts`, `lib/waitlist/action.ts`, `components/waitlist-form.tsx`, `.env.example`; Modify `app/[locale]/page.tsx` (use the form), `messages/en.json`, `messages/pt.json` (`form` namespace)

**Interfaces:**
- Consumes: Task 13; kit; `Country`; `MODES`.
- Produces: `joinWaitlist(prev: WaitlistState, fd: FormData): Promise<WaitlistState>`; `<WaitlistForm defaultCountry={Country} />`.

- [ ] **Step 1: Supabase deps** — `lib/waitlist/supabase.ts`:

```ts
import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { makeIpHasher } from './hash'
import type { WaitlistDeps } from './types'

const required = (name: string) => { const v = process.env[name]; if (!v) throw new Error(`${name} is not set`); return v }
let cached: WaitlistDeps | null = null

export function waitlistDeps(): WaitlistDeps {
  if (cached) return cached
  const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } })
  cached = {
    hashIp: makeIpHasher(required('WAITLIST_IP_SALT')),
    async join(row, ipHash) {
      const { data, error } = await supabase.rpc('waitlist_join', {
        p_email: row.email, p_name: row.name, p_mode: row.mode, p_locale: row.locale, p_country: row.country,
        p_notify_launch: row.notifyLaunch, p_utm_source: row.utmSource, p_utm_medium: row.utmMedium,
        p_utm_campaign: row.utmCampaign, p_referrer: row.referrer, p_ip_hash: ipHash,
      })
      if (error) throw new Error(`waitlist_join: ${error.code} ${error.message}`)
      return data === 'rate_limited' ? 'rate_limited' : 'ok'
    },
  }
  return cached
}
```

`lib/waitlist/action.ts`:

```ts
'use server'

import { headers } from 'next/headers'
import { submitWaitlist } from './submit'
import { formDataToObject } from './schema'
import { waitlistDeps } from './supabase'
import type { WaitlistState } from './types'

export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
  return submitWaitlist(formDataToObject(formData), ip, waitlistDeps())
}
```

`.env.example`:

```bash
# Waitlist (server-only). Same Supabase project as grandma-app / grandma-command-center.
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
# Long random string (openssl rand -hex 32). Changing it resets rate-limit buckets.
WAITLIST_IP_SALT=
NEXT_PUBLIC_SITE_URL=https://grandma.app
```

Ensure `.gitignore` covers `.env*.local`.

- [ ] **Step 2: Messages** — `form` namespace.

EN:
```json
"form": {
  "email": "Email", "emailPh": "you@example.com",
  "country": "Where do you live?", "countries": { "BR": "Brasil", "US": "United States", "OTHER": "Other" },
  "mode": "Where are you <em>right now?</em>",
  "modes": { "pre": ["Chapter 01", "Trying"], "preg": ["Chapter 02", "Expecting"], "kids": ["Chapter 03", "Raising"], "meno": ["Chapter 04", "The change"] },
  "name": "Your name · optional", "namePh": "Maya",
  "notify": "Also tell me when the app launches in my country.",
  "submit": "Save my seat", "submitting": "Saving…", "retry": "Try again",
  "consent": "We keep your details only to send your invite and the launch notice. <link>How we handle your data</link>.",
  "honeypot": "Leave this field empty",
  "success": { "title": "You're on the <em>list.</em>", "BR": "We'll write when invites open in Brasil.", "US": "We'll write when invites open in the United States.", "OTHER": "We'll write when the app reaches you." },
  "rateLimited": "Too many tries from this connection. Please try again in an hour.",
  "error": "Something went wrong on our side. Please try again.",
  "errors": { "email_required": "Please enter your email.", "email_invalid": "That email doesn't look right.", "email_too_long": "That email is too long.", "name_too_long": "Please use 80 characters or fewer.", "mode_required": "Pick the chapter you're in.", "country_required": "Pick where you live." }
}
```

PT:
```json
"form": {
  "email": "Email", "emailPh": "voce@exemplo.com",
  "country": "Onde você mora?", "countries": { "BR": "Brasil", "US": "Estados Unidos", "OTHER": "Outro" },
  "mode": "Onde você está <em>agora?</em>",
  "modes": { "pre": ["Capítulo 01", "Tentando"], "preg": ["Capítulo 02", "Esperando"], "kids": ["Capítulo 03", "Criando"], "meno": ["Capítulo 04", "A mudança"] },
  "name": "Seu nome · opcional", "namePh": "Maya",
  "notify": "Também quero saber quando o app chegar ao meu país.",
  "submit": "Garantir meu lugar", "submitting": "Salvando…", "retry": "Tentar de novo",
  "consent": "Guardamos seus dados só para enviar o convite e o aviso de lançamento. <link>Como cuidamos dos seus dados</link>.",
  "honeypot": "Deixe este campo vazio",
  "success": { "title": "Você está na <em>lista.</em>", "BR": "A gente escreve quando os convites abrirem no Brasil.", "US": "A gente escreve quando os convites abrirem nos Estados Unidos.", "OTHER": "A gente escreve quando o app chegar até você." },
  "rateLimited": "Muitas tentativas a partir desta conexão. Tente de novo daqui a uma hora.",
  "error": "Algo deu errado do nosso lado. Tente de novo.",
  "errors": { "email_required": "Digite o seu email.", "email_invalid": "Esse email não parece certo.", "email_too_long": "Esse email é longo demais.", "name_too_long": "Use até 80 caracteres.", "mode_required": "Escolha a fase em que você está.", "country_required": "Escolha onde você mora." }
}
```

- [ ] **Step 3: Form** — `components/waitlist-form.tsx`:

```tsx
'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { joinWaitlist } from '@/lib/waitlist/action'
import type { WaitlistState } from '@/lib/waitlist/types'
import { MODES, type Mode } from '@/lib/modes'
import { COUNTRIES, type Country } from '@/lib/countries'
import { ActionRule, BloomPicker, Chip, Mark, UnderlineField } from '@/components/diffuse'

const INITIAL: WaitlistState = { status: 'idle' }
const UTM = ['utm_source', 'utm_medium', 'utm_campaign'] as const

export function WaitlistForm({ defaultCountry }: { defaultCountry: Country }) {
  const t = useTranslations('form')
  const locale = useLocale()
  const [state, action, pending] = useActionState(joinWaitlist, INITIAL)
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState<Country>(defaultCountry)
  const [mode, setMode] = useState<Mode | ''>('')
  // Starts expanded so the full form works before hydration / without JS; collapses on small screens after mount.
  const [expanded, setExpanded] = useState(true)
  const [attrib, setAttrib] = useState<Record<string, string>>({})
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setExpanded(false)
    const p = new URLSearchParams(window.location.search)
    const a: Record<string, string> = {}
    for (const k of UTM) { const v = p.get(k); if (v) a[k] = v }
    if (document.referrer && !document.referrer.startsWith(window.location.origin)) a.referrer = document.referrer
    setAttrib(a)
  }, [])
  useEffect(() => { if (state.status !== 'idle') { setExpanded(true); statusRef.current?.focus() } }, [state])

  if (state.status === 'success') {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="outline-none">
        <Mark size={72} />
        <p className="mt-3 font-display text-[44px] leading-none [&_em]:italic [&_em]:text-ink-2">{t.rich('success.title', { em: (c) => <em>{c}</em> })}</p>
        <p className="mt-3 text-[16px] font-light text-ink-2">{t(`success.${state.country}`)}</p>
      </div>
    )
  }

  const errs = state.status === 'invalid' ? state.fieldErrors : {}
  const show = expanded || email.length > 0
  return (
    <form action={action} noValidate className="grid gap-7">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="country" value={country} />
      {Object.entries(attrib).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div aria-hidden="true" className="absolute left-[-10000px] h-px w-px overflow-hidden">
        <label>{t('honeypot')}<input type="text" name="company" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <UnderlineField label={t('email')} name="email" type="email" autoComplete="email" required placeholder={t('emailPh')}
        value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setExpanded(true)}
        error={errs.email ? t(`errors.${errs.email}`) : undefined} />

      <div className={show ? 'grid gap-7' : 'hidden md:grid md:gap-7'}>
        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3" id="country-label">{t('country')}</p>
          <div role="radiogroup" aria-labelledby="country-label" className="flex flex-wrap gap-2.5">
            {COUNTRIES.map((c) => <Chip key={c} role="radio" aria-checked={country === c} selected={country === c} onClick={() => setCountry(c)}>{t(`countries.${c}`)}</Chip>)}
          </div>
          {errs.country && <p className="mt-2 text-[14px] text-err">{t(`errors.${errs.country}`)}</p>}
        </div>
        <BloomPicker name="mode" value={mode} onChange={setMode}
          legend={t.rich('mode', { em: (c) => <em>{c}</em> })}
          options={MODES.map((m) => { const [kicker, label] = t.raw(`modes.${m}`) as [string, string]; return { value: m, kicker, label, mode: m } })}
          error={errs.mode ? t(`errors.${errs.mode}`) : undefined} />
        <UnderlineField label={t('name')} name="name" autoComplete="given-name" maxLength={80} placeholder={t('namePh')} error={errs.name ? t(`errors.${errs.name}`) : undefined} />
        <label className="flex cursor-pointer items-start gap-3 text-[15px] font-light text-ink-2">
          <input type="checkbox" name="notify_launch" className="mt-1.5 h-4 w-4 accent-[var(--ink)]" />{t('notify')}
        </label>
      </div>

      <div ref={statusRef} tabIndex={-1} aria-live="polite" className="outline-none">
        {state.status === 'rate_limited' && <p className="rounded-d-sm border border-err/50 bg-white/45 px-4 py-3 text-[14.5px] text-err">{t('rateLimited')}</p>}
        {state.status === 'error' && <p className="rounded-d-sm border border-err/50 bg-white/45 px-4 py-3 text-[14.5px] text-err">{t('error')}</p>}
      </div>

      <ActionRule type="submit" pending={pending}>{pending ? t('submitting') : state.status === 'error' ? t('retry') : t('submit')}</ActionRule>
      <p className="m-0 text-[12.5px] font-light leading-[1.6] text-ink-3">
        {t.rich('consent', { link: (c) => <Link href="/privacy#waitlist-data" className="text-ink underline underline-offset-2">{c}</Link> })}
      </p>
    </form>
  )
}
```

Mobile: after hydration only the email field and submit show until the email is focused or typed; desktop always shows everything. Before hydration (or without JS) the whole form is visible, so it always works.

- [ ] **Step 4: Use it** — in `app/[locale]/page.tsx` replace the placeholder `form` with:

```tsx
import { WaitlistForm } from '@/components/waitlist-form'
// …
const form = <WaitlistForm defaultCountry={country} />
```

and remove the now-unused `ActionRule`, `UnderlineField` and `getTranslations('hero')` placeholder imports.

- [ ] **Step 5: Local end-to-end** — `.env.local` with real `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WAITLIST_IP_SALT=$(openssl rand -hex 32)`. `pnpm dev`, then on `/pt?utm_source=qa`:
1. Empty submit → email, chapter errors in PT; nothing written.
2. `QA-Site@Example.com`, Brasil, Menopausa, notify on → success "…abrirem no Brasil."
3. Reload, same email, Estados Unidos, Filhos → success "…nos Estados Unidos."
4. CC `/waitlist` (or SQL): one row `qa-site@example.com`, `country = US`, `mode = kids`, `utm_source = qa`, `created_at` from step 2.
5. `curl -s -H "x-vercel-ip-country: US" localhost:3000/pt | grep -o 'aria-checked="true"[^>]*>Estados Unidos'` → match (geo default).
6. DevTools → disable JavaScript → reload → submit a new email → success renders.
7. `grep -r "SERVICE_ROLE\|service_role" .next/static || echo clean` → `clean`.
Delete QA rows: `delete from public.waitlist where email like 'qa-site%';`.

- [ ] **Step 6: Commit**

```bash
pnpm test && pnpm i18n:check && pnpm typecheck && pnpm build
git add -A
git commit -m "feat(waitlist): server action with country, hero form with bloom picker and geo default"
```

---

### Task 15: OG images, cleanup, final verification

**Files:** Create `app/[locale]/opengraph-image.tsx`; Modify `next.config.mjs` (typecheck gate), `public/` (remove unused placeholders)

- [ ] **Step 1: OG image** — `app/[locale]/opengraph-image.tsx`:

```tsx
import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'
import { FIELDS } from '@/lib/modes'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OG({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  const h = await getTranslations({ locale, namespace: 'hero' })
  const f = FIELDS.pre
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, color: '#1A1916',
        background: `radial-gradient(circle at 18% 22%, ${f.g1}, transparent 55%), radial-gradient(circle at 84% 18%, ${f.g2}, transparent 55%), radial-gradient(circle at 74% 86%, ${f.g3}, transparent 55%), radial-gradient(circle at 20% 82%, ${f.g4}, transparent 55%), #F4F1E8` }}>
        <div style={{ fontSize: 26, letterSpacing: 6, textTransform: 'uppercase' }}>{`${h('status')} · ${h('first')} · ${h('then')}`}</div>
        <div style={{ fontSize: 84, lineHeight: 1, maxWidth: 1000 }}>{t('ogTitle')}</div>
      </div>
    ),
    size,
  )
}
```

- [ ] **Step 2: Cleanup** — remove unused files in `public/` (`placeholder*.{png,svg,jpg}`, `placeholder-user.jpg`), check `grep -rn "placeholder" app components` returns nothing. Run `pnpm typecheck`; if zero errors, set `ignoreBuildErrors: false` in `next.config.mjs`.

- [ ] **Step 3: Final verification**

```bash
pnpm test && pnpm i18n:check && pnpm typecheck && pnpm build && pnpm start
```

With `pnpm start`:
- Screenshots of `/pt` and `/en` at 390, 768, 1280; compare with the mockup. No horizontal scroll at 390.
- Lighthouse mobile on `/pt`: Accessibility ≥ 95, LCP < 2.5 s.
- DevTools → Rendering → `prefers-reduced-motion: reduce`: every phone shows its poster; the mark stops blinking.
- Block `*.webm` and `*.mp4` in DevTools Network: posters show, layout doesn't shift.
- `curl -sI localhost:3000/pt/opengraph-image | head -3` → 200, `image/png`.
- Task 14 Step 5 items 2–4 once more against the production build.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "chore(site): localized OG images, cleanup, typecheck gate"`

- [ ] **Step 5: Hand-off for Igor**
1. PT copy in `messages/pt.json` and the 16 clips (already reviewed in Task 7) — final read.
2. Vercel env vars for the site: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WAITLIST_IP_SALT`, `NEXT_PUBLIC_SITE_URL`.
3. PRs: `feat/waitlist-pillar` (CC) first — its migration is already applied — then `feat/waitlist-diffuse-i18n` (site).
