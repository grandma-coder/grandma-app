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
