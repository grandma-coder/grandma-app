# Site waitlist, Diffuse redesign and PT/EN — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The grandma.app marketing site collects a real waitlist (managed in grandma-command-center), uses the app's Diffuse design system, and is available in English and Brazilian Portuguese.

**Architecture:** A `public.waitlist` table and a `waitlist_join` SQL function live in grandma's Supabase Postgres, owned by grandma-command-center. The site (Next 16 + next-intl, routes `/en` and `/pt`) writes through a server action that calls the function with the service-role key. The command center adds a Waitlist pillar (tRPC router + page) that reads, exports and promotes signups to `beta_testers`. The site is reskinned through a small Diffuse primitive kit in `components/diffuse/`.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, next-intl 4, zod 3 (site) / zod 4 (command center), @supabase/supabase-js 2, Drizzle + postgres-js, tRPC 11, Clerk, Vitest, framer-motion.

**Spec:** `docs/superpowers/specs/2026-10-30-site-waitlist-diffuse-i18n-design.md` (in `v0-grandma-app`).

**Repos and paths:**
- SITE = `/Users/igorcarvalhorodrigues/dev/v0-grandma-app` (branch `feat/waitlist-diffuse-i18n`, already created)
- CC = `/Users/igorcarvalhorodrigues/dev/grandma-command-center` (create branch `feat/waitlist-pillar` from `main` in Task 1)
- APP = `/Users/igorcarvalhorodrigues/dev/grandma-app` (read-only reference; never modified)

## Global Constraints

- Never modify the `grandma-app` repo.
- Locales are exactly `en` and `pt`. `pt` means pt-BR (`<html lang="pt-BR">`, hreflang `pt-BR`).
- Modes are exactly `pre`, `preg`, `kids`, `meno`. No caregiver mode anywhere on the site.
- Waitlist emails are stored lowercased and trimmed. `created_at` is never updated after insert.
- The service-role key is used only in server-only modules. It must never appear in a client bundle.
- Command center tables: RLS enabled, no policies. Every PII read and every export calls `writeAudit(...)`.
- CC DB driver: `db.execute<T>(sql\`…\`)` returns a RowList — iterate with `Array.from(res)`. `DATABASE_URL` is the transaction pooler.
- CC middleware is `proxy.ts`. The SITE's middleware is also `proxy.ts` (Next 16).
- Diffuse rules: no filled pills, no stamp shadows. Primary CTA is a containerless mono label + arrow on a hairline. Fonts are assigned by role: Hanken Grotesk Bold for titles and feeling words, Hanken Grotesk Regular for reading, Space Mono for labels/data.
- PT glossary (from the app's `lib/i18n/pt-BR.ts`): Grandma in prose = "a Vovó"; the brand stays "grandma.app"; modes = "Ciclo", "Gravidez", "Filhos", "Menopausa"; address the reader as "você"; feminine forms where the app uses them ("Bem-vinda").
- No fabricated numbers on the page (no fake counters, no invented user counts).

## Review Focus

1. **Same email, different case or whitespace** (`" Ana@X.com "` then `"ana@x.com"`): expect one row, original `created_at`, success both times. Pinned in Task 1 (SQL verification) and Task 14 (schema test).
2. **CSV opened in Excel with a name like `=HYPERLINK(...)`**: expect the cell rendered as text, not a formula. Pinned in Task 2 (`toCsv` test).
3. **Visitor with `Accept-Language: pt-PT` or `pt`**: expect `/pt`, not `/en`. Pinned in Task 5 (manual curl check).
4. **Promote to beta when the email is already in `beta_testers`**: expect no error, waitlist row still marked invited, nothing duplicated. Pinned in Task 3 (live verification script) and Task 1 constraint.
5. **Form submitted with JavaScript disabled or before hydration**: expect the server action to still run and render the result. Pinned in Task 15 (the form uses `action={formAction}`, not `onSubmit`).

---

## Part A — grandma-command-center

### Task 1: Waitlist table, join function and Drizzle schema

**Files:**
- Create: `CC/migrations/0018_waitlist.sql`
- Create: `CC/scripts/verify-waitlist.mjs`
- Modify: `CC/db/schema/center.ts` (append table after `betaTesters`)

**Interfaces:**
- Produces: table `public.waitlist`; function `public.waitlist_join(p_email text, p_name text, p_mode text, p_locale text, p_notify_launch boolean, p_utm_source text, p_utm_medium text, p_utm_campaign text, p_referrer text, p_ip_hash text) returns text` (`'ok' | 'rate_limited'`); Drizzle export `waitlist` from `@/db/schema`.

- [ ] **Step 1: Create the branch**

```bash
cd /Users/igorcarvalhorodrigues/dev/grandma-command-center
git checkout main && git pull && git checkout -b feat/waitlist-pillar
```

- [ ] **Step 2: Write the migration**

`migrations/0018_waitlist.sql`:

```sql
-- Waitlist — signups from the grandma.app marketing site (v0-grandma-app).
-- Command-center-owned. The site WRITES only through waitlist_join() with the
-- service role; the console READS, exports and promotes rows to beta_testers.
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.waitlist (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  name          TEXT,
  mode          TEXT NOT NULL CHECK (mode IN ('pre','preg','kids','meno')),
  locale        TEXT NOT NULL CHECK (locale IN ('en','pt')),
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
CREATE INDEX IF NOT EXISTS waitlist_ip_hash_created_idx ON public.waitlist (ip_hash, created_at DESC);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
-- No policies: service role only.

CREATE OR REPLACE FUNCTION public.waitlist_join(
  p_email text, p_name text, p_mode text, p_locale text, p_notify_launch boolean,
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
    (email, name, mode, locale, notify_launch, utm_source, utm_medium, utm_campaign, referrer, ip_hash)
  VALUES
    (lower(trim(p_email)), nullif(trim(p_name), ''), p_mode, p_locale, coalesce(p_notify_launch, false),
     p_utm_source, p_utm_medium, p_utm_campaign, p_referrer, p_ip_hash)
  ON CONFLICT (email) DO UPDATE SET
    name          = coalesce(excluded.name, waitlist.name),
    mode          = excluded.mode,
    locale        = excluded.locale,
    notify_launch = excluded.notify_launch,
    updated_at    = now();

  RETURN 'ok';
END
$$;

REVOKE ALL ON FUNCTION public.waitlist_join(text,text,text,text,boolean,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waitlist_join(text,text,text,text,boolean,text,text,text,text,text) TO service_role;

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 3: Add the Drizzle table**

Append to `db/schema/center.ts` right after the `betaTesters` table (all needed column helpers are already imported on line 1):

```ts
export const WAITLIST_MODES = ["pre", "preg", "kids", "meno"] as const
export type WaitlistMode = (typeof WAITLIST_MODES)[number]
export const WAITLIST_LOCALES = ["en", "pt"] as const
export type WaitlistLocale = (typeof WAITLIST_LOCALES)[number]

/** Marketing-site waitlist. Written by the site via waitlist_join(); see migrations/0018_waitlist.sql. */
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  mode: text("mode").notNull(),
  locale: text("locale").notNull(),
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

Check that `db/schema/index.ts` re-exports `center.ts` with `export *` (it does for `betaTesters`). If it lists names explicitly, add `waitlist`, `WAITLIST_MODES`, `WAITLIST_LOCALES`.

- [ ] **Step 4: Apply the migration**

```bash
set -a; source .env.local; set +a
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/0018_waitlist.sql
```

Expected: `CREATE TABLE`, `CREATE INDEX` ×2, `ALTER TABLE`, `CREATE FUNCTION`, `REVOKE`, `GRANT`, `NOTIFY`, with no errors. Run it a second time: it must succeed again (idempotent; `CREATE TABLE IF NOT EXISTS` skips with a NOTICE).

If `psql` is not installed, run the file with postgres-js: `node -e "const s=require('postgres')(process.env.DATABASE_URL,{prepare:false});s.file('migrations/0018_waitlist.sql').then(()=>s.end())"`.

- [ ] **Step 5: Write the verification script**

`scripts/verify-waitlist.mjs`:

```js
// Throwaway live check for migrations/0018_waitlist.sql. Uses a unique test
// email and deletes everything it creates. Run: node scripts/verify-waitlist.mjs
import postgres from "postgres"

const sql = postgres(process.env.DATABASE_URL, { prepare: false })
const tag = `verify-${Date.now()}`
const email = `${tag}@example.com`
const ip = `iphash-${tag}`
const assert = (cond, msg) => { if (!cond) { console.error("FAIL:", msg); process.exitCode = 1 } else console.log("ok:", msg) }

try {
  const join = (e, name, mode, ipHash = ip) =>
    sql`select public.waitlist_join(${e}, ${name}, ${mode}, 'pt', true, 'ig', 'social', 'launch', null, ${ipHash}) as r`

  const [a] = await join(`  ${email.toUpperCase()} `, "Ana", "preg")
  assert(a.r === "ok", "first join returns ok")
  const [row1] = await sql`select * from public.waitlist where email = ${email}`
  assert(row1 && row1.email === email, "email stored lowercased + trimmed")

  await new Promise((r) => setTimeout(r, 1100))
  const [b] = await join(email, null, "kids")
  assert(b.r === "ok", "second join (same email) returns ok")
  const rows = await sql`select * from public.waitlist where email = ${email}`
  assert(rows.length === 1, "still exactly one row")
  assert(rows[0].created_at.getTime() === row1.created_at.getTime(), "created_at unchanged")
  assert(rows[0].mode === "kids", "mode updated")
  assert(rows[0].name === "Ana", "name kept when new name is null")
  assert(rows[0].utm_source === "ig", "first-touch utm kept")

  for (let i = 0; i < 4; i++) await join(`${tag}-${i}@example.com`, null, "pre")
  const [c] = await join(`${tag}-x@example.com`, null, "pre")
  assert(c.r === "rate_limited", "6th distinct signup from same ip_hash within 1h is rate_limited")
  const [d] = await join(`${tag}-y@example.com`, null, "pre", null)
  assert(d.r === "ok", "null ip_hash is not rate limited")

  const [{ has }] = await sql`select has_function_privilege('anon', 'public.waitlist_join(text,text,text,text,boolean,text,text,text,text,text)', 'execute') as has`
  assert(has === false, "anon cannot execute waitlist_join")
} finally {
  await sql`delete from public.waitlist where email like ${tag + "%"}`
  await sql.end()
}
```

- [ ] **Step 6: Run it**

Run: `set -a; source .env.local; set +a; node scripts/verify-waitlist.mjs`
Expected: every line starts with `ok:`; exit code 0.

- [ ] **Step 7: Typecheck and commit**

```bash
pnpm typecheck
git add migrations/0018_waitlist.sql db/schema/center.ts scripts/verify-waitlist.mjs
git commit -m "feat(waitlist): waitlist table, waitlist_join() and Drizzle schema"
```

---

### Task 2: Pure waitlist helpers (filters, WHERE builder, CSV)

**Files:**
- Create: `CC/lib/waitlist.ts`
- Test: `CC/lib/__tests__/waitlist.test.ts`

**Interfaces:**
- Consumes: `WAITLIST_MODES`, `WAITLIST_LOCALES` from `@/db/schema`.
- Produces:
  - `waitlistFilterSchema` (zod 4) → `WaitlistFilter = { mode?: WaitlistMode; locale?: WaitlistLocale; from?: string; to?: string; invited: "all" | "invited" | "pending"; q?: string }`
  - `buildWaitlistWhere(f: WaitlistFilter): SQL` — a Drizzle `sql` fragment beginning with `where`, referencing table alias `w`.
  - `WaitlistRowOut = { id: string; email: string; name: string | null; mode: string; locale: string; notifyLaunch: boolean; utmSource: string | null; createdAt: string; invitedAt: string | null; signedUp: boolean }`
  - `toCsv(rows: WaitlistRowOut[]): string`

- [ ] **Step 1: Write the failing tests**

`lib/__tests__/waitlist.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core"
import { waitlistFilterSchema, buildWaitlistWhere, toCsv, type WaitlistRowOut } from "../waitlist"

const dialect = new PgDialect()
const render = (f: unknown) => dialect.sqlToQuery(buildWaitlistWhere(waitlistFilterSchema.parse(f)))

describe("waitlistFilterSchema", () => {
  it("defaults invited to all", () => {
    expect(waitlistFilterSchema.parse({}).invited).toBe("all")
  })
  it("rejects an unknown mode", () => {
    expect(() => waitlistFilterSchema.parse({ mode: "care" })).toThrow()
  })
  it("rejects a malformed date", () => {
    expect(() => waitlistFilterSchema.parse({ from: "30/10/2026" })).toThrow()
  })
})

describe("buildWaitlistWhere", () => {
  it("is a no-op filter when empty", () => {
    expect(render({}).sql).toBe("where true")
  })
  it("combines mode, locale, dates, invited and search with parameters", () => {
    const q = render({ mode: "meno", locale: "pt", from: "2026-10-01", to: "2026-10-30", invited: "pending", q: "ana" })
    expect(q.sql).toContain("w.mode = $1")
    expect(q.sql).toContain("w.locale = $2")
    expect(q.sql).toContain("w.created_at >= $3::date")
    expect(q.sql).toContain("w.created_at < ($4::date + 1)")
    expect(q.sql).toContain("w.invited_at is null")
    expect(q.sql).toContain("(w.email ilike $5 or w.name ilike $6)")
    expect(q.params).toEqual(["meno", "pt", "2026-10-01", "2026-10-30", "%ana%", "%ana%"])
  })
  it("escapes LIKE wildcards in search", () => {
    expect(render({ q: "50%_off" }).params).toEqual(["%50\\%\\_off%", "%50\\%\\_off%"])
  })
})

const row = (over: Partial<WaitlistRowOut> = {}): WaitlistRowOut => ({
  id: "1", email: "ana@x.com", name: "Ana", mode: "preg", locale: "pt", notifyLaunch: true,
  utmSource: null, createdAt: "2026-10-30T12:00:00.000Z", invitedAt: null, signedUp: false, ...over,
})

describe("toCsv", () => {
  it("writes a header and one line per row", () => {
    const out = toCsv([row()])
    expect(out.split("\r\n")[0]).toBe("email,name,mode,locale,notify_launch,utm_source,created_at,invited_at,signed_up")
    expect(out.split("\r\n")[1]).toBe("ana@x.com,Ana,preg,pt,true,,2026-10-30T12:00:00.000Z,,false")
  })
  it("quotes commas, quotes and newlines", () => {
    expect(toCsv([row({ name: 'Ana, "Nana"\nSilva' })]).split("\r\n").slice(1).join("\r\n"))
      .toContain('"Ana, ""Nana""\nSilva"')
  })
  it("neutralises spreadsheet formulas", () => {
    for (const bad of ["=HYPERLINK(\"x\")", "+1", "-1", "@SUM(A1)"]) {
      expect(toCsv([row({ name: bad })])).toContain(`'${bad.startsWith("=") ? bad.replace(/"/g, '""') : bad}`)
    }
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run lib/__tests__/waitlist.test.ts`
Expected: FAIL — `Cannot find module '../waitlist'`.

- [ ] **Step 3: Implement**

`lib/waitlist.ts`:

```ts
import { z } from "zod"
import { sql, type SQL } from "drizzle-orm"
import { WAITLIST_MODES, WAITLIST_LOCALES } from "@/db/schema"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")

