import { describe, it, expect } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core"
import { waitlistFilterSchema, buildWaitlistWhere, toCsv, type WaitlistRowOut } from "../waitlist"

const dialect = new PgDialect()
const render = (f: unknown) => dialect.sqlToQuery(buildWaitlistWhere(waitlistFilterSchema.parse(f)))

describe("waitlistFilterSchema", () => {
  it("defaults invited to all", () => expect(waitlistFilterSchema.parse({}).invited).toBe("all"))
  it("rejects unknown mode", () => expect(() => waitlistFilterSchema.parse({ mode: "care" })).toThrow())
  it("accepts any uppercase ISO code and OTHER", () => {
    for (const c of ["FR", "BR", "DE", "OTHER"]) expect(waitlistFilterSchema.parse({ country: c }).country).toBe(c)
  })
  it("rejects malformed country", () => {
    for (const c of ["fr", "BRA", "", "F", "F1", "other"]) expect(() => waitlistFilterSchema.parse({ country: c })).toThrow()
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
