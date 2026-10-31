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