export const waitlistFilterSchema = z.object({
  mode: z.enum(WAITLIST_MODES).optional(),
  locale: z.enum(WAITLIST_LOCALES).optional(),
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
  notifyLaunch: boolean
  utmSource: string | null
  createdAt: string
  invitedAt: string | null
  signedUp: boolean
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/** WHERE clause over `public.waitlist w`. Always returns a fragment starting with `where`. */
export function buildWaitlistWhere(f: WaitlistFilter): SQL {
  const parts: SQL[] = []
  if (f.mode) parts.push(sql`w.mode = ${f.mode}`)
  if (f.locale) parts.push(sql`w.locale = ${f.locale}`)
  if (f.from) parts.push(sql`w.created_at >= ${f.from}::date`)
  if (f.to) parts.push(sql`w.created_at < (${f.to}::date + 1)`)
  if (f.invited === "invited") parts.push(sql`w.invited_at is not null`)
  if (f.invited === "pending") parts.push(sql`w.invited_at is null`)
  if (f.q) {
    const like = `%${escapeLike(f.q)}%`
    parts.push(sql`(w.email ilike ${like} or w.name ilike ${like})`)
  }
  if (parts.length === 0) return sql`where true`
  return sql`where ${sql.join(parts, sql` and `)}`
}

const CSV_COLUMNS: { header: string; get: (r: WaitlistRowOut) => string | boolean | null }[] = [
  { header: "email", get: (r) => r.email },
  { header: "name", get: (r) => r.name },
  { header: "mode", get: (r) => r.mode },
  { header: "locale", get: (r) => r.locale },
  { header: "notify_launch", get: (r) => r.notifyLaunch },
  { header: "utm_source", get: (r) => r.utmSource },
  { header: "created_at", get: (r) => r.createdAt },
  { header: "invited_at", get: (r) => r.invitedAt },
  { header: "signed_up", get: (r) => r.signedUp },
]

function csvCell(v: string | boolean | null): string {
  if (v === null) return ""
  let s = String(v)
  // Spreadsheet formula injection guard (OWASP): prefix with a quote.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(rows: WaitlistRowOut[]): string {
  const lines = [CSV_COLUMNS.map((c) => c.header).join(",")]
  for (const r of rows) lines.push(CSV_COLUMNS.map((c) => csvCell(c.get(r))).join(","))
  return lines.join("\r\n")
}
```

Note on the formula test: for `=HYPERLINK("x")` the cell becomes `'=HYPERLINK("x")`, which contains `"` so it is quoted and inner quotes doubled → `"'=HYPERLINK(""x"")"`. The test checks for the substring `'=HYPERLINK(""x"")`.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run lib/__tests__/waitlist.test.ts`
Expected: PASS (all). If the `buildWaitlistWhere` SQL string differs only in whitespace around `and`, adjust the implementation (not the test) so the fragments match exactly.

- [ ] **Step 5: Commit**

```bash
git add lib/waitlist.ts lib/__tests__/waitlist.test.ts
git commit -m "feat(waitlist): filter schema, WHERE builder and formula-safe CSV"
```

---

### Task 3: Waitlist tRPC router

**Files:**
- Create: `CC/server/routers/waitlist.ts`
- Modify: `CC/server/routers/index.ts` (import + register `waitlist: waitlistRouter`)
- Test: `CC/server/__tests__/waitlist-router.test.ts`
- Modify: `CC/scripts/verify-waitlist.mjs` (add promote check)

**Interfaces:**
- Consumes: `waitlistFilterSchema`, `buildWaitlistWhere`, `toCsv`, `WaitlistRowOut` (Task 2); `waitlist`, `betaTesters` (Task 1); `protectedProcedure`, `piiProcedure`, `adminProcedure`, `router` from `../trpc`; `writeAudit` from `@/lib/audit`.
- Produces (client calls in Task 4):
  - `trpc.waitlist.stats.useQuery()` → `{ total: number; last7: number; daily: { day: string; count: number }[]; byMode: { mode: string; count: number }[]; byLocale: { locale: string; count: number }[] }`
  - `trpc.waitlist.list.useQuery({ filter: WaitlistFilter; page: number })` → `{ rows: WaitlistRowOut[]; total: number; pageSize: 50 }`
  - `trpc.waitlist.exportCsv.useMutation()` input `{ filter: WaitlistFilter }` → `{ csv: string; count: number }`
  - `trpc.waitlist.promoteToBeta.useMutation()` input `{ ids: string[] }` (1–200 uuids) → `{ promoted: number; alreadyBeta: number }`

- [ ] **Step 1: Write the failing gate test**

`server/__tests__/waitlist-router.test.ts`:

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

describe("waitlist router gates", () => {
  it("viewer can read stats", async () => {
    await expect(waitlistRouter.createCaller(viewer).stats()).resolves.toBeDefined()
  })
  it("viewer is FORBIDDEN on list, export and promote", async () => {
    const c = waitlistRouter.createCaller(viewer)
    await expect(c.list({ filter: {}, page: 0 })).rejects.toMatchObject({ code: "FORBIDDEN" } as Partial<TRPCError>)
    await expect(c.exportCsv({ filter: {} })).rejects.toMatchObject({ code: "FORBIDDEN" } as Partial<TRPCError>)
    await expect(c.promoteToBeta({ ids: ["00000000-0000-0000-0000-000000000000"] })).rejects.toMatchObject({ code: "FORBIDDEN" } as Partial<TRPCError>)
  })
  it("admin list writes an audit entry", async () => {
    const { writeAudit } = await import("@/lib/audit")
    await waitlistRouter.createCaller(admin).list({ filter: {}, page: 0 })
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "waitlist.list", actorEmail: "a@grandma.app" }))
  })
  it("promote rejects an empty id list", async () => {
    await expect(waitlistRouter.createCaller(admin).promoteToBeta({ ids: [] })).rejects.toMatchObject({ code: "BAD_REQUEST" } as Partial<TRPCError>)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run server/__tests__/waitlist-router.test.ts`
Expected: FAIL — cannot find `../routers/waitlist`.

- [ ] **Step 3: Implement the router**

`server/routers/waitlist.ts`:

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
  id: string; email: string; name: string | null; mode: string; locale: string; notify_launch: boolean
  utm_source: string | null; created_at: string | Date; invited_at: string | Date | null; signed_up: boolean
  [k: string]: unknown
}

const iso = (v: string | Date | null): string | null => (v === null ? null : new Date(v).toISOString())

function toOut(r: RawRow): WaitlistRowOut {
  return {
    id: r.id, email: r.email, name: r.name, mode: r.mode, locale: r.locale, notifyLaunch: r.notify_launch,
    utmSource: r.utm_source, createdAt: iso(r.created_at)!, invitedAt: iso(r.invited_at), signedUp: r.signed_up,
  }
}

function selectRows(where: ReturnType<typeof buildWaitlistWhere>, limit: number, offset: number) {
  return db.execute<RawRow>(sql`
    select w.id, w.email, w.name, w.mode, w.locale, w.notify_launch, w.utm_source, w.created_at, w.invited_at,
      exists (select 1 from auth.users au where lower(au.email) = w.email) as signed_up
    from public.waitlist w
    ${where}
    order by w.created_at asc
    limit ${limit} offset ${offset}
  `)
}

/**
 * Waitlist — signups from the marketing site. Stats are aggregate (viewer+);
 * anything with an email is PII (admin) and audited.
 */
export const waitlistRouter = router({
  stats: protectedProcedure.query(async () => {
    const [totals, daily, byMode, byLocale] = await Promise.all([
      db.execute<{ total: number; last7: number; [k: string]: unknown }>(sql`
        select count(*)::int as total,
          count(*) filter (where created_at > now() - interval '7 days')::int as last7
        from public.waitlist`),
      db.execute<{ day: string; count: number; [k: string]: unknown }>(sql`
        select to_char(d::date, 'YYYY-MM-DD') as day, count(w.id)::int as count
        from generate_series(current_date - 89, current_date, interval '1 day') d
        left join public.waitlist w on w.created_at::date = d::date
        group by d order by d`),
      db.execute<{ mode: string; count: number; [k: string]: unknown }>(sql`
        select mode, count(*)::int as count from public.waitlist group by mode order by count desc`),
      db.execute<{ locale: string; count: number; [k: string]: unknown }>(sql`
        select locale, count(*)::int as count from public.waitlist group by locale order by count desc`),
    ])
    const t = Array.from(totals)[0]
    return {
      total: t?.total ?? 0,
      last7: t?.last7 ?? 0,
      daily: Array.from(daily).map((r) => ({ day: r.day, count: r.count })),
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

  exportCsv: piiProcedure
    .input(z.object({ filter: waitlistFilterSchema }))
    .mutation(async ({ ctx, input }) => {
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
          .values(rows.map((r) => ({ email: r.email, name: r.name, platform: "both", note: "from waitlist", invitedBy: actor })))
          .onConflictDoNothing({ target: betaTesters.email })
          .returning({ id: betaTesters.id })
        await tx
          .update(waitlist)
          .set({ invitedAt: new Date(), invitedBy: actor })
          .where(and(inArray(waitlist.id, input.ids), isNull(waitlist.invitedAt)))
        return { promoted: inserted.length, alreadyBeta: rows.length - inserted.length }
      })
      await writeAudit({ actorEmail: actor, action: "waitlist.promote", meta: { ids: input.ids, ...result } })
      return result
    }),
})
```

Register it in `server/routers/index.ts`: add `import { waitlistRouter } from "./waitlist"` and `waitlist: waitlistRouter,` after `graph: graphRouter,`.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run server/__tests__/waitlist-router.test.ts`
Expected: PASS. (`stats` with the mocked `db.execute` returning `[]` yields zeros.)

- [ ] **Step 5: Add a live promote check**

In `scripts/verify-waitlist.mjs`, before the `finally`, add:

```js
  // promote path: same SQL shape the router uses, run directly
  const [w] = await sql`select id, email, name from public.waitlist where email = ${email}`
  await sql`insert into public.beta_testers (email, name, platform, note, invited_by)
            values (${w.email}, ${w.name}, 'both', 'from waitlist', 'verify') on conflict (email) do nothing`
  await sql`insert into public.beta_testers (email, name, platform, note, invited_by)
            values (${w.email}, ${w.name}, 'both', 'from waitlist', 'verify') on conflict (email) do nothing`
  const bt = await sql`select * from public.beta_testers where email = ${email}`
  assert(bt.length === 1, "promoting twice leaves one beta_testers row")
```

and in the `finally` block, before `sql.end()`, add `await sql\`delete from public.beta_testers where email like ${tag + "%"}\``.

Run: `node scripts/verify-waitlist.mjs` → all `ok:`.

- [ ] **Step 6: Full checks and commit**

```bash
pnpm typecheck && pnpm test
git add server/routers/waitlist.ts server/routers/index.ts server/__tests__/waitlist-router.test.ts scripts/verify-waitlist.mjs
git commit -m "feat(waitlist): tRPC router — stats, audited list/export, promote to beta"
```

---

### Task 4: Waitlist pillar page and sidebar

**Files:**
- Create: `CC/app/(app)/waitlist/page.tsx`
- Create: `CC/app/(app)/waitlist/WaitlistStats.tsx`
- Create: `CC/app/(app)/waitlist/WaitlistTable.tsx`
- Modify: `CC/components/CommandCenterSidebar.tsx` (Audience section + `READY`)

**Interfaces:**
- Consumes: the four procedures from Task 3; `createContext` from `@/server/context`; `trpc` from `@/lib/trpc`.

- [ ] **Step 1: Page (server component, role-aware)**

`app/(app)/waitlist/page.tsx`:

```tsx
import { createContext } from "@/server/context"
import { WaitlistStats } from "./WaitlistStats"
import { WaitlistTable } from "./WaitlistTable"

/**
 * Waitlist — signups from the grandma.app marketing site. Viewers see
 * aggregates; admins also see the list (PII, audited), export and promote.
 */
export default async function WaitlistPage() {
  const ctx = await createContext()
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">No access.</main>

  return (
    <main className="mx-auto max-w-6xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Audience</p>
      <h1 className="display text-3xl font-bold tracking-tight text-fg-primary">Waitlist</h1>
      <p className="mt-2 max-w-2xl text-sm text-fg-tertiary">
        People who joined from grandma.app. Order is first come, first served. Promote people to the beta roster
        when it&apos;s their turn.
      </p>
      <div className="mt-8 space-y-8">
        <WaitlistStats />
        {ctx.role === "admin" ? (
          <WaitlistTable />
        ) : (
          <p className="text-sm text-fg-tertiary">The list of emails is visible to admins only.</p>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Stats component**

`app/(app)/waitlist/WaitlistStats.tsx`:

```tsx
"use client"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { trpc } from "@/lib/trpc"

const MODE_LABEL: Record<string, string> = { pre: "Cycle", preg: "Pregnancy", kids: "Kids", meno: "Menopause" }
const LOCALE_LABEL: Record<string, string> = { en: "English", pt: "Português" }

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{label}</p>
      <p className="display mt-1 text-3xl font-bold tabular-nums text-fg-primary">{value}</p>
    </div>
  )
}

export function WaitlistStats() {
  const { data, isLoading, error } = trpc.waitlist.stats.useQuery()
  if (isLoading) return <p className="text-sm text-fg-tertiary">Loading…</p>
  if (error || !data) return <p className="text-sm text-accent-red">Couldn&apos;t load stats: {error?.message}</p>

  const split = (rows: { count: number }[], key: "mode" | "locale", labels: Record<string, string>) =>
    rows.map((r) => `${labels[(r as Record<string, unknown>)[key] as string] ?? (r as Record<string, unknown>)[key]} ${r.count}`).join(" · ") || "—"

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Total" value={data.total.toLocaleString()} />
        <Tile label="Last 7 days" value={data.last7.toLocaleString()} />
        <Tile label="By mode" value={split(data.byMode, "mode", MODE_LABEL)} />
        <Tile label="By language" value={split(data.byLocale, "locale", LOCALE_LABEL)} />
      </div>
      <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Signups per day · 90 days</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.daily} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "rgba(20,33,61,0.05)" }} />
              <Bar dataKey="count" fill="var(--accent-blue, #14213D)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
