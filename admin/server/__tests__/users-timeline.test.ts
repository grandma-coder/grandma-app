import { describe, it, expect, vi, beforeEach } from "vitest"
import type { TRPCError } from "@trpc/server"

const execute = vi.fn(async (): Promise<unknown[]> => [])
vi.mock("@/db", () => ({ db: { execute: (...a: unknown[]) => execute(...(a as [])) } }))
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn(async () => true) }))

import { usersRouter } from "../routers/users"
import type { Context } from "../context"

const ctx = (p: Partial<Context>): Context => ({ userId: null, userEmail: null, role: null, allowed: false, ...p })
const viewer = ctx({ userId: "v", userEmail: "v@grandma.app", role: "viewer", allowed: true })
const admin = ctx({ userId: "a", userEmail: "a@grandma.app", role: "admin", allowed: true })
const USER = "00000000-0000-4000-8000-000000000001"
const FORBIDDEN = { code: "FORBIDDEN" } as Partial<TRPCError>
const BAD_REQUEST = { code: "BAD_REQUEST" } as Partial<TRPCError>

const ev = (n: number, kind = "cycle_log", detail: string | null = null) => ({
  at: `2026-11-0${n}T10:00:00.000000Z`,
  kind,
  detail,
})

beforeEach(() => execute.mockReset().mockResolvedValue([]))

describe("users.timeline", () => {
  it("is admin-only (viewer FORBIDDEN, anonymous UNAUTHORIZED)", async () => {
    await expect(usersRouter.createCaller(viewer).timeline({ userId: USER })).rejects.toMatchObject(FORBIDDEN)
    await expect(usersRouter.createCaller(ctx({})).timeline({ userId: USER })).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("validates limit (max 200) and the ISO cursor", async () => {
    const c = usersRouter.createCaller(admin)
    await expect(c.timeline({ userId: USER, limit: 201 })).rejects.toMatchObject(BAD_REQUEST)
    await expect(c.timeline({ userId: USER, before: "yesterday" })).rejects.toMatchObject(BAD_REQUEST)
    await expect(c.timeline({ userId: USER, before: "2026-11-03T10:00:00.123456Z" })).resolves.toEqual({ events: [], nextBefore: null })
  })

  it("writes a user.timeline audit row", async () => {
    const { writeAudit } = await import("@/lib/audit")
    await usersRouter.createCaller(admin).timeline({ userId: USER, limit: 10 })
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "user.timeline", target: USER, actorEmail: "a@grandma.app" }))
  })

  it("returns a full page + cursor when there is more, null cursor at the end", async () => {
    // The query asks for limit+1 rows; an extra row means another page exists.
    execute.mockResolvedValueOnce([ev(5), ev(4), ev(3)])
    const more = await usersRouter.createCaller(admin).timeline({ userId: USER, limit: 2 })
    expect(more.events).toHaveLength(2)
    expect(more.nextBefore).toBe(ev(4).at)

    execute.mockResolvedValueOnce([ev(3)])
    const last = await usersRouter.createCaller(admin).timeline({ userId: USER, limit: 2, before: more.nextBefore! })
    expect(last).toEqual({ events: [ev(3)], nextBefore: null })
  })

  it("normalizes behavior types on phase_started events", async () => {
    execute.mockResolvedValueOnce([ev(2, "phase_started", "cycle"), ev(1, "child_added", "Ana")])
    const r = await usersRouter.createCaller(admin).timeline({ userId: USER })
    expect(r.events.map((e) => e.detail)).toEqual(["pre_pregnancy", "Ana"])
  })
})

describe("users 360 tab procedures", () => {
  it("family / community / devices are admin-only", async () => {
    const c = usersRouter.createCaller(viewer)
    await expect(c.family({ userId: USER })).rejects.toMatchObject(FORBIDDEN)
    await expect(c.community({ userId: USER })).rejects.toMatchObject(FORBIDDEN)
    await expect(c.devices({ userId: USER })).rejects.toMatchObject(FORBIDDEN)
  })

  it("each audits its own action", async () => {
    const { writeAudit } = await import("@/lib/audit")
    const c = usersRouter.createCaller(admin)
    await c.family({ userId: USER })
    await c.community({ userId: USER })
    await c.devices({ userId: USER })
    for (const action of ["user.family.view", "user.community.view", "user.devices.view"]) {
      expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action, target: USER }))
    }
  })

  it("devices still returns when the push-history read fails", async () => {
    execute
      .mockResolvedValueOnce([{ id: "t1", platform: "ios", device_name: "iPhone", is_active: true, last_seen_at: null, created_at: null }])
      .mockRejectedValueOnce(new Error("relation push_recipients does not exist"))
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const r = await usersRouter.createCaller(admin).devices({ userId: USER })
    spy.mockRestore()
    expect(r.devices).toEqual([{ id: "t1", platform: "ios", deviceName: "iPhone", isActive: true, lastSeenAt: null, createdAt: null }])
    expect(r.pushes).toBeNull()
  })
})
