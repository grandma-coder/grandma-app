import { describe, it, expect, vi, beforeEach } from "vitest"
import type { TRPCError } from "@trpc/server"

const { execute } = vi.hoisted(() => ({ execute: vi.fn<(q: unknown) => Promise<unknown[]>>(async () => []) }))
vi.mock("@/db", () => ({ db: { execute } }))
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn(async () => true) }))

import { geoRouter } from "../routers/geo"
import { opsRouter } from "../routers/ops"
import type { Context } from "../context"

const ctx = (p: Partial<Context>): Context => ({ userId: null, userEmail: null, role: null, allowed: false, ...p })
const viewer = ctx({ userId: "v", userEmail: "v@grandma.app", role: "viewer", allowed: true })
const admin = ctx({ userId: "a", userEmail: "a@grandma.app", role: "admin", allowed: true })
const nobody = ctx({ userId: "x", userEmail: "x@else.com", allowed: false })

// The SQL text of a drizzle sql`` object (its literal chunks), to answer by query.
const textOf = (q: unknown): string => {
  const chunks = (q as { queryChunks?: unknown[] })?.queryChunks ?? []
  return chunks.map((c) => (c && typeof c === "object" && "value" in c ? (c as { value: string[] }).value.join("") : c && typeof c === "object" && "queryChunks" in c ? textOf(c) : "")).join(" ")
}
function answer(match: (q: string) => unknown[] | undefined) {
  execute.mockImplementation(async (q: unknown) => match(textOf(q)) ?? [])
}

beforeEach(() => execute.mockReset())

describe("geo router", () => {
  it("is closed to people outside the team", async () => {
    await expect(geoRouter.createCaller(nobody).overview()).rejects.toMatchObject({ code: "UNAUTHORIZED" } as Partial<TRPCError>)
  })

  it("overview merges waitlist and app countries and reports whether place columns exist", async () => {
    answer((q) => {
      if (q.includes("information_schema")) return [{ ok: false }]
      if (q.includes("from public.waitlist group by 1")) return [{ key: "BR", n: 40 }, { key: "OTHER", n: 2 }]
      if (q.includes("upper(country_code) as key")) return [{ key: "BR", n: 3 }, { key: "PT", n: 1 }]
      if (q.includes("app_unknown")) return [{ waitlist: 42, waitlist_7d: 9, app: 6, app_7d: 1, app_unknown: 2 }]
    })
    const o = await geoRouter.createCaller(viewer).overview()
    expect(o.countries[0]).toEqual({ key: "BR", waitlist: 40, app: 3 })
    expect(o.totals).toEqual({ waitlist: 42, waitlist7d: 9, app: 6, app7d: 1, appUnknown: 2 })
    expect(o.placeReady).toBe(false)
  })

  it("country folds small cities for viewers but not for admins", async () => {
    answer((q) => {
      if (q.includes("information_schema")) return [{ ok: true }]
      if (q.includes("w.city, w.region")) return [{ city: "São Paulo", region: "SP", n: 7 }, { city: "Lages", region: "SC", n: 1 }, { city: "Ilhéus", region: "BA", n: 2 }]
    })
    const v = await geoRouter.createCaller(viewer).country({ country: "BR" })
    expect(v.cities).toEqual([{ city: "São Paulo", region: "SP", n: 7, places: 1 }, { city: null, region: null, n: 3, places: 2 }])
    const a = await geoRouter.createCaller(admin).country({ country: "BR" })
    expect(a.cities).toHaveLength(3)
  })

  it("people is admin-only and audited", async () => {
    await expect(geoRouter.createCaller(viewer).people({ country: "BR" })).rejects.toMatchObject({ code: "FORBIDDEN" } as Partial<TRPCError>)
    answer((q) => (q.includes("information_schema") ? [{ ok: true }] : undefined))
    const { writeAudit } = await import("@/lib/audit")
    const p = await geoRouter.createCaller(admin).people({ country: "BR", region: "SP" })
    expect(p.narrowed).toBe(true)
    expect(p.app).toEqual([])
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "geo.people", meta: { country: "BR", region: "SP" } }))
  })

  it("rejects malformed places", async () => {
    const c = geoRouter.createCaller(admin)
    await expect(c.country({ country: "br" })).rejects.toMatchObject({ code: "BAD_REQUEST" } as Partial<TRPCError>)
    await expect(c.people({ country: "BR", region: "S-P" })).rejects.toMatchObject({ code: "BAD_REQUEST" } as Partial<TRPCError>)
  })
})

describe("ops router", () => {
  it("returns every count, and null only for the one that failed", async () => {
    execute.mockImplementation(async (q: unknown) => {
      if (textOf(q).includes("content_reports")) throw new Error("relation does not exist")
      return [{ n: 4 }]
    })
    const a = await opsRouter.createCaller(viewer).attention()
    expect(a).toMatchObject({ support: 4, reports: null, waitlistToday: 4, waitlistPending: 4, newUsers7d: 4, newWaitlist7d: 4 })
  })
})