```

Before committing, open `app/globals.css` in CC and replace `var(--accent-blue, #14213D)` and `text-accent-red` with the actual accent token / utility names that file defines (the skin's CLAUDE.md lists `text-accent-*`; pick the existing blue and red names). Do not hardcode a hex if a token exists.

- [ ] **Step 3: Table component**

`app/(app)/waitlist/WaitlistTable.tsx`:

```tsx
"use client"
import { useState } from "react"
import { trpc } from "@/lib/trpc"
import type { WaitlistFilter } from "@/lib/waitlist"

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
      a.download = `waitlist-${new Date().toISOString().slice(0, 10)}.csv`
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

  const update = (patch: Partial<WaitlistFilter>) => {
    setFilter((f) => ({ ...f, ...patch }))
    setPage(0)
    setSelected(new Set())
  }
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const select = "rounded-lg border border-border-default bg-card px-3 py-2 text-sm text-fg-primary"

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${select} min-w-[220px]`}
          placeholder="Search email or name"
          value={filter.q ?? ""}
          onChange={(e) => update({ q: e.target.value || undefined })}
        />
        <select className={select} value={filter.mode ?? ""} onChange={(e) => update({ mode: (e.target.value || undefined) as WaitlistFilter["mode"] })}>
          {MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className={select} value={filter.locale ?? ""} onChange={(e) => update({ locale: (e.target.value || undefined) as WaitlistFilter["locale"] })}>
          {LOCALES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className={select} value={filter.invited} onChange={(e) => update({ invited: e.target.value as WaitlistFilter["invited"] })}>
          {INVITED.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input type="date" className={select} value={filter.from ?? ""} onChange={(e) => update({ from: e.target.value || undefined })} aria-label="From" />
        <input type="date" className={select} value={filter.to ?? ""} onChange={(e) => update({ to: e.target.value || undefined })} aria-label="To" />
        <div className="ml-auto flex gap-2">
          <button className={select} disabled={exportCsv.isPending} onClick={() => exportCsv.mutate({ filter })}>
            {exportCsv.isPending ? "Exporting…" : "Export CSV"}
          </button>
          <button
            className={`${select} font-semibold`}
            disabled={selected.size === 0 || promote.isPending}
            onClick={() => promote.mutate({ ids: [...selected] })}
          >
            {promote.isPending ? "Promoting…" : `Promote to beta (${selected.size})`}
          </button>
        </div>
      </div>

      {notice && <p className="text-sm text-fg-secondary" role="status">{notice}</p>}
      {list.error && <p className="text-sm text-fg-secondary">Couldn&apos;t load the list: {list.error.message}</p>}

      <div className="overflow-x-auto rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
            <tr className="border-b border-border-default">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select page"
                  checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                  onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
                />
              </th>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Lang</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Invited</th>
              <th className="px-4 py-3">In app</th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading && (
              <tr><td colSpan={9} className="px-4 py-6 text-fg-tertiary">Loading…</td></tr>
            )}
            {!list.isLoading && rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-6 text-fg-tertiary">No one matches these filters.</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-border-default last:border-0">
                <td className="px-4 py-3">
                  <input type="checkbox" aria-label={`Select ${r.email}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                </td>
                <td className="px-4 py-3 tabular-nums text-fg-muted">{page * pageSize + i + 1}</td>
                <td className="px-4 py-3 text-fg-primary">{r.email}</td>
                <td className="px-4 py-3 text-fg-secondary">{r.name ?? "—"}</td>
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
          <button className={select} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="tabular-nums">{page + 1} / {pages}</span>
          <button className={select} disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
    </section>
  )
}
```

The `#` column is the queue position within the current filter (rows are ordered by `created_at asc`).

- [ ] **Step 4: Sidebar**

In `components/CommandCenterSidebar.tsx`:
- add `ListPlus` to the `lucide-react` import;
- in the `Audience` section items, after `Revenue`, add `{ href: "/waitlist", label: "Waitlist", icon: ListPlus },`;
- add `"/waitlist"` to the `READY` set.

- [ ] **Step 5: Verify in the browser**

Run: `pnpm dev` (port 3002). Insert one test row with `node -e` or psql (`select public.waitlist_join('qa-cc@example.com','QA','meno','pt',false,null,null,null,null,null)`), then sign in as an admin and open `/waitlist`. Check: tiles show totals, chart renders, the row appears, Export downloads a CSV, selecting the row and clicking Promote shows "Promoted 1 to beta" and `/beta` lists the email. Sign in as a viewer (or temporarily set your role to viewer in Clerk): only the tiles and chart show. Delete the test rows afterwards (`delete from waitlist where email='qa-cc@example.com'; delete from beta_testers where email='qa-cc@example.com';`).

- [ ] **Step 6: Checks and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add "app/(app)/waitlist" components/CommandCenterSidebar.tsx
git commit -m "feat(waitlist): Waitlist pillar — stats, audited table, CSV export, promote to beta"
```

---

## Part B — marketing site (v0-grandma-app)

All commands in Part B run from `/Users/igorcarvalhorodrigues/dev/v0-grandma-app` on branch `feat/waitlist-diffuse-i18n`.

### Task 5: i18n infrastructure (routing, layout, metadata, switcher)

**Files:**
- Modify: `package.json` (deps + scripts)
- Create: `vitest.config.ts`
- Create: `i18n/routing.ts`, `i18n/navigation.ts`, `i18n/request.ts`
- Create: `proxy.ts`
- Modify: `next.config.mjs`
- Move: `app/layout.tsx` → `app/[locale]/layout.tsx` (rewritten), `app/page.tsx` → `app/[locale]/page.tsx`, `app/pricing/page.tsx` → `app/[locale]/pricing/page.tsx`, `app/privacy/page.tsx` → `app/[locale]/privacy/page.tsx`, `app/terms/page.tsx` → `app/[locale]/terms/page.tsx`
- Create: `messages/en.json`, `messages/pt.json` (namespaces `meta`, `nav`, `locale`)
- Create: `components/locale-switcher.tsx`
- Modify: `components/navigation.tsx` (links via `@/i18n/navigation`, labels via `t`, switcher)
- Test: `messages/messages.test.ts`

**Interfaces:**
- Produces: `routing` (`locales: ['en','pt']`, `defaultLocale: 'en'`); `Link`, `usePathname`, `useRouter`, `redirect` from `@/i18n/navigation`; `type Locale = 'en' | 'pt'`; `htmlLang(locale)` → `'en' | 'pt-BR'`; `pnpm test`, `pnpm typecheck`, `pnpm i18n:check` scripts. Every later site task adds keys to BOTH message files.

- [ ] **Step 1: Install dependencies and add scripts**

```bash
pnpm add next-intl @supabase/supabase-js server-only
pnpm add -D vitest
```

In `package.json` `scripts` add:

```json
"typecheck": "tsc --noEmit",
"test": "vitest run",
"i18n:check": "vitest run messages"
```

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

Create `test/server-only-stub.ts` with `export {}`.

- [ ] **Step 2: Write the failing message-parity test**

`messages/messages.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import en from './en.json'
import pt from './pt.json'

function keys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return [prefix]
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
}

describe('messages', () => {
  it('en and pt have exactly the same keys', () => {
    const e = new Set(keys(en))
    const p = new Set(keys(pt))
    expect([...e].filter((k) => !p.has(k)), 'missing in pt').toEqual([])
    expect([...p].filter((k) => !e.has(k)), 'missing in en').toEqual([])
  })
  it('no empty strings', () => {
    const empty = (o: unknown, path = ''): string[] =>
      typeof o === 'string' ? (o.trim() ? [] : [path])
      : Array.isArray(o) ? o.flatMap((v, i) => empty(v, `${path}[${i}]`))
      : Object.entries(o as object).flatMap(([k, v]) => empty(v, path ? `${path}.${k}` : k))
    expect([...empty(en), ...empty(pt)]).toEqual([])
  })
  it('arrays have the same length in both locales', () => {
    const arrays = (o: unknown, path = ''): [string, number][] =>
      Array.isArray(o) ? [[path, o.length]]
      : typeof o === 'object' && o !== null ? Object.entries(o).flatMap(([k, v]) => arrays(v, path ? `${path}.${k}` : k))
      : []
    expect(arrays(pt)).toEqual(arrays(en))
  })
})
```

Run: `pnpm i18n:check` → FAIL (`./en.json` not found).

- [ ] **Step 3: Routing files and proxy**

`i18n/routing.ts`:

```ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'pt'],
  defaultLocale: 'en',
  localePrefix: 'always',
})

export type Locale = (typeof routing.locales)[number]

/** BCP-47 tag for <html lang> and hreflang. */
export function htmlLang(locale: Locale): 'en' | 'pt-BR' {
  return locale === 'pt' ? 'pt-BR' : 'en'
}
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

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
}
```

`next.config.mjs`:

```js
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default withNextIntl(nextConfig)
```

- [ ] **Step 4: Move pages under `[locale]`**

```bash
mkdir -p "app/[locale]/pricing" "app/[locale]/privacy" "app/[locale]/terms"
git mv app/page.tsx "app/[locale]/page.tsx"
git mv app/pricing/page.tsx "app/[locale]/pricing/page.tsx"
git mv app/privacy/page.tsx "app/[locale]/privacy/page.tsx"
git mv app/terms/page.tsx "app/[locale]/terms/page.tsx"
git mv app/layout.tsx "app/[locale]/layout.tsx"
```

`app/globals.css` stays where it is.

- [ ] **Step 5: Rewrite the locale layout**

`app/[locale]/layout.tsx` (fonts unchanged in this task; Task 9 replaces them):

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Fraunces, DM_Sans, Instrument_Serif } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing, htmlLang, type Locale } from '@/i18n/routing'
import '../globals.css'

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap', weight: ['400', '500', '600', '700'] })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap', weight: ['400', '500', '600', '700'] })
const instrumentSerif = Instrument_Serif({ subsets: ['latin'], variable: '--font-instrument-serif', display: 'swap', weight: ['400'], style: ['italic'] })

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
    alternates: {
      canonical: `/${locale}`,
      languages: { en: '/en', 'pt-BR': '/pt', 'x-default': '/en' },
    },
    openGraph: {
      title: t('ogTitle'),
      description: t('ogDescription'),
      type: 'website',
      locale: locale === 'pt' ? 'pt_BR' : 'en_US',
    },
    twitter: { card: 'summary_large_image' },
    icons: { icon: '/favicon.svg' },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  return (
    <html lang={htmlLang(locale as Locale)} className="bg-[#F3ECD9]">
      <body
        className={`${fraunces.variable} ${dmSans.variable} ${instrumentSerif.variable} antialiased`}
        style={{ fontFamily: 'var(--font-dm-sans), var(--font-body)' }}
      >
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
```

(The Open Graph image is handled in Task 16.)

In each of the four moved page files, make the default export receive params and call `setRequestLocale` first, so pages render statically:

```tsx
import { setRequestLocale } from 'next-intl/server'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  // ...existing JSX unchanged
}
```

If a moved page file starts with `'use client'`, move its JSX body into a new client component in `components/` (e.g. `components/pricing-content.tsx`) and keep the page file a server component that renders it.

- [ ] **Step 6: Messages (first namespaces)**

`messages/en.json`:

```json
{
  "meta": {
    "title": "Grandma · A calmer companion for your cycle, pregnancy, kids and menopause",
    "description": "Grandma is a calm companion app for every chapter: cycle tracking, pregnancy, raising kids 0–5 and menopause. Currently in early access. Join the waitlist.",
    "ogTitle": "Grandma · Wisdom for every chapter",
    "ogDescription": "Cycle, pregnancy, kids and menopause. The calm companion who remembers everything."
  },
  "nav": {
    "features": "Features",
    "modes": "The four modes",
    "grandma": "Meet Grandma",
    "pricing": "Pricing",
    "join": "Join the waitlist",
    "openMenu": "Open menu",
    "closeMenu": "Close menu",
    "home": "grandma.app home"
  },
  "locale": {
    "label": "Language",
    "en": "EN",
    "pt": "PT"
  }
}
```

`messages/pt.json`:

```json
{
  "meta": {
    "title": "Grandma · Uma companhia tranquila para o seu ciclo, gravidez, filhos e menopausa",
    "description": "Grandma é um app de companhia tranquila para cada fase: ciclo, gravidez, filhos de 0 a 5 anos e menopausa. Em acesso antecipado. Entre na lista de espera.",
    "ogTitle": "Grandma · Sabedoria para cada fase",
    "ogDescription": "Ciclo, gravidez, filhos e menopausa. A companhia tranquila que lembra de tudo."
  },
  "nav": {
    "features": "Recursos",
    "modes": "Os quatro modos",
    "grandma": "Conheça a Vovó",
    "pricing": "Preços",
    "join": "Entrar na lista",
    "openMenu": "Abrir menu",
    "closeMenu": "Fechar menu",
    "home": "Início do grandma.app"
  },
  "locale": {
    "label": "Idioma",
    "en": "EN",
    "pt": "PT"
  }
}
```

Run: `pnpm i18n:check` → PASS.

- [ ] **Step 7: Locale switcher**

