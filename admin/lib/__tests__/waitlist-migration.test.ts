import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Text checks on migrations/0018_waitlist.sql (no database here; scripts/verify-waitlist.mjs is the live check).
const sql = readFileSync(join(process.cwd(), "migrations/0018_waitlist.sql"), "utf8")
const fn = sql.slice(sql.indexOf("CREATE OR REPLACE FUNCTION public.waitlist_join"), sql.indexOf("REVOKE ALL"))

describe("0018 waitlist_join rate limit", () => {
  it("counts every row the ip_hash touched in the last hour, re-joins included", () => {
    expect(fn).toMatch(/WHERE ip_hash = p_ip_hash AND greatest\(created_at, updated_at\) > now\(\) - interval '1 hour'/)
    expect(fn).toMatch(/\) >= 5 THEN\s+RETURN 'rate_limited';/)
  })
  it("re-joins stamp the row with the caller's ip_hash and bump updated_at; name is kept when omitted", () => {
    const upsert = fn.slice(fn.indexOf("ON CONFLICT (email) DO UPDATE SET"))
    expect(upsert).toContain("ip_hash       = excluded.ip_hash")
    expect(upsert).toContain("updated_at    = now()")
    expect(upsert).toContain("name          = coalesce(excluded.name, waitlist.name)")
  })
  it("keeps the RPC locked down", () => {
    expect(fn).toContain("SECURITY INVOKER")
    expect(fn).toContain("SET search_path = public")
    expect(sql).toContain("ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;")
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.waitlist_join\(text,text,text,text,text,boolean,text,text,text,text,text\) FROM PUBLIC, anon, authenticated;/)
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.waitlist_join\(text,text,text,text,text,boolean,text,text,text,text,text\) TO service_role;/)
  })
})

// 0019 replaces the function; the same guarantees must hold there.
const sql19 = readFileSync(join(process.cwd(), "migrations/0019_waitlist_place.sql"), "utf8")
const fn19 = sql19.slice(sql19.indexOf("CREATE OR REPLACE FUNCTION public.waitlist_join"), sql19.indexOf("REVOKE ALL"))
const SIG13 = "text,text,text,text,text,boolean,text,text,text,text,text,text,text"

describe("0019 waitlist place", () => {
  it("adds nullable region and city with checks", () => {
    expect(sql19).toMatch(/ADD COLUMN IF NOT EXISTS region TEXT CHECK \(region IS NULL OR region ~ '\^\[A-Z0-9\]\{1,3\}\$'\)/)
    expect(sql19).toMatch(/ADD COLUMN IF NOT EXISTS city +TEXT CHECK \(city IS NULL OR length\(city\) BETWEEN 1 AND 80\)/)
  })
  it("drops the 11-argument version so old callers resolve to the new one without ambiguity", () => {
    expect(sql19.indexOf("DROP FUNCTION IF EXISTS public.waitlist_join(text,text,text,text,text,boolean,text,text,text,text,text);")).toBeLessThan(sql19.indexOf("CREATE OR REPLACE FUNCTION"))
    expect(fn19).toContain("p_region text DEFAULT NULL, p_city text DEFAULT NULL")
  })
  it("keeps the 0018 rate limit, upsert rules and lockdown", () => {
    expect(fn19).toMatch(/WHERE ip_hash = p_ip_hash AND greatest\(created_at, updated_at\) > now\(\) - interval '1 hour'/)
    expect(fn19).toMatch(/\) >= 5 THEN\s+RETURN 'rate_limited';/)
    expect(fn19).toContain("name          = coalesce(excluded.name, waitlist.name)")
    expect(fn19).toContain("ip_hash       = excluded.ip_hash")
    expect(fn19).toContain("SECURITY INVOKER")
    expect(fn19).toContain("SET search_path = public")
    expect(sql19).toContain(`REVOKE ALL ON FUNCTION public.waitlist_join(${SIG13}) FROM PUBLIC, anon, authenticated;`)
    expect(sql19).toContain(`GRANT EXECUTE ON FUNCTION public.waitlist_join(${SIG13}) TO service_role;`)
  })
})