`components/locale-switcher.tsx`:

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

  const change = (next: Locale) => {
    if (next === locale) return
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
    router.replace(hash ? { pathname, hash } : pathname, { locale: next, scroll: false })
  }

  return (
    <div role="group" aria-label={t('label')} className={`flex items-center gap-1 ${className}`}>
      {routing.locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden="true">·</span>}
          <button
            type="button"
            lang={l === 'pt' ? 'pt-BR' : 'en'}
            aria-pressed={l === locale}
            onClick={() => change(l)}
            className={l === locale ? 'font-bold underline underline-offset-4' : 'opacity-60 hover:opacity-100'}
          >
            {t(l)}
          </button>
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 8: Navigation uses i18n**

In `components/navigation.tsx`:
- replace `import Link from 'next/link'` with `import { Link } from '@/i18n/navigation'` and add `import { useTranslations } from 'next-intl'` and `import { LocaleSwitcher } from './locale-switcher'`;
- inside `Navigation`, add `const t = useTranslations('nav')`;
- replace `navLinks` with:

```ts
  const navLinks = [
    { href: '/#features', label: t('features') },
    { href: '/#stages', label: t('modes') },
    { href: '/#grandma', label: t('grandma') },
    { href: '/pricing', label: t('pricing') },
  ]
```

- replace every remaining literal user-facing string in the file (button labels, aria-labels such as "Open menu") with the matching `t(...)` key from Step 6;
- render `<LocaleSwitcher className="text-[13px] tracking-[0.12em]" />` in the desktop nav after the links, and inside the mobile menu.

(`/#features` makes the anchors work from `/pricing` too; next-intl prefixes the locale.)

- [ ] **Step 9: Verify**

```bash
pnpm i18n:check
pnpm build
pnpm start &
sleep 4
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -H "Accept-Language: pt-BR,pt;q=0.9" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -H "Accept-Language: pt-PT" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -H "Accept-Language: de-DE" http://localhost:3000/
curl -s http://localhost:3000/pt | grep -o '<html lang="[^"]*"'
curl -s http://localhost:3000/pt | grep -o 'hrefLang="[^"]*"' | sort -u
kill %1
```

Expected: first two redirect to `/pt`, third to `/en`; `<html lang="pt-BR"`; hreflang values `en`, `pt-BR`, `x-default`. Open `/en` and `/pt` in a browser: the page looks the same as before, nav labels are translated, and clicking `PT · EN` switches language and keeps the scroll anchor.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(i18n): next-intl routing for /en and /pt, localized metadata, language switcher"
```

---

### Task 6: Extract home page copy to messages (EN + PT)

**Files:**
- Modify: `components/hero-section.tsx`, `components/animated-hero-card.tsx`, `components/three-stages-section.tsx`, `components/meet-grandma-section.tsx`, `components/pillars-section.tsx`, `components/connections-section.tsx`, `components/memories-section.tsx`, `components/testimonials-section.tsx`, `components/waitlist-faq-section.tsx`, `components/footer.tsx`
- Modify: `messages/en.json`, `messages/pt.json`

**Interfaces:**
- Consumes: `useTranslations` (client components) / `getTranslations` (server components) from next-intl; `Link` from `@/i18n/navigation`.
- Produces: namespaces `hero`, `stages`, `meet`, `pillars`, `connections`, `memories`, `trust`, `testimonials`, `waitlist`, `faq`, `final`, `footer`. Later tasks rename/extend keys inside these namespaces.

This is a mechanical extraction. Visuals do not change in this task, except the removal of the fabricated counter.

**Key rules:**
- One namespace per section component, named as above. Keys are camelCase and describe the role: `eyebrow`, `title`, `titleEm`, `titleEnd`, `subtitle`, `cta`, `note`, `items[]`.
- A headline with an italic word becomes three keys (`title`, `titleEm`, `titleEnd`) or one rich-text key using `t.rich('title', { em: (c) => <em ...>{c}</em> })` with `"title": "With you through every <em>chapter</em> of your journey."` — prefer `t.rich` for any sentence where word order may change in Portuguese.
- Lists of items (stage features, FAQ entries, pillar cards, testimonials) become arrays of objects in JSON, read with `t.raw('items') as Item[]`. Keep icons/stickers/colors in the component, matched by index or by an `id` field in the JSON.
- Inline links in copy (e.g. "pricing page") use `t.rich` with a `link` tag rendering `<Link href="/pricing">`.
- Mock app screens inside phone mockups (e.g. `PregnancyScreen` "Week 40 · Saturday", "Hi, Sarah") are translated too, under `stages.screens.*`. Names in mockups: "Sarah" in EN, "Ana" in PT.
- `aria-label`s are user-facing and must be translated.
- Do not translate: "grandma", "grandma.app", the email placeholder domain.

**Worked example — hero.** In `components/hero-section.tsx`:
- delete the `waitlistCount` state, the `useEffect` interval and the whole "Trusted by … families" `motion.span` block (the number was fabricated). Keep the "Built by parents, for parents." line.
- delete `handleSubmit`'s `console.log` body for now: `const handleSubmit = (e: React.FormEvent) => { e.preventDefault() }` (Task 11 wires it).
- use `const t = useTranslations('hero')` and these keys:

```json
"hero": {
  "eyebrow": "EARLY ACCESS · INVITES ROLLING OUT WEEKLY",
  "title": "With you through every <em>chapter</em> of your journey.",
  "subtitle": "From cycle tracking, through every week of pregnancy, into the beautiful chaos of raising little ones — Grandma is the calm, knowing companion who remembers everything, judges nothing, and answers at 3am.",
  "emailPlaceholder": "you@your-life.com",
  "cta": "Join the waitlist",
  "note": "We'll send one email when your invite is ready. No spam, on Grandma's honor.",
  "builtBy": "Built by parents, for parents."
}
```

```json
"hero": {
  "eyebrow": "ACESSO ANTECIPADO · CONVITES TODA SEMANA",
  "title": "Com você em cada <em>capítulo</em> da sua jornada.",
  "subtitle": "Do acompanhamento do ciclo, passando por cada semana da gravidez, até o caos lindo de criar os pequenos — a Vovó é a companhia calma e sábia que lembra de tudo, não julga nada e responde às 3 da manhã.",
  "emailPlaceholder": "voce@sua-vida.com",
  "cta": "Entrar na lista",
  "note": "Vamos mandar um único email quando o seu convite estiver pronto. Sem spam, palavra da Vovó.",
  "builtBy": "Feito por mães e pais, para mães e pais."
}
```

and render the title with `t.rich('title', { em: (chunks) => <em …existing em styles…>{chunks}</em> })`.

- [ ] **Step 1: Extract one component at a time**

For each file in the list, in this order: hero → animated-hero-card → three-stages → meet-grandma → pillars → connections → memories → testimonials → waitlist-faq → footer:
1. Add the namespace to `messages/en.json` with the current English text, verbatim.
2. Add the same keys to `messages/pt.json` with the pt-BR translation (follow the Global Constraints glossary; natural Brazilian Portuguese, warm and plain, not literal).
3. Replace literals in the component with `t(...)`, `t.rich(...)` or `t.raw(...)`.
4. Replace `next/link` imports with `Link` from `@/i18n/navigation`.
5. Run `pnpm i18n:check` (must pass) before moving to the next file.

The FAQ answer about AI ("Grandma is built on Claude…") is extracted as-is in EN and translated as-is in PT; Igor decides the final wording in review (spec §3.2).

- [ ] **Step 2: Check no literal copy remains**

```bash
grep -nE ">[^<>{}]*[A-Za-z]{3,}[^<>{}]*<" components/*-section.tsx components/footer.tsx components/navigation.tsx components/animated-hero-card.tsx
grep -nE "(placeholder|aria-label|title|alt)=\"[^\"]*[A-Za-z]{3,}" components/*-section.tsx components/footer.tsx components/navigation.tsx components/animated-hero-card.tsx
```

Expected: no matches, except the `grandma` wordmark. Fix any other hit by extracting it.

- [ ] **Step 3: Verify both locales**

Run: `pnpm i18n:check && pnpm typecheck && pnpm build`, then `pnpm dev` and read through `/en` and `/pt` top to bottom. Expected: `/en` is word-for-word the old site minus the counter; `/pt` has no English left except brand names; no `MISSING_MESSAGE` errors in the terminal or console.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(i18n): home page copy in EN and PT; remove fabricated signup counter"
```

---

### Task 7: Extract pricing, privacy and terms copy

**Files:**
- Modify: `app/[locale]/pricing/page.tsx` (or its client component from Task 5), `app/[locale]/privacy/page.tsx`, `app/[locale]/terms/page.tsx`
- Modify: `messages/en.json`, `messages/pt.json` (namespaces `pricing`, `privacy`, `terms`)

**Interfaces:**
- Consumes: `getTranslations({ locale, namespace })` in server pages; `Link` from `@/i18n/navigation`.
- Produces: per-page `generateMetadata` returning translated `title` and `description` (keys `pricing.metaTitle`, `pricing.metaDescription`, same for `privacy` and `terms`).

- [ ] **Step 1: Pricing**

Same rules as Task 6. Plan tiers become `pricing.plans[]` objects `{ id, name, price, period, description, features[] , cta }`. Prices stay in USD in both locales (`$9.99/month` → `US$ 9,99/mês` in PT text). Add:

```tsx
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'pricing' })
  return { title: t('metaTitle'), description: t('metaDescription'), alternates: { canonical: `/${locale}/pricing`, languages: { en: '/en/pricing', 'pt-BR': '/pt/pricing' } } }
}
```

- [ ] **Step 2: Privacy and terms**

Long legal text: one key per heading and one per paragraph, grouped as `privacy.sections[] = { heading, paragraphs[] }`, rendered in a loop. Add `privacy.lastUpdated` and `privacy.translationNote` (PT only meaning: "Esta é uma tradução. Em caso de divergência, vale a versão em inglês." — in EN the key reads "This is the authoritative version."). Render `translationNote` under the title. Same structure for `terms`. Add `generateMetadata` like Step 1 with the right paths.

Also add to privacy, in both languages, a short section `waitlist` describing what the waitlist stores (email, optional name, mode, language, launch-notice preference, campaign source, a one-way hash of the IP for abuse prevention), the purpose (invite + launch notice only), and how to be removed (email `support@grandma.app`). This is the page the consent line links to (Task 15).

- [ ] **Step 3: Verify and commit**

```bash
pnpm i18n:check && pnpm typecheck && pnpm build
git add -A
git commit -m "feat(i18n): pricing, privacy and terms in EN and PT; waitlist privacy section"
```

---

### Task 8: Diffuse foundation — modes, tokens, fonts

**Files:**
- Create: `lib/modes.ts`
- Test: `lib/modes.test.ts`
- Modify: `app/globals.css` (replace the `:root` block and `@theme inline`; keep the component classes for now)
- Modify: `app/[locale]/layout.tsx` (fonts)

**Interfaces:**
- Produces:
  - `MODES = ['pre','preg','kids','meno'] as const`, `type Mode`, `isMode(v: unknown): v is Mode`
  - `FIELDS: Record<Mode, { g1: string; g2: string; g3: string; g4: string; accent: string; accentSoft: string }>`
  - `fieldStops(mode: Mode): [string, string, string, string]`
  - CSS variables: `--d-paper`, `--d-paper-2`, `--d-paper-3`, `--d-bg-deep`, `--d-ink`, `--d-ink-2`, `--d-ink-3`, `--d-ink-4`, `--d-line`, `--d-line-2`, `--d-hairline`, `--d-r-sm|md|lg|xl`, `--d-blur-soft|field|glass`, `--sh-card`, `--sh-pop`, `--d-grain`, `--field-<mode>-g1..g4`, `--field-<mode>-accent`, `--field-<mode>-accent-soft`, fonts `--font-hanken`, `--font-space-mono`
  - Tailwind utilities: `bg-paper`, `bg-paper-2`, `text-ink`, `text-ink-2`, `text-ink-3`, `text-ink-4`, `border-line`, `border-line-2`, `border-hairline`, `font-display`, `font-body`, `font-mono`, `rounded-d-sm|md|lg|xl`, `shadow-card`, `shadow-pop`

- [ ] **Step 1: Failing test for modes**

`lib/modes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { MODES, FIELDS, fieldStops, isMode } from './modes'

describe('modes', () => {
  it('has exactly the four live modes', () => {
    expect(MODES).toEqual(['pre', 'preg', 'kids', 'meno'])
  })
  it('matches the app diffuseFields values', () => {
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

Run: `pnpm test lib/modes.test.ts` → FAIL (module missing).

- [ ] **Step 2: Implement `lib/modes.ts`**

```ts
/**
 * The app's four live behaviors and their Diffuse generative fields.
 * Values copied from grandma-app/constants/theme.ts `diffuseFields`
 * (caregiver is scaffold-only in the app and is deliberately absent here).
 */
export const MODES = ['pre', 'preg', 'kids', 'meno'] as const
export type Mode = (typeof MODES)[number]

export function isMode(v: unknown): v is Mode {
  return typeof v === 'string' && (MODES as readonly string[]).includes(v)
}

export interface Field {
  g1: string
  g2: string
  g3: string
  g4: string
  accent: string
  accentSoft: string
}

export const FIELDS: Record<Mode, Field> = {
  pre: { g1: '#F0A99A', g2: '#F0B8C8', g3: '#C9B7E6', g4: '#F7DCC0', accent: '#C25872', accentSoft: '#F6DCE4' },
  preg: { g1: '#F8C9A6', g2: '#F2AEC6', g3: '#BDA4E2', g4: '#F8E1B2', accent: '#8F5FC6', accentSoft: '#E7D8F5' },
  kids: { g1: '#F4D888', g2: '#A2D8B4', g3: '#A6BCE6', g4: '#F4B396', accent: '#4C79CE', accentSoft: '#CBDCF7' },
  meno: { g1: '#F5C89A', g2: '#F0B27A', g3: '#E8975A', g4: '#F7DCC0', accent: '#C2703A', accentSoft: '#F7E3D2' },
}

export function fieldStops(mode: Mode): [string, string, string, string] {
  const f = FIELDS[mode]
  return [f.g1, f.g2, f.g3, f.g4]
}
```

Run: `pnpm test lib/modes.test.ts` → PASS.

- [ ] **Step 3: Tokens in `app/globals.css`**

Replace the whole `:root { … }` block with the block below. The second half aliases the OLD variable names to Diffuse values, so every section shifts to the new palette immediately and nothing breaks; Tasks 10–13 migrate components to the new names and Task 16 deletes the aliases.

```css
:root {
  /* ── Diffuse canvas & ink (grandma-app diffuseLightTokens / v3) ── */
  --d-paper: #F4F1E8;
  --d-paper-2: #FBFAF5;
  --d-paper-3: #F7F4EC;
  --d-bg-deep: #EDE9DD;
  --d-ink: #1A1916;
  --d-ink-2: #4A463E;
  --d-ink-3: #807A6E;
  --d-ink-4: #B3AC9C;
  --d-line: rgba(26, 25, 22, 0.12);
  --d-line-2: rgba(26, 25, 22, 0.20);
  --d-hairline: rgba(26, 25, 22, 0.55);
  --d-success: #2E7D32;
  --d-error: #C62828;

  /* ── Shape, blur, depth ── */
  --d-r-sm: 14px;
  --d-r-md: 20px;
  --d-r-lg: 28px;
  --d-r-xl: 40px;
  --d-blur-soft: 40px;
  --d-blur-field: 70px;
  --d-blur-glass: 18px;
  --sh-card: 0 1px 2px rgba(26, 25, 22, .04), 0 8px 30px -18px rgba(26, 25, 22, .18);
  --sh-pop: 0 2px 6px rgba(26, 25, 22, .06), 0 22px 50px -24px rgba(26, 25, 22, .30);
  --d-grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  --d-grain-opacity: 0.22;

  /* ── Mode fields (lib/modes.ts FIELDS — keep in sync) ── */
  --field-pre-g1: #F0A99A; --field-pre-g2: #F0B8C8; --field-pre-g3: #C9B7E6; --field-pre-g4: #F7DCC0;
  --field-pre-accent: #C25872; --field-pre-accent-soft: #F6DCE4;
  --field-preg-g1: #F8C9A6; --field-preg-g2: #F2AEC6; --field-preg-g3: #BDA4E2; --field-preg-g4: #F8E1B2;
  --field-preg-accent: #8F5FC6; --field-preg-accent-soft: #E7D8F5;
  --field-kids-g1: #F4D888; --field-kids-g2: #A2D8B4; --field-kids-g3: #A6BCE6; --field-kids-g4: #F4B396;
  --field-kids-accent: #4C79CE; --field-kids-accent-soft: #CBDCF7;
  --field-meno-g1: #F5C89A; --field-meno-g2: #F0B27A; --field-meno-g3: #E8975A; --field-meno-g4: #F7DCC0;
  --field-meno-accent: #C2703A; --field-meno-accent-soft: #F7E3D2;

  /* ── Sticker palette (icons only under Diffuse) — unchanged ── */
  --sticker-yellow: #F5D652; --sticker-yellow-soft: #FBEA9E;
  --sticker-blue: #9DC3E8; --sticker-blue-soft: #CFE0F0;
  --sticker-pink: #F2B2C7; --sticker-pink-soft: #F9D8E2;
  --sticker-green: #BDD48C; --sticker-green-soft: #DDE7BB;
  --sticker-lilac: #C8B6E8; --sticker-lilac-soft: #E3D8F2;
  --sticker-peach: #F5B896; --sticker-peach-soft: #F9D6C0;
  --sticker-coral: #EE7B6D;
  --sticker-charcoal: #2A2624;

  /* ── Easing ── */
  --ease-paper: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-ink: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-letter: cubic-bezier(0.16, 1, 0.3, 1);

  /* ── LEGACY ALIASES — removed in Task 16. Do not use in new code. ── */
  --bg: var(--d-paper);
  --bg-warm: var(--d-bg-deep);
  --surface: var(--d-paper-2);
  --surface-raised: var(--d-paper-3);
  --border: var(--d-line);
  --border-light: var(--d-line);
  --border-strong: var(--d-line-2);
  --ink: var(--d-ink);
  --ink-secondary: var(--d-ink-2);
  --ink-muted: var(--d-ink-3);
  --ink-faint: var(--d-ink-4);
  --primary: var(--field-preg-accent);
  --primary-light: var(--field-preg-g3);
  --primary-dark: var(--d-ink);
  --secondary: var(--field-kids-accent);
  --rose: var(--field-pre-accent);
  --rose-soft: var(--field-pre-accent-soft);
  --lavender: var(--field-preg-accent);
  --lavender-soft: var(--field-preg-accent-soft);
  --blue-powder: var(--field-kids-accent);
  --blue-powder-soft: var(--field-kids-accent-soft);
  --r-sm: var(--d-r-sm); --r-md: var(--d-r-md); --r-lg: var(--d-r-lg); --r-xl: var(--d-r-xl); --r-xxl: var(--d-r-xl); --r-full: 999px;
  --shadow-card: var(--sh-card);
  --shadow-card-hover: var(--sh-pop);
  --shadow-stamp: none;
  --shadow-stamp-press: none;
  --font-fraunces: var(--font-hanken);
  --font-dm-sans: var(--font-hanken);
  --font-instrument-serif: var(--font-hanken);
  --font-display: var(--font-hanken), system-ui, sans-serif;
  --font-italic: var(--font-hanken), system-ui, sans-serif;
  --font-body: var(--font-hanken), system-ui, sans-serif;

  /* ── shadcn compatibility (components/ui) ── */
  --background: var(--d-paper);
  --foreground: var(--d-ink);
  --card: var(--d-paper-2);
  --card-foreground: var(--d-ink);
  --popover: var(--d-paper-2);
  --popover-foreground: var(--d-ink);
  --muted: var(--d-paper-3);
  --muted-foreground: var(--d-ink-3);
  --accent: var(--field-preg-accent-soft);
  --accent-foreground: var(--d-ink);
  --destructive: var(--d-error);
  --destructive-foreground: var(--d-paper-2);
  --input: var(--d-line-2);
  --ring: var(--d-ink);
  --radius: 0.875rem;
}
```

Update the `body` rule: `background: var(--d-paper); color: var(--d-ink); font-family: var(--font-hanken), system-ui, sans-serif; font-size: 17px; line-height: 1.6;` and `::selection { background: var(--field-preg-accent-soft); color: var(--d-ink); }`.

In `@theme inline`, replace the font and color lines with (keep any shadcn `--color-*` lines that follow, they now resolve through the compatibility block):

```css
  --font-sans: var(--font-hanken), system-ui, sans-serif;
  --font-display: var(--font-hanken), system-ui, sans-serif;
  --font-body: var(--font-hanken), system-ui, sans-serif;
  --font-mono: var(--font-space-mono), ui-monospace, monospace;
  --color-paper: var(--d-paper);
  --color-paper-2: var(--d-paper-2);
  --color-paper-3: var(--d-paper-3);
  --color-bg-deep: var(--d-bg-deep);
  --color-ink: var(--d-ink);
  --color-ink-2: var(--d-ink-2);
  --color-ink-3: var(--d-ink-3);
  --color-ink-4: var(--d-ink-4);
  --color-line: var(--d-line);
  --color-line-2: var(--d-line-2);
  --color-hairline: var(--d-hairline);
  --radius-d-sm: var(--d-r-sm);
  --radius-d-md: var(--d-r-md);
  --radius-d-lg: var(--d-r-lg);
  --radius-d-xl: var(--d-r-xl);
  --shadow-card: var(--sh-card);
  --shadow-pop: var(--sh-pop);
```

- [ ] **Step 4: Fonts in the layout**

In `app/[locale]/layout.tsx`, replace the three font imports/constants with:

```tsx
import { Hanken_Grotesk, Space_Mono } from 'next/font/google'

const hanken = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-hanken', display: 'swap', weight: ['400', '500', '700'], style: ['normal', 'italic'] })
const spaceMono = Space_Mono({ subsets: ['latin'], variable: '--font-space-mono', display: 'swap', weight: ['400', '700'] })
```

and the `<html>`/`<body>`:

```tsx
    <html lang={htmlLang(locale as Locale)} className={`${hanken.variable} ${spaceMono.variable} bg-[#F4F1E8]`}>
      <body className="antialiased font-body">
```

(The font variables go on `<html>` so the `:root` aliases can resolve them.)

- [ ] **Step 5: Verify and commit**

Run: `pnpm test && pnpm typecheck && pnpm build`. Then `pnpm dev`: the whole site is now on warm off-white paper with Hanken Grotesk, nothing is broken or unstyled, stamp shadows are gone.

```bash
git add -A
git commit -m "feat(diffuse): Diffuse tokens, mode fields, Hanken Grotesk + Space Mono"
```

---

### Task 9: Diffuse primitive kit

**Files:**
- Create: `components/diffuse/display.tsx`, `components/diffuse/mono-label.tsx`, `components/diffuse/gradient-field.tsx`, `components/diffuse/grain.tsx`, `components/diffuse/action-rule.tsx`, `components/diffuse/text-link.tsx`, `components/diffuse/hairline-select.tsx`, `components/diffuse/field.tsx`, `components/diffuse/card.tsx`, `components/diffuse/index.ts`
- Create: `app/[locale]/dev/diffuse/page.tsx` (kit preview; not linked, `robots: noindex`)

**Interfaces:**
- Consumes: `Mode`, `FIELDS` from `@/lib/modes`.
- Produces (all exported from `@/components/diffuse`):
  - `Display({ as?: 'h1'|'h2'|'h3'; size?: 'hero'|'xl'|'lg'|'md'; className?; children })` — Hanken Bold, tight tracking. Feeling words inside are `<Display.Em>` (bold italic).
  - `MonoLabel({ as?: 'p'|'span'; dot?: Mode; className?; children })` — Space Mono, 12px, `tracking-[0.2em]`, uppercase, `text-ink-3`; optional 6px accent dot.
  - `GradientField({ mode: Mode; intensity?: 'soft'|'full'; className? })` — absolutely positioned, `aria-hidden`, four blurred blobs + `Grain`.
  - `Grain({ className? })`
  - `ActionRule({ href?: string; type?: 'submit'|'button'; disabled?: boolean; pending?: boolean; onClick?; className?; children })` — renders `Link` (from `@/i18n/navigation`) when `href` is set, else `<button>`. Mono uppercase label + arrow on a top hairline; arrow slides 6px on hover.
  - `TextLink({ href: string; className?; children })`
  - `HairlineSelect<T extends string>({ name: string; value: T; onChange(v: T): void; options: { value: T; label: string; mode?: Mode }[]; legend: string })` — radio group; selected option gets a hairline ring and an accent dot.
  - `Field({ label: string; error?: string; ...InputHTMLAttributes })` — hairline-underlined input with mono label and error text, wired with `aria-invalid` / `aria-describedby`.
  - `Card({ as?: 'div'|'article'|'li'; size?: 'md'|'lg'; className?; children })`

- [ ] **Step 1: Write the components**

`components/diffuse/display.tsx`:

```tsx
import type { ReactNode } from 'react'

const SIZES = {
  hero: 'text-[44px] leading-[1.02] lg:text-[84px] tracking-[-0.035em]',
  xl: 'text-[36px] leading-[1.05] lg:text-[56px] tracking-[-0.03em]',
  lg: 'text-[28px] leading-[1.1] lg:text-[40px] tracking-[-0.025em]',
  md: 'text-[22px] leading-[1.15] lg:text-[26px] tracking-[-0.02em]',
} as const

export function Display({
  as: Tag = 'h2',
  size = 'xl',
  className = '',
  children,
}: {
  as?: 'h1' | 'h2' | 'h3'
  size?: keyof typeof SIZES
  className?: string
  children: ReactNode
}) {
  return <Tag className={`font-display font-bold text-ink text-balance ${SIZES[size]} ${className}`}>{children}</Tag>
}

function Em({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <em className={`font-display font-bold italic ${className}`}>{children}</em>
}
Display.Em = Em
```

`components/diffuse/mono-label.tsx`:

```tsx
import type { ReactNode } from 'react'
import { FIELDS, type Mode } from '@/lib/modes'

export function MonoLabel({
  as: Tag = 'p',
  dot,
  className = '',
  children,
}: {
  as?: 'p' | 'span'
  dot?: Mode
  className?: string
  children: ReactNode
}) {
  return (
    <Tag className={`inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.2em] text-ink-3 ${className}`}>
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: FIELDS[dot].accent }} />}
      {children}
    </Tag>
  )
}
```

`components/diffuse/grain.tsx`:

```tsx
export function Grain({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 mix-blend-multiply ${className}`}
      style={{ backgroundImage: 'var(--d-grain)', opacity: 'var(--d-grain-opacity)' }}
    />
  )
}
```

`components/diffuse/gradient-field.tsx`:

```tsx
import { fieldStops, type Mode } from '@/lib/modes'
import { Grain } from './grain'

// Blob placement mirrors the v3 reference: four soft lobes, offset so the
// centre stays light enough for ink text.
const BLOBS = [
  'left-[-10%] top-[-20%] h-[70%] w-[60%]',
  'right-[-15%] top-[-10%] h-[65%] w-[55%]',
  'left-[10%] bottom-[-25%] h-[70%] w-[55%]',
  'right-[0%] bottom-[-20%] h-[60%] w-[50%]',
]

export function GradientField({
  mode,
  intensity = 'soft',
  className = '',
}: {
  mode: Mode
  intensity?: 'soft' | 'full'
  className?: string
}) {
  const stops = fieldStops(mode)
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {stops.map((color, i) => (
        <span
          key={i}
          className={`absolute rounded-full ${BLOBS[i]}`}
          style={{
            background: color,
            filter: 'blur(var(--d-blur-field))',
            opacity: intensity === 'full' ? 0.9 : 0.55,
          }}
        />
      ))}
      <Grain />
    </div>
  )
}
```

`components/diffuse/action-rule.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'

function Arrow() {
  return (
    <svg viewBox="0 0 22 18" width="22" height="18" fill="none" aria-hidden="true" className="opacity-85 transition-transform duration-[250ms] group-hover:translate-x-1.5">
      <path d="M1 9h19M13 2l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const BASE =
  'group flex w-full items-center justify-between border-t border-line-2 pt-[18px] pb-0.5 px-0.5 font-mono text-[13px] font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:border-hairline disabled:cursor-default disabled:border-line disabled:text-ink-4'

export function ActionRule({
  href,
  type = 'button',
  disabled,
  pending,
  onClick,
  className = '',
  children,
}: {
  href?: string
  type?: 'submit' | 'button'
  disabled?: boolean
  pending?: boolean
  onClick?: () => void
  className?: string
  children: ReactNode
}) {
  if (href) {
    return (
      <Link href={href} className={`${BASE} ${className}`}>
        <span>{children}</span>
        <Arrow />
      </Link>
    )
  }
  return (
    <button type={type} disabled={disabled || pending} aria-busy={pending || undefined} onClick={onClick} className={`${BASE} ${className}`}>
      <span>{children}</span>
      <Arrow />
    </button>
  )
}
```

`components/diffuse/text-link.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'

export function TextLink({ href, className = '', children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={`font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-ink-3 transition-colors hover:text-ink ${className}`}>
      {children}
    </Link>
  )
}
```

`components/diffuse/hairline-select.tsx`:

```tsx
'use client'

import { FIELDS, type Mode } from '@/lib/modes'

export function HairlineSelect<T extends string>({
  name,
  value,
  onChange,
  options,
  legend,
}: {
  name: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; mode?: Mode }[]
  legend: string
}) {
  return (
    <fieldset>
      <legend className="mb-3 font-mono text-[12px] uppercase tracking-[0.2em] text-ink-3">{legend}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((o) => {
          const checked = o.value === value
          return (
            <label
              key={o.value}
              className={`relative flex cursor-pointer items-center gap-2 rounded-d-md border px-4 py-3 text-[15px] transition-colors ${
                checked ? 'border-hairline text-ink' : 'border-line text-ink-2 hover:border-line-2'
              }`}
            >
              <input type="radio" name={name} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="sr-only" />
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full border transition-colors"
                style={{
                  borderColor: o.mode ? FIELDS[o.mode].accent : 'var(--d-hairline)',
                  background: checked ? (o.mode ? FIELDS[o.mode].accent : 'var(--d-ink)') : 'transparent',
                }}
              />
              {o.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
```

`components/diffuse/field.tsx`:

```tsx
import { useId, type InputHTMLAttributes } from 'react'

export function Field({ label, error, id, className = '', ...input }: { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId()
  const fieldId = id ?? auto
  const errorId = `${fieldId}-error`
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="block font-mono text-[12px] uppercase tracking-[0.2em] text-ink-3">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="mt-2 w-full border-0 border-b border-line-2 bg-transparent px-0 pb-2 text-[18px] text-ink placeholder:text-ink-4 focus:border-hairline focus:outline-none aria-[invalid=true]:border-[var(--d-error)]"
        {...input}
      />
      {error && (
        <p id={errorId} className="mt-2 text-[14px] text-[var(--d-error)]">
          {error}
        </p>
      )}
    </div>
  )
}
```

`components/diffuse/card.tsx`:

```tsx
import type { ReactNode } from 'react'

export function Card({
  as: Tag = 'div',
  size = 'md',
  className = '',
  children,
}: {
  as?: 'div' | 'article' | 'li'
  size?: 'md' | 'lg'
  className?: string
  children: ReactNode
}) {
  return (
    <Tag className={`relative overflow-hidden border border-line bg-paper-2 shadow-card ${size === 'lg' ? 'rounded-d-lg p-8 lg:p-12' : 'rounded-d-md p-6'} ${className}`}>
      {children}
    </Tag>
  )
}
```

`components/diffuse/index.ts`:

```ts
export { Display } from './display'
export { MonoLabel } from './mono-label'
export { GradientField } from './gradient-field'
export { Grain } from './grain'
export { ActionRule } from './action-rule'
export { TextLink } from './text-link'
export { HairlineSelect } from './hairline-select'
export { Field } from './field'
export { Card } from './card'
```

- [ ] **Step 2: Kit preview page**

`app/[locale]/dev/diffuse/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Display, MonoLabel, GradientField, ActionRule, TextLink, HairlineSelect, Field, Card } from '@/components/diffuse'
import { MODES, type Mode } from '@/lib/modes'

export default function DiffuseKitPage() {
  const [mode, setMode] = useState<Mode>('preg')
  return (
    <main className="mx-auto max-w-4xl space-y-12 px-6 py-16">
      <MonoLabel dot="preg">Diffuse kit · dev only</MonoLabel>
      <Display as="h1" size="hero">Light, <Display.Em>soft</Display.Em>, generative.</Display>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {MODES.map((m) => (
          <div key={m} className="relative h-40 overflow-hidden rounded-d-lg border border-line">
            <GradientField mode={m} intensity="full" />
            <MonoLabel className="absolute bottom-3 left-3 text-ink">{m}</MonoLabel>
          </div>
        ))}
      </div>
      <Card size="lg">
        <Field label="Email" placeholder="you@your-life.com" />
        <Field className="mt-6" label="Email (error)" error="Please enter a valid email." defaultValue="ana@" />
        <div className="mt-6">
          <HairlineSelect name="mode" legend="I am…" value={mode} onChange={setMode} options={MODES.map((m) => ({ value: m, label: m, mode: m }))} />
        </div>
        <div className="mt-8 space-y-4">
          <ActionRule type="button">Save my seat</ActionRule>
          <ActionRule type="button" pending>Saving…</ActionRule>
          <TextLink href="/pricing">See pricing</TextLink>
        </div>
      </Card>
    </main>
  )
}
```

Add `app/[locale]/dev/diffuse/layout.tsx` exporting `export const metadata = { robots: { index: false, follow: false } }` and `export default function L({ children }: { children: React.ReactNode }) { return children }`.

- [ ] **Step 3: Visual check against the reference**

Run `pnpm dev`, open `/en/dev/diffuse` next to `APP/docs/design/design-system-v3.html` (open the file in a browser). Compare: font weights, mono letter-spacing, hairline thickness/colour, field softness, grain visibility, card radius/shadow. Adjust class values in the kit (not in the reference) until they match. Check keyboard: Tab reaches each radio option and the buttons; focus is visible (add `focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[var(--d-hairline)]` to `BASE` in ActionRule and to the label in HairlineSelect via `has-[:focus-visible]:outline …` if not visible).

- [ ] **Step 4: Commit**

```bash
pnpm typecheck && pnpm build
git add -A
git commit -m "feat(diffuse): web primitive kit mirroring the app (Display, MonoLabel, GradientField, ActionRule…)"
```

---

### Task 10: Navigation, hero, final strip and footer on Diffuse

**Files:**
- Modify: `components/navigation.tsx`, `components/hero-section.tsx`, `components/animated-hero-card.tsx`, `components/footer.tsx`, `components/waitlist-faq-section.tsx` (only `FinalHeroStrip`)
- Create: `lib/waitlist/prefill.ts`
- Modify: `messages/en.json`, `messages/pt.json`

**Interfaces:**
- Consumes: kit from Task 9; `MODES` from `@/lib/modes`.
- Produces: `PREFILL_EVENT = 'waitlist:prefill'` and `prefillWaitlist(email: string): void` (dispatches `CustomEvent<string>` and scrolls to `#waitlist`), consumed by the waitlist form in Task 15.

**Token migration map** (used in this task and Tasks 11–13; apply to every touched file):

| Old | New |
|---|---|
| `style={{ fontFamily: 'var(--font-fraunces)…' }}` + `font-semibold` | `font-display font-bold` (or `<Display>`) |
| Instrument Serif italic `<em>` | `<Display.Em>` |
| `<p className="eyebrow">` | `<MonoLabel>` |
| `var(--bg)` / `var(--bg-warm)` / `var(--surface)` / `var(--surface-raised)` | `bg-paper` / `bg-bg-deep` / `bg-paper-2` / `bg-paper-3` |
| `var(--ink)` / `--ink-secondary` / `--ink-muted` / `--ink-faint` | `text-ink` / `text-ink-2` / `text-ink-3` / `text-ink-4` |
| `var(--border)` / `--border-strong` | `border-line` / `border-line-2` |
| `--rose*` / `--lavender*` / `--blue-powder*` | `FIELDS.pre|preg|kids.accent / accentSoft` (or `--field-<mode>-accent[-soft]`) |
| `.btn-primary` | `<ActionRule>` |
| `.btn-secondary`, text CTAs | `<TextLink>` |
| `.card-paper`, `rounded-[28px] border shadow-[var(--shadow-card)]` | `<Card>` |
| `.chip*`, filled `rounded-full` labels | `<MonoLabel dot=…>` |
| `.input-field` | `<Field>` |
| `rounded-[12px]` / `[36px]` / `[48px]` | `rounded-d-sm` / `rounded-d-xl` / `rounded-d-xl` |
| Background sticker collage (absolute stickers scattered for decoration) | delete; stickers only as icons next to content |

- [ ] **Step 1: Prefill helper**

`lib/waitlist/prefill.ts`:

```ts
export const PREFILL_EVENT = 'waitlist:prefill'

/** Hand an email from any CTA to the main waitlist form and scroll to it. */
export function prefillWaitlist(email: string): void {
  window.dispatchEvent(new CustomEvent<string>(PREFILL_EVENT, { detail: email.trim() }))
  document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
```

- [ ] **Step 2: Navigation**

Rebuild `components/navigation.tsx` keeping its behaviour (scroll state, mobile menu, `ScrollProgress`) and the Task 5 i18n wiring:
- bar: transparent at top; when scrolled, `bg-paper/85 backdrop-blur-[var(--d-blur-glass)] border-b border-line` full-width (no floating pill, no `rounded-full`, no card shadow);
- wordmark: `GrandmaLogo` + `grandma` in `font-display font-bold tracking-[-0.03em]`;
- links: `font-mono text-[12px] uppercase tracking-[0.2em] text-ink-2 hover:text-ink`;
- right side: `LocaleSwitcher` (mono, same style) and a `TextLink href="/#waitlist"` with `t('join')`;
- mobile menu: full-screen `bg-paper` sheet, links as `Display size="md"` rows separated by `border-b border-line`, `LocaleSwitcher` and `ActionRule href="/#waitlist"` at the bottom;
- `ScrollProgress`: 1px bar in `var(--d-hairline)`.

- [ ] **Step 3: Hero**

Rebuild `components/hero-section.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, useReducedMotion } from 'framer-motion'
import { AnimatedHeroCard } from './animated-hero-card'
import { Display, MonoLabel, GradientField, ActionRule } from '@/components/diffuse'
import { prefillWaitlist } from '@/lib/waitlist/prefill'

export function HeroSection() {
  const t = useTranslations('hero')
  const reduce = useReducedMotion()
  const [email, setEmail] = useState('')

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    prefillWaitlist(email)
  }

  return (
    <section id="hero" aria-label={t('aria')} className="relative overflow-hidden bg-paper px-6 pb-20 pt-32 lg:px-12">
      <GradientField mode="preg" className="opacity-70" />
      <div className="relative mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-[640px]"
        >
          <MonoLabel dot="preg">{t('eyebrow')}</MonoLabel>
          <Display as="h1" size="hero" className="mb-6 mt-6">
            {t.rich('title', { em: (c) => <Display.Em>{c}</Display.Em> })}
          </Display>
          <p className="mb-10 max-w-[540px] text-[17px] leading-[1.6] text-ink-2 lg:text-[19px]">{t('subtitle')}</p>
          <form onSubmit={onSubmit} className="max-w-[440px] space-y-6">
            <label className="sr-only" htmlFor="hero-email">{t('emailLabel')}</label>
            <input
              id="hero-email"
              type="email"
              autoComplete="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-0 border-b border-line-2 bg-transparent px-0 pb-2 text-[18px] text-ink placeholder:text-ink-4 focus:border-hairline focus:outline-none"
            />
            <ActionRule type="submit">{t('cta')}</ActionRule>
          </form>
          <p className="mt-4 text-[14px] text-ink-3">{t('note')}</p>
        </motion.div>
        <div className="relative flex min-h-[400px] items-center justify-center lg:min-h-[520px]">
          <AnimatedHeroCard />
        </div>
      </div>
      <div className="relative mx-auto mt-16 max-w-[1280px] border-t border-line pt-6 lg:mt-24">
        <MonoLabel>{t('builtBy')}</MonoLabel>
      </div>
    </section>
  )
}
```

Add keys `hero.aria` ("Introduction" / "Introdução") and `hero.emailLabel` ("Your email" / "Seu email") to both files. Reskin `AnimatedHeroCard` with the migration map (card → `Card`, labels → `MonoLabel`, numbers → `font-display font-bold tabular-nums`, data text → `font-mono`).

- [ ] **Step 4: Final strip and footer**

`FinalHeroStrip`: section `relative overflow-hidden bg-paper py-24 text-center`, a `GradientField mode="kids"` behind, `MonoLabel` eyebrow, `Display size="xl"` with the line, and an `ActionRule href="/#waitlist"` (max-w-[360px], centred) with a new key `final.cta` ("Save my seat" / "Garantir meu lugar"). Remove the leaf sticker.

Footer: `bg-bg-deep border-t border-line`; column titles as `MonoLabel`; links `text-ink-2 hover:text-ink`; bottom row with `LocaleSwitcher`, the copyright line, and links to `/privacy` and `/terms` via `Link` from `@/i18n/navigation`. Keep all existing footer keys.

- [ ] **Step 5: Verify and commit**

Run: `pnpm i18n:check && pnpm typecheck && pnpm build`. In `pnpm dev`, at 390, 768 and 1280 px wide, check `/en` and `/pt`: hero headline doesn't overflow (Hanken Bold is wider than Fraunces — reduce `hero` size class if the PT headline wraps to more than 4 lines at 390px); typing an email in the hero and pressing Enter scrolls to `#waitlist`; nav switches between transparent and blurred paper.

```bash
git add -A
git commit -m "feat(diffuse): navigation, hero, final strip and footer on Diffuse"
```

---

### Task 11: Four modes section (replaces three stages)

**Files:**
- Create: `components/modes-section.tsx` (from `components/three-stages-section.tsx`)
- Create: `components/mode-screens.tsx` (the four phone-screen mockups)
- Delete: `components/three-stages-section.tsx`
- Modify: `app/[locale]/page.tsx` (`ThreeStagesSection` → `ModesSection`)
- Modify: `messages/en.json`, `messages/pt.json` (`stages` namespace → `modes`; update `nav.modes` anchor stays `#stages`)

**Interfaces:**
- Consumes: kit (Task 9); `MODES`, `type Mode` (Task 8).
- Produces: `ModesSection()`; `ModeScreen({ mode }: { mode: Mode })`.

- [ ] **Step 1: Messages**

Replace the `stages` namespace with `modes` in both files. Move the existing stage texts into it (cycle → `pre`, pregnancy → `preg`, kids → `kids`) and add `meno`. Final shape and new copy:

`messages/en.json`:

```json
"modes": {
  "aria": "The four modes",
  "eyebrow": "FOUR MODES",
  "title": "One companion. Four <em>chapters</em>.",
  "subtitle": "Grandma's whole app reshapes itself around where you are. Same wisdom, different chapter — and she keeps your history when you move on.",
  "seeApp": "See the app",
  "closePreview": "Close preview",
  "outro": "Switch modes any time. Grandma remembers everything.",
  "items": {
    "pre": {
      "label": "Cycle",
      "title": "Know your <em>cycle</em>.",
      "description": "A cycle ring with hormone curves, fertile windows that actually make sense, daily wisdom, and six fertility pillars to understand your body on every level.",
      "features": ["Cycle ring and phase predictions", "Hormone curves (LH, estrogen, progesterone)", "Fertile window and ovulation forecast", "Daily wisdom and affirmations", "Preconception checklist and supplements", "Mood, energy and symptom logging"]
    },
    "preg": {
      "label": "Pregnancy",
      "title": "Expecting, <em>for two</em>.",
      "description": "A 40-week journey ring, baby size in real fruit (and feelings), trimester-aware content, daily affirmations, and a birth plan that fits in your bag.",
      "features": ["40-week journey ring with fruit size", "Baby growth (length and weight)", "Trimester-aware daily content", "Affirmations and kick counter", "Birth plan and hospital bag checklist", "Appointments and contraction timer"]
    },
    "kids": {
      "label": "Kids",
      "title": "Raising <em>little ones</em>.",
      "description": "From newborn to five: feeds, sleep, growth, milestones and vaccines in one calm place, shared with the people who help you care.",
      "features": ["Feeds, sleep and diapers", "Growth charts and milestones", "Vaccine reminders", "Care circle for partner and nanny", "Memories you can keep", "Ask Grandma, any hour"]
    },
    "meno": {
      "label": "Menopause",
      "title": "Through the <em>change</em>.",
      "description": "Track hot flashes, sleep, mood and cycle changes, see your patterns over weeks, and get steady, grounded answers for perimenopause and beyond.",
      "features": ["Quick symptom log (hot flashes, sleep, mood)", "Calendar with day-by-day icons", "Patterns across weeks", "Cycle changes in perimenopause", "Notes to bring to your doctor", "Ask Grandma, any hour"]
    }
  },
  "screens": { }
}
```

`messages/pt.json`:

```json
"modes": {
  "aria": "Os quatro modos",
  "eyebrow": "QUATRO MODOS",
  "title": "Uma companhia. Quatro <em>capítulos</em>.",
  "subtitle": "O app inteiro da Vovó se ajusta ao momento em que você está. A mesma sabedoria, outro capítulo — e ela guarda o seu histórico quando você muda de fase.",
  "seeApp": "Ver o app",
  "closePreview": "Fechar prévia",
  "outro": "Troque de modo quando quiser. A Vovó lembra de tudo.",
  "items": {
    "pre": {
      "label": "Ciclo",
      "title": "Conheça o seu <em>ciclo</em>.",
      "description": "Um anel do ciclo com curvas hormonais, janela fértil que faz sentido de verdade, sabedoria diária e seis pilares de fertilidade para entender o seu corpo por inteiro.",
      "features": ["Anel do ciclo e previsão das fases", "Curvas hormonais (LH, estrogênio, progesterona)", "Janela fértil e previsão da ovulação", "Sabedoria e afirmações diárias", "Checklist pré-concepção e suplementos", "Registro de humor, energia e sintomas"]
    },
    "preg": {
      "label": "Gravidez",
      "title": "Esperando, <em>a dois</em>.",
      "description": "Um anel de 40 semanas, o tamanho do bebê em frutas (e em sentimentos), conteúdo para cada trimestre, afirmações diárias e um plano de parto que cabe na bolsa.",
      "features": ["Anel de 40 semanas com tamanho em frutas", "Crescimento do bebê (comprimento e peso)", "Conteúdo diário para cada trimestre", "Afirmações e contador de chutes", "Plano de parto e checklist da mala da maternidade", "Consultas e cronômetro de contrações"]
    },
    "kids": {
      "label": "Filhos",
      "title": "Criando os <em>pequenos</em>.",
      "description": "Do recém-nascido aos cinco anos: mamadas, sono, crescimento, marcos e vacinas num lugar tranquilo, compartilhado com quem ajuda você a cuidar.",
      "features": ["Mamadas, sono e fraldas", "Curvas de crescimento e marcos", "Lembretes de vacina", "Rede de cuidado para parceiro e babá", "Memórias para guardar", "Pergunte à Vovó, a qualquer hora"]
    },
    "meno": {
      "label": "Menopausa",
      "title": "Atravessando a <em>mudança</em>.",
      "description": "Registre ondas de calor, sono, humor e mudanças no ciclo, veja seus padrões ao longo das semanas e receba respostas calmas e embasadas para a perimenopausa e depois dela.",
      "features": ["Registro rápido de sintomas (calor, sono, humor)", "Calendário com ícones dia a dia", "Padrões ao longo das semanas", "Mudanças no ciclo na perimenopausa", "Anotações para levar à consulta", "Pergunte à Vovó, a qualquer hora"]
    }
  },
  "screens": { }
}
```

`modes.screens` holds the phone-mockup strings moved from `stages.screens` in Task 6, plus a new `meno` group for Step 2 (EN: `"greeting": "Hi,"`, `"name": "Sarah"`, `"date": "Day 214 · Thursday"`, `"todayTitle": "Today"`, `"symptoms": ["Hot flash", "Slept 6h", "Calm"]`, `"pattern": "Hot flashes eased 30% this month"`, `"ask": "Ask Grandma"`; PT: `"Oi,"`, `"Ana"`, `"Dia 214 · Quinta"`, `"Hoje"`, `["Onda de calor", "Dormiu 6h", "Tranquila"]`, `"As ondas de calor diminuíram 30% este mês"`, `"Pergunte à Vovó"`). Run `pnpm i18n:check`.

- [ ] **Step 2: Mode screens**

Create `components/mode-screens.tsx`: move `CycleTrackingScreen`, `PregnancyScreen` and `KidsScreen` out of `three-stages-section.tsx` unchanged except for the migration map (fonts → `font-display`/`font-mono`, colours → tokens/`FIELDS`), and add:

```tsx
function MenopauseScreen() {
  const t = useTranslations('modes.screens.meno')
  const f = FIELDS.meno
  const symptoms = t.raw('symptoms') as string[]
  return (
    <div className="flex min-h-full flex-col gap-3 bg-paper p-4">
      <div className="pt-4">
        <p className="font-display text-[14px] font-bold">
          {t('greeting')} <em className="italic">{t('name')}</em>
        </p>
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-3">{t('date')}</p>
      </div>
      <div className="relative overflow-hidden rounded-d-md border border-line p-4">
        <GradientField mode="meno" intensity="full" />
        <p className="relative font-mono text-[9px] uppercase tracking-[0.2em] text-ink-2">{t('todayTitle')}</p>
        <ul className="relative mt-2 flex flex-wrap gap-1.5">
          {symptoms.map((s) => (
            <li key={s} className="rounded-d-sm border border-hairline/40 bg-paper-2/70 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em]">{s}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-d-md border border-line bg-paper-2 p-3">
        <p className="text-[11px] leading-snug text-ink-2">{t('pattern')}</p>
        <svg viewBox="0 0 120 32" className="mt-2 h-8 w-full" aria-hidden="true">
          <polyline points="0,8 20,10 40,14 60,13 80,20 100,22 120,26" fill="none" stroke={f.accent} strokeWidth="1.5" />
        </svg>
      </div>
      <p className="mt-auto border-t border-line-2 pt-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em]">{t('ask')} →</p>
    </div>
  )
}

export function ModeScreen({ mode }: { mode: Mode }) {
  switch (mode) {
    case 'pre': return <CycleTrackingScreen />
    case 'preg': return <PregnancyScreen />
    case 'kids': return <KidsScreen />
    case 'meno': return <MenopauseScreen />
  }
}
```

(`'use client'` at the top; import `useTranslations`, `GradientField`, `FIELDS`, `type Mode`.)

- [ ] **Step 3: Section**

`components/modes-section.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Display, MonoLabel, GradientField, Card } from '@/components/diffuse'
import { MODES, type Mode } from '@/lib/modes'
import { PhoneMockup } from './phone-mockup'
import { ModeScreen } from './mode-screens'
import { ScrollReveal } from './scroll-animations'

type Item = { label: string; title: string; description: string; features: string[] }

export function ModesSection() {
  const t = useTranslations('modes')
  const reduce = useReducedMotion()
  const [open, setOpen] = useState<Mode | null>(null)

  return (
    <section id="stages" aria-label={t('aria')} className="bg-paper px-6 py-20 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-[1280px]">
        <ScrollReveal>
          <div className="mx-auto mb-12 max-w-[760px] text-center lg:mb-16">
            <MonoLabel>{t('eyebrow')}</MonoLabel>
            <Display size="xl" className="mb-6 mt-4">{t.rich('title', { em: (c) => <Display.Em>{c}</Display.Em> })}</Display>
            <p className="text-[17px] leading-[1.6] text-ink-2 lg:text-[19px]">{t('subtitle')}</p>
          </div>
        </ScrollReveal>

        <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {MODES.map((mode) => {
            const item = t.raw(`items.${mode}`) as Item
            const isOpen = open === mode
            return (
              <Card as="li" key={mode} className="flex flex-col !p-0">
                <div className="relative p-6 lg:p-8">
                  <GradientField mode={mode} />
                  <div className="relative">
                    <MonoLabel dot={mode}>{item.label}</MonoLabel>
                    <Display as="h3" size="md" className="mb-3 mt-4">
                      {t.rich(`items.${mode}.title`, { em: (c) => <Display.Em>{c}</Display.Em> })}
                    </Display>
                    <p className="text-[15px] leading-[1.6] text-ink-2">{item.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`mode-${mode}-preview`}
                  onClick={() => setOpen(isOpen ? null : mode)}
                  className="mt-auto flex items-center justify-between border-t border-line px-6 py-4 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-ink-2 hover:text-ink lg:px-8"
                >
                  {isOpen ? t('closePreview') : t('seeApp')}
                  <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`mode-${mode}-preview`}
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduce ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-8 lg:px-8">
                        <div className="mb-6 flex justify-center">
                          <PhoneMockup className="w-[220px]"><ModeScreen mode={mode} /></PhoneMockup>
                        </div>
                        <ul className="flex flex-col gap-2">
                          {item.features.map((f) => (
                            <li key={f} className="flex items-start gap-2 text-[14px] text-ink-2">
                              <span aria-hidden="true" className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-ink-3" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            )
          })}
        </ul>

        <p className="mx-auto max-w-[720px] pt-12 text-center font-display text-[20px] font-bold italic text-ink-2 lg:pt-16 lg:text-[24px]">
          {t('outro')}
        </p>
      </div>
    </section>
  )
}
```

Reskin `components/phone-mockup.tsx` with the migration map (frame `border-ink`, `rounded-d-xl`, `shadow-pop`).

- [ ] **Step 4: Wire and delete**

In `app/[locale]/page.tsx` replace the `ThreeStagesSection` import and usage with `ModesSection` from `@/components/modes-section`. `git rm components/three-stages-section.tsx`. Check nothing else imports it: `grep -rn "three-stages" app components` → no matches.

- [ ] **Step 5: Verify and commit**

`pnpm i18n:check && pnpm typecheck && pnpm build`. In the browser at 390/768/1280 in both locales: four cards (1 / 2 / 4 columns), each with its own field colour, "See the app" opens the mockup, the menopause mockup renders, keyboard Enter/Space toggles, `prefers-reduced-motion` (DevTools → Rendering) removes the height animation.

```bash
git add -A
git commit -m "feat(modes): four-modes section with menopause; replaces three stages"
```

---

### Task 12: Reskin middle sections and FAQ

**Files:**
- Modify: `components/meet-grandma-section.tsx`, `components/pillars-section.tsx`, `components/connections-section.tsx`, `components/memories-section.tsx`, `components/testimonials-section.tsx`, `components/waitlist-faq-section.tsx` (`FAQItem`, `FAQSection`), `components/stickers.tsx` (no change unless a sticker hardcodes an old var), `components/scroll-animations.tsx`
- Modify: `messages/en.json`, `messages/pt.json` (copy that mentions three stages; FAQ menopause entry)

**Interfaces:**
- Consumes: kit (Task 9), migration map (Task 10), `FIELDS`.

- [ ] **Step 1: Apply the migration map section by section**

For each component, in page order (meet → pillars → connections → memories → trust/testimonials → FAQ):
1. Replace every old token/class per the Task 10 map. Background decorative sticker collages are removed; stickers that sit next to a title or inside a card as an icon stay.
2. Section backgrounds alternate `bg-paper` / `bg-bg-deep`. At most one `GradientField` per section, only where the section is about a specific mode or about Grandma herself (`meet-grandma`: `mode="preg"` soft).
3. Section headers: `MonoLabel` eyebrow + `Display size="xl"` + `text-ink-2` subtitle, centred, `max-w-[760px]`.
4. Numbers and data inside illustrations/mockups use `font-mono` or `font-display font-bold tabular-nums`.
5. Run `pnpm dev` and compare with `/en/dev/diffuse` before moving on.

- [ ] **Step 2: Copy updates for four modes**

Search both message files for text that lists three stages or says "three"/"3" about stages, and "pre-pregnancy" phrasing:

```bash
grep -n -iE "three|3 stages|trying|expecting|raising|pre-pregnancy" messages/en.json
grep -n -iE "três|3 fases|tentando|esperando|criando|pré-gravidez" messages/pt.json
```

Rewrite each hit to cover the four modes (cycle, pregnancy, kids, menopause), in both files. Leave the `modes.items.*` copy from Task 11 as is.

- [ ] **Step 3: FAQ**

In `faq.items` (both files), replace the "What if I'm not pregnant yet…" entry with:

EN:
```json
{ "q": "Is it only for pregnancy and babies?", "a": "No. Grandma has four modes: Cycle for tracking and trying to conceive, Pregnancy for all 40 weeks, Kids from newborn to five, and Menopause for perimenopause and beyond. Switch any time — Grandma keeps your history." }
```

PT:
```json
{ "q": "É só para gravidez e bebês?", "a": "Não. A Vovó tem quatro modos: Ciclo, para acompanhar o ciclo e tentar engravidar; Gravidez, para as 40 semanas; Filhos, do recém-nascido aos cinco anos; e Menopausa, para a perimenopausa e depois dela. Troque quando quiser — a Vovó guarda o seu histórico." }
```

(Use whatever item key names Task 6 chose for FAQ entries; the example assumes `q`/`a`.)

`FAQItem` reskin: question in `font-display font-bold text-[20px] lg:text-[22px]`; the toggle is a 32px circle with `border-line-2` and a hairline plus that rotates 45°; rows separated by `border-line`; the button gets `aria-expanded` and `aria-controls` pointing at the answer panel `id`.

- [ ] **Step 4: Verify and commit**

`pnpm i18n:check && pnpm typecheck && pnpm build`, then visual pass at 390/768/1280 in both locales.

```bash
git add -A
git commit -m "feat(diffuse): reskin meet, pillars, connections, memories, testimonials and FAQ; four-mode copy"
```

---

### Task 13: Reskin pricing, privacy and terms

**Files:**
- Modify: `app/[locale]/pricing/page.tsx` (and its client component if one was split out in Task 5), `app/[locale]/privacy/page.tsx`, `app/[locale]/terms/page.tsx`

**Interfaces:**
- Consumes: kit (Task 9), migration map (Task 10).

- [ ] **Step 1: Pricing**

Header as in Task 12 Step 1.3. Plans are `Card size="lg"`s in a 1/2-column grid; plan name `MonoLabel`; price `font-display font-bold text-[56px] tabular-nums` with the period in `font-mono text-ink-3`; features as hairline-separated rows (`border-b border-line py-3`); CTA `ActionRule href="/#waitlist"` (pre-launch, every plan leads to the waitlist). The premium card gets `GradientField mode="preg"` soft behind its header only.

- [ ] **Step 2: Privacy and terms**

Reading layout: `max-w-[720px] mx-auto`, `MonoLabel` with `lastUpdated`, `Display size="xl"` title, the `translationNote` in `text-ink-3 text-[14px]`, section headings `font-display font-bold text-[22px]`, body `text-ink-2 leading-[1.7]`, sections separated by `border-t border-line pt-10 mt-10`. The waitlist section gets `id="waitlist-data"`.

- [ ] **Step 3: Verify and commit**

`pnpm typecheck && pnpm build`, visual check of `/en/pricing`, `/pt/pricing`, `/pt/privacy#waitlist-data`, `/en/terms`.

```bash
git add -A
git commit -m "feat(diffuse): reskin pricing, privacy and terms"
```

---

### Task 14: Waitlist submission core (schema, IP hash, submit)

**Files:**
- Create: `lib/waitlist/schema.ts`, `lib/waitlist/hash.ts`, `lib/waitlist/submit.ts`, `lib/waitlist/types.ts`
- Test: `lib/waitlist/schema.test.ts`, `lib/waitlist/hash.test.ts`, `lib/waitlist/submit.test.ts`

**Interfaces:**
- Consumes: `MODES` from `@/lib/modes`; `routing.locales` from `@/i18n/routing`.
- Produces:
  - `types.ts`:
    ```ts
    export type WaitlistErrorCode = 'email_required' | 'email_invalid' | 'email_too_long' | 'name_too_long' | 'mode_required'
    export type WaitlistField = 'email' | 'name' | 'mode'
    export type WaitlistState =
      | { status: 'idle' }
      | { status: 'success' }
      | { status: 'invalid'; fieldErrors: Partial<Record<WaitlistField, WaitlistErrorCode>> }
      | { status: 'rate_limited' }
      | { status: 'error' }
    export interface WaitlistRow {
      email: string; name: string | null; mode: Mode; locale: Locale; notifyLaunch: boolean
      utmSource: string | null; utmMedium: string | null; utmCampaign: string | null; referrer: string | null
    }
    export interface WaitlistDeps {
      join(row: WaitlistRow, ipHash: string | null): Promise<'ok' | 'rate_limited'>
      hashIp(ip: string | null): string | null
    }
    ```
  - `schema.ts`: `waitlistSchema` (zod 3) parsing a plain object to `WaitlistRow`; `formDataToObject(fd: FormData): Record<string, string>`
  - `hash.ts`: `makeIpHasher(salt: string): (ip: string | null) => string | null`
  - `submit.ts`: `submitWaitlist(raw: Record<string, string>, ip: string | null, deps: WaitlistDeps): Promise<WaitlistState>`

- [ ] **Step 1: Failing tests**

`lib/waitlist/schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { waitlistSchema, formDataToObject } from './schema'

const base = { email: 'ana@example.com', mode: 'preg', locale: 'pt' }

describe('waitlistSchema', () => {
  it('normalises email to trimmed lowercase', () => {
    expect(waitlistSchema.parse({ ...base, email: '  Ana@Example.COM ' }).email).toBe('ana@example.com')
  })
  it('maps an empty name to null and trims a real one', () => {
    expect(waitlistSchema.parse({ ...base, name: '   ' }).name).toBeNull()
    expect(waitlistSchema.parse({ ...base, name: '  Ana ' }).name).toBe('Ana')
  })
  it('reads the checkbox', () => {
    expect(waitlistSchema.parse({ ...base, notify_launch: 'on' }).notifyLaunch).toBe(true)
    expect(waitlistSchema.parse(base).notifyLaunch).toBe(false)
  })
  it('falls back to en for an unknown locale', () => {
    expect(waitlistSchema.parse({ ...base, locale: 'de' }).locale).toBe('en')
  })
  it('drops oversized utm values instead of failing', () => {
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
    [{ email: 'ana@example.com', locale: 'pt' }, 'mode', 'mode_required'],
  ])('rejects %j with %s=%s', (input, field, code) => {
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
  it('is deterministic and hex', () => {
    expect(h('1.2.3.4')).toBe(h('1.2.3.4'))
    expect(h('1.2.3.4')).toMatch(/^[0-9a-f]{64}$/)
  })
  it('depends on the salt and never returns the raw ip', () => {
    expect(makeIpHasher('salt-2')('1.2.3.4')).not.toBe(h('1.2.3.4'))
    expect(h('1.2.3.4')).not.toContain('1.2.3.4')
  })
  it('returns null for a missing ip', () => {
    expect(h(null)).toBeNull()
    expect(h('')).toBeNull()
  })
  it('refuses an empty salt', () => {
    expect(() => makeIpHasher('')).toThrow()
  })
})
```

`lib/waitlist/submit.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { submitWaitlist } from './submit'
import type { WaitlistDeps } from './types'

const deps = (result: 'ok' | 'rate_limited' | Error = 'ok') => {
  const join = vi.fn(async () => {
    if (result instanceof Error) throw result
    return result
  })
  return { join, hashIp: vi.fn((ip: string | null) => (ip ? `h(${ip})` : null)) } satisfies WaitlistDeps
}
const valid = { email: ' Ana@Example.com ', name: 'Ana', mode: 'meno', locale: 'pt', notify_launch: 'on', utm_source: 'ig' }

describe('submitWaitlist', () => {
  it('writes a normalised row with the hashed ip and returns success', async () => {
    const d = deps()
    expect(await submitWaitlist(valid, '1.2.3.4', d)).toEqual({ status: 'success' })
    expect(d.join).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@example.com', mode: 'meno', locale: 'pt', notifyLaunch: true, utmSource: 'ig' }),
      'h(1.2.3.4)',
    )
  })
  it('returns success without writing when the honeypot is filled', async () => {
    const d = deps()
    expect(await submitWaitlist({ ...valid, company: 'Acme' }, '1.2.3.4', d)).toEqual({ status: 'success' })
    expect(d.join).not.toHaveBeenCalled()
  })
  it('returns field errors and does not write when invalid', async () => {
    const d = deps()
    expect(await submitWaitlist({ ...valid, email: 'nope', mode: '' }, null, d)).toEqual({
      status: 'invalid',
      fieldErrors: { email: 'email_invalid', mode: 'mode_required' },
    })
    expect(d.join).not.toHaveBeenCalled()
  })
  it('passes rate limiting through', async () => {
    expect(await submitWaitlist(valid, '1.2.3.4', deps('rate_limited'))).toEqual({ status: 'rate_limited' })
  })
  it('turns a storage failure into a generic error and logs without the email', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await submitWaitlist(valid, null, deps(new Error('db down for ana@example.com')))).toEqual({ status: 'error' })
    const logged = JSON.stringify(spy.mock.calls)
    expect(logged).not.toContain('ana@example.com')
    spy.mockRestore()
  })
})
```

Run: `pnpm test lib/waitlist` → FAIL (modules missing).

- [ ] **Step 2: Implement**

`lib/waitlist/types.ts`: exactly the block in **Interfaces** above, with `import type { Mode } from '@/lib/modes'` and `import type { Locale } from '@/i18n/routing'`.

`lib/waitlist/schema.ts`:

```ts
import { z } from 'zod'
import { MODES } from '@/lib/modes'
import { routing } from '@/i18n/routing'
import type { WaitlistRow } from './types'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .catch(undefined)
    .transform((v) => (v ? v : null))

export const waitlistSchema = z
  .object({
    email: z
      .string({ required_error: 'email_required' })
      .trim()
      .toLowerCase()
      .min(1, 'email_required')
      .max(254, 'email_too_long')
      .email('email_invalid'),
    name: z
      .string()
      .trim()
      .max(80, 'name_too_long')
      .optional()
      .transform((v) => (v ? v : null)),
    mode: z.enum(MODES, { errorMap: () => ({ message: 'mode_required' }) }),
    locale: z.enum(routing.locales).catch('en'),
    notify_launch: z
      .string()
      .optional()
      .transform((v) => v === 'on' || v === 'true'),
    utm_source: optionalText(200),
    utm_medium: optionalText(200),
    utm_campaign: optionalText(200),
    referrer: optionalText(200),
  })
  .transform(
    (v): WaitlistRow => ({
      email: v.email,
      name: v.name,
      mode: v.mode,
      locale: v.locale,
      notifyLaunch: v.notify_launch,
      utmSource: v.utm_source,
      utmMedium: v.utm_medium,
      utmCampaign: v.utm_campaign,
      referrer: v.referrer,
    }),
  )

export function formDataToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of fd.entries()) if (typeof v === 'string') out[k] = v
  return out
}
```

Order matters for `email`: `.min(1)` before `.max` before `.email` so an empty string reports `email_required` and a 260-char string reports `email_too_long` (zod 3 reports the first failing check first in `fieldErrors[...][0]`). If the `email_too_long` test reports `email_invalid` first, keep the order and change the test input to a syntactically valid long address (it already is: `aaa…@x.co`).

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
import type { WaitlistDeps, WaitlistErrorCode, WaitlistField, WaitlistState } from './types'

const FIELDS: WaitlistField[] = ['email', 'name', 'mode']

export async function submitWaitlist(
  raw: Record<string, string>,
  ip: string | null,
  deps: WaitlistDeps,
): Promise<WaitlistState> {
  // Honeypot: real people never see or fill this field.
  if (raw.company && raw.company.trim() !== '') return { status: 'success' }

  const parsed = waitlistSchema.safeParse(raw)
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>
    const fieldErrors: Partial<Record<WaitlistField, WaitlistErrorCode>> = {}
    for (const f of FIELDS) {
      const code = flat[f]?.[0]
      if (code) fieldErrors[f] = code as WaitlistErrorCode
    }
    return { status: 'invalid', fieldErrors }
  }

  try {
    const result = await deps.join(parsed.data, deps.hashIp(ip))
    return result === 'rate_limited' ? { status: 'rate_limited' } : { status: 'success' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[waitlist] join failed:', message.replace(/[^\s@]+@[^\s@]+/g, '<email>'))
    return { status: 'error' }
  }
}
```

- [ ] **Step 3: Run tests**

Run: `pnpm test lib/waitlist`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/waitlist
git commit -m "feat(waitlist): validation, IP hashing and submit core with tests"
```

---

### Task 15: Waitlist server action, Supabase client and form

**Files:**
- Create: `lib/waitlist/supabase.ts`, `lib/waitlist/action.ts`
- Create: `components/waitlist-form.tsx`
- Modify: `components/waitlist-faq-section.tsx` (`WaitlistSection` uses the new form)
- Create: `.env.example`
- Modify: `messages/en.json`, `messages/pt.json` (`waitlist` namespace)

**Interfaces:**
- Consumes: `submitWaitlist`, `formDataToObject`, `makeIpHasher`, types (Task 14); `PREFILL_EVENT` (Task 10); kit (Task 9); `MODES` (Task 8).
- Produces: `joinWaitlist(prev: WaitlistState, formData: FormData): Promise<WaitlistState>` server action; `<WaitlistForm />`.

- [ ] **Step 1: Supabase deps (server-only)**

`lib/waitlist/supabase.ts`:

```ts
import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { makeIpHasher } from './hash'
import type { WaitlistDeps } from './types'

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} is not set`)
  return v
}

let cached: WaitlistDeps | null = null

export function waitlistDeps(): WaitlistDeps {
  if (cached) return cached
  const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  cached = {
    hashIp: makeIpHasher(required('WAITLIST_IP_SALT')),
    async join(row, ipHash) {
      const { data, error } = await supabase.rpc('waitlist_join', {
        p_email: row.email,
        p_name: row.name,
        p_mode: row.mode,
        p_locale: row.locale,
        p_notify_launch: row.notifyLaunch,
        p_utm_source: row.utmSource,
        p_utm_medium: row.utmMedium,
        p_utm_campaign: row.utmCampaign,
        p_referrer: row.referrer,
        p_ip_hash: ipHash,
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
# Any long random string; changing it resets rate-limit buckets.
WAITLIST_IP_SALT=
NEXT_PUBLIC_SITE_URL=https://grandma.app
```

Confirm `.gitignore` ignores `.env*.local` (it does in v0 templates; if not, add `.env*.local`).

- [ ] **Step 2: Messages**

Replace the `waitlist` namespace (keep any existing keys Task 6 created only if still used; the form below uses exactly these):

`messages/en.json`:

```json
"waitlist": {
  "aria": "Join the waitlist",
  "eyebrow": "JOIN THE WAITLIST",
  "title": "We'll send your invite the <em>moment</em> it's your turn.",
  "subtitle": "We're rolling out invites slowly — Grandma takes her time to make sure each family feels seen. Leave your email and we'll let you know when you're up.",
  "name": "Your name (optional)",
  "namePlaceholder": "Ana",
  "email": "Email",
  "emailPlaceholder": "you@your-life.com",
  "modeLegend": "I'm in…",
  "modes": { "pre": "Cycle", "preg": "Pregnancy", "kids": "Kids", "meno": "Menopause" },
  "notify": "Also tell me when the iOS and Android apps launch.",
  "submit": "Save my seat",
  "submitting": "Saving…",
  "consent": "By joining you agree that we store your details to send your invite and the launch notice. Nothing else. <link>How we handle your data</link>.",
  "promise": "Pinky promise: no marketing emails. Only your invite, and a single hello.",
  "success": { "title": "You're on the list.", "body": "We'll email you when it's your turn. You can close this page — Grandma will remember." },
  "rateLimited": "Too many tries from this connection. Please try again in an hour.",
  "error": "Something went wrong on our side. Please try again.",
  "retry": "Try again",
  "companyLabel": "Leave this field empty",
  "errors": {
    "email_required": "Please enter your email.",
    "email_invalid": "That email doesn't look right.",
    "email_too_long": "That email is too long.",
    "name_too_long": "Please use 80 characters or fewer.",
    "mode_required": "Pick the chapter you're in."
  }
}
```

`messages/pt.json`:

```json
"waitlist": {
  "aria": "Entrar na lista de espera",
  "eyebrow": "LISTA DE ESPERA",
  "title": "A gente manda o seu convite no <em>momento</em> em que for a sua vez.",
  "subtitle": "Estamos liberando os convites aos poucos — a Vovó não tem pressa, para que cada família se sinta bem cuidada. Deixe o seu email e avisamos quando chegar a sua vez.",
  "name": "Seu nome (opcional)",
  "namePlaceholder": "Ana",
  "email": "Email",
  "emailPlaceholder": "voce@sua-vida.com",
  "modeLegend": "Estou em…",
  "modes": { "pre": "Ciclo", "preg": "Gravidez", "kids": "Filhos", "meno": "Menopausa" },
  "notify": "Também quero saber quando os apps de iOS e Android forem lançados.",
  "submit": "Garantir meu lugar",
  "submitting": "Salvando…",
  "consent": "Ao entrar, você concorda que guardemos os seus dados para enviar o convite e o aviso de lançamento. Nada além disso. <link>Como cuidamos dos seus dados</link>.",
  "promise": "Promessa de dedinho: nada de email de marketing. Só o seu convite e um único olá.",
  "success": { "title": "Você está na lista.", "body": "Vamos mandar um email quando for a sua vez. Pode fechar esta página — a Vovó vai lembrar." },
  "rateLimited": "Muitas tentativas a partir desta conexão. Tente de novo daqui a uma hora.",
  "error": "Algo deu errado do nosso lado. Tente de novo.",
  "retry": "Tentar de novo",
  "companyLabel": "Deixe este campo vazio",
  "errors": {
    "email_required": "Digite o seu email.",
    "email_invalid": "Esse email não parece certo.",
    "email_too_long": "Esse email é longo demais.",
    "name_too_long": "Use até 80 caracteres.",
    "mode_required": "Escolha a fase em que você está."
  }
}
```

Run `pnpm i18n:check`.

- [ ] **Step 3: The form**

`components/waitlist-form.tsx`:

```tsx
'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { joinWaitlist } from '@/lib/waitlist/action'
import { PREFILL_EVENT } from '@/lib/waitlist/prefill'
import type { WaitlistState } from '@/lib/waitlist/types'
import { MODES, type Mode } from '@/lib/modes'
import { ActionRule, Display, Field, HairlineSelect } from '@/components/diffuse'

const INITIAL: WaitlistState = { status: 'idle' }
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'] as const

export function WaitlistForm() {
  const t = useTranslations('waitlist')
  const locale = useLocale()
  const [state, formAction, pending] = useActionState(joinWaitlist, INITIAL)
  const [mode, setMode] = useState<Mode | ''>('')
  const [email, setEmail] = useState('')
  const [utm, setUtm] = useState<Record<string, string>>({})
  const emailRef = useRef<HTMLInputElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  // Campaign attribution from the landing URL + referrer (first touch is kept server-side).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const next: Record<string, string> = {}
    for (const k of UTM_KEYS) {
      const v = p.get(k)
      if (v) next[k] = v
    }
    if (document.referrer && !document.referrer.startsWith(window.location.origin)) next.referrer = document.referrer
    setUtm(next)
  }, [])

  // Email handed over from the hero.
  useEffect(() => {
    const onPrefill = (e: Event) => {
      const value = (e as CustomEvent<string>).detail
      if (value) setEmail(value)
      setTimeout(() => emailRef.current?.focus({ preventScroll: true }), 400)
    }
    window.addEventListener(PREFILL_EVENT, onPrefill)
    return () => window.removeEventListener(PREFILL_EVENT, onPrefill)
  }, [])

  useEffect(() => {
    if (state.status !== 'idle' && state.status !== 'invalid') statusRef.current?.focus()
  }, [state])

  if (state.status === 'success') {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="py-8 text-center outline-none">
        <Display size="lg">{t('success.title')}</Display>
        <p className="mx-auto mt-4 max-w-[440px] text-ink-2">{t('success.body')}</p>
      </div>
    )
  }

  const errs = state.status === 'invalid' ? state.fieldErrors : {}

  return (
    <form action={formAction} noValidate className="mx-auto max-w-[520px] space-y-8">
      <input type="hidden" name="locale" value={locale} />
      {Object.entries(utm).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {/* Honeypot — hidden from people and assistive tech. */}
      <div aria-hidden="true" className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden">
        <label>
          {t('companyLabel')}
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Field
        ref={emailRef}
        label={t('email')}
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder={t('emailPlaceholder')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errs.email ? t(`errors.${errs.email}`) : undefined}
      />
      <Field
        label={t('name')}
        name="name"
        autoComplete="given-name"
        maxLength={80}
        placeholder={t('namePlaceholder')}
        error={errs.name ? t(`errors.${errs.name}`) : undefined}
      />

      <div>
        <HairlineSelect
          name="mode"
          legend={t('modeLegend')}
          value={mode as Mode}
          onChange={setMode}
          options={MODES.map((m) => ({ value: m, label: t(`modes.${m}`), mode: m }))}
        />
        {errs.mode && <p className="mt-2 text-[14px] text-[var(--d-error)]" role="alert">{t(`errors.${errs.mode}`)}</p>}
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-[15px] text-ink-2">
        <input type="checkbox" name="notify_launch" className="mt-1 h-4 w-4 accent-[var(--d-ink)]" />
        {t('notify')}
      </label>

      <div ref={statusRef} tabIndex={-1} className="outline-none" aria-live="polite">
        {state.status === 'rate_limited' && <p className="text-[15px] text-[var(--d-error)]">{t('rateLimited')}</p>}
        {state.status === 'error' && <p className="text-[15px] text-[var(--d-error)]">{t('error')}</p>}
      </div>

      <ActionRule type="submit" pending={pending}>
        {pending ? t('submitting') : state.status === 'error' ? t('retry') : t('submit')}
      </ActionRule>

      <p className="text-[13px] leading-[1.6] text-ink-3">
        {t.rich('consent', {
          link: (c) => (
            <Link href="/privacy#waitlist-data" className="underline underline-offset-2 hover:text-ink">
              {c}
            </Link>
          ),
        })}
      </p>
    </form>
  )
}
```

`Field` must forward refs for `ref={emailRef}`: in `components/diffuse/field.tsx` React 19 passes `ref` as a normal prop, so add `ref` to the destructured props (`{ label, error, id, className = '', ref, ...input }: { label: string; error?: string; ref?: React.Ref<HTMLInputElement> } & InputHTMLAttributes<HTMLInputElement>`) and put `ref={ref}` on the `<input>`.

Note: inputs keep their values after a failed submit because `email` is controlled and the browser keeps uncontrolled `name`; the radio is controlled via `mode`. The form works without JavaScript because it posts through `action={formAction}`.

- [ ] **Step 4: Section uses the form**

Rewrite `WaitlistSection` in `components/waitlist-faq-section.tsx`:

```tsx
export function WaitlistSection() {
  const t = useTranslations('waitlist')
  return (
    <section id="waitlist" aria-label={t('aria')} className="relative overflow-hidden bg-bg-deep px-6 py-20 lg:px-12 lg:py-32">
      <GradientField mode="pre" />
      <div className="relative mx-auto max-w-[880px]">
        <Card size="lg" className="bg-paper-2/90 backdrop-blur-[var(--d-blur-glass)]">
          <div className="mb-10 text-center">
            <MonoLabel>{t('eyebrow')}</MonoLabel>
            <Display size="xl" className="mb-6 mt-4">{t.rich('title', { em: (c) => <Display.Em>{c}</Display.Em> })}</Display>
            <p className="mx-auto max-w-[540px] text-ink-2">{t('subtitle')}</p>
          </div>
          <WaitlistForm />
          <p className="mt-8 text-center font-display italic text-ink-3">{t('promise')}</p>
        </Card>
      </div>
    </section>
  )
}
```

with imports `GradientField, Card, MonoLabel, Display` from `@/components/diffuse` and `WaitlistForm` from `./waitlist-form`. Remove the old state, `handleSubmit`, sticker imports that are no longer used, and the old `stageColors`.

- [ ] **Step 5: Local end-to-end**

Create `.env.local` with the real `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase dashboard → Project Settings → API), and a random `WAITLIST_IP_SALT` (`openssl rand -hex 32`). Then `pnpm dev` and on `/pt?utm_source=qa`:

1. Submit with an empty form → email and mode errors in Portuguese; nothing written.
2. Submit `QA-Site@Example.com`, mode Menopausa, notify on → success panel.
3. Reload, submit `qa-site@example.com` with mode Filhos → success again.
4. In the command center `/waitlist` (or SQL): exactly one row `qa-site@example.com`, `mode = kids`, `locale = pt`, `utm_source = qa`, `created_at` from step 2.
5. Hero: type an email, press Enter → page scrolls to the form with the email filled.
6. DevTools → disable JavaScript → reload → submit a new email → success page renders (server-rendered result).
7. Check the client bundle has no secret: `grep -r "SERVICE_ROLE\|service_role" .next/static || echo clean` → `clean`.

Delete QA rows afterwards: `delete from public.waitlist where email like 'qa-site%';`.

- [ ] **Step 6: Checks and commit**

```bash
pnpm test && pnpm i18n:check && pnpm typecheck && pnpm build
git add -A
git commit -m "feat(waitlist): server action to Supabase, Diffuse waitlist form with hero prefill"
```

---

### Task 16: Cleanup, OG images and final verification

**Files:**
- Modify: `app/globals.css` (delete legacy aliases and old component classes)
- Modify: any component still using legacy names
- Create: `app/[locale]/opengraph-image.tsx`
- Modify: `app/[locale]/layout.tsx` (no hardcoded `bg-[#F4F1E8]`; use `bg-paper`)
- Modify: `next.config.mjs` (only if typecheck is clean — see Step 3)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Remove legacy tokens**

Find remaining uses:

```bash
grep -rnE "var\(--(bg|bg-warm|surface|surface-raised|border|border-light|border-strong|ink|ink-secondary|ink-muted|ink-faint|primary|primary-light|primary-dark|secondary|rose|rose-soft|lavender|lavender-soft|blue-powder|blue-powder-soft|r-(sm|md|lg|xl|xxl|full)|shadow-card|shadow-card-hover|shadow-stamp|shadow-stamp-press|font-fraunces|font-dm-sans|font-instrument-serif|font-display|font-italic|font-body)\)" components app --include=*.tsx
grep -rnE "\b(eyebrow|btn-primary|btn-secondary|card-paper|input-field|chip(-rose|-lavender|-blue)?|sticker-shadow)\b" components app --include=*.tsx
```

Migrate every hit with the Task 10 map (leave `components/ui/*` alone — they use the shadcn compatibility vars). When both commands print nothing, delete the `LEGACY ALIASES` block from `:root` and the `.eyebrow`, `.btn-primary`, `.btn-secondary`, `.card-paper`, `.input-field`, `.chip*`, `.sticker-shadow` rules from `app/globals.css`. Re-run both greps → empty. Also delete `styles/globals.css` if nothing imports it (`grep -rn "styles/globals" .` → no matches).

- [ ] **Step 2: Open Graph image per locale**

`app/[locale]/opengraph-image.tsx`:

```tsx
import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'
import { FIELDS } from '@/lib/modes'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OG({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  const f = FIELDS.preg
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          padding: 72, background: `radial-gradient(circle at 15% 20%, ${f.g1}, transparent 55%), radial-gradient(circle at 85% 15%, ${f.g2}, transparent 55%), radial-gradient(circle at 30% 90%, ${f.g3}, transparent 55%), radial-gradient(circle at 90% 85%, ${f.g4}, transparent 55%), #F4F1E8`,
          color: '#1A1916',
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 6, textTransform: 'uppercase' }}>grandma.app</div>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05, marginTop: 16, maxWidth: 960 }}>{t('ogTitle')}</div>
      </div>
    ),
    size,
  )
}
```

Remove any leftover `images: ['/og-image.png']` reference. Verify: `curl -sI http://localhost:3000/pt/opengraph-image | head -3` → `200` and `content-type: image/png`.

- [ ] **Step 3: Typecheck gate**

Run `pnpm typecheck`. If it reports zero errors, set `ignoreBuildErrors: false` in `next.config.mjs` so future type errors fail the build. If it reports errors only in `components/ui/*` (pre-existing v0 scaffolding), leave `ignoreBuildErrors: true` and list the count in the PR description. Errors in any file this plan touched must be fixed.

- [ ] **Step 4: Final verification**

```bash
pnpm test && pnpm i18n:check && pnpm typecheck && pnpm build
```

Then with `pnpm start`:
- Screenshots at 390, 768 and 1280 px of `/en`, `/pt`, `/en/pricing`, `/pt/pricing` (DevTools device toolbar or Playwright). Compare against `APP/docs/design/design-system-v3.html`. No horizontal scroll at 390; no old fonts (DevTools → Rendered fonts shows only Hanken Grotesk and Space Mono).
- Lighthouse (mobile) on `/pt`: Accessibility ≥ 95; no contrast failures on text over gradient fields (if any, raise the field's `opacity` down or the text to `text-ink`).
- `curl -s http://localhost:3000/en/dev/diffuse | grep -o 'noindex'` → `noindex`.
- Repeat Task 15 Step 5 items 2–4 once more against the production build.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(diffuse): remove legacy tokens and classes; localized OG images"
```

- [ ] **Step 6: Hand-off checklist for Igor (no code)**

Report, with the evidence from Step 4:
1. pt-BR copy is ready for review in `messages/pt.json` (including the "built on Claude" FAQ answer, which was translated as-is).
2. Vercel env vars to add on the site project: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WAITLIST_IP_SALT`, `NEXT_PUBLIC_SITE_URL`.
3. Two branches to open PRs for: `feat/waitlist-pillar` (CC) and `feat/waitlist-diffuse-i18n` (site). The CC migration is already applied (Task 1); merge CC first.
