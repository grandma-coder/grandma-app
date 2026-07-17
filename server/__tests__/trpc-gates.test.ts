import { describe, it, expect } from "vitest"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure, adminProcedure, piiProcedure } from "../trpc"
import type { Context } from "../context"

// A tiny router exercising each gate, so we can assert the middleware behavior
// without a real Clerk session.
const testRouter = router({
  viewerOk: protectedProcedure.query(() => "ok"),
  adminOnly: adminProcedure.query(() => "ok"),
  piiOnly: piiProcedure.query(() => "ok"),
})

function ctx(partial: Partial<Context>): Context {
  return { userId: null, userEmail: null, role: null, allowed: false, ...partial }
}

async function call(ctxValue: Context, proc: "viewerOk" | "adminOnly" | "piiOnly") {
  const caller = testRouter.createCaller(ctxValue)
  return caller[proc]()
}

describe("tRPC role gates", () => {
  const admin = ctx({ userId: "u1", userEmail: "a@grandma.app", role: "admin", allowed: true })
  const viewer = ctx({ userId: "u2", userEmail: "v@grandma.app", role: "viewer", allowed: true })
  const stranger = ctx({ userId: "u3", userEmail: "x@example.com", role: null, allowed: false })

  it("admin passes every gate", async () => {
    await expect(call(admin, "viewerOk")).resolves.toBe("ok")
    await expect(call(admin, "adminOnly")).resolves.toBe("ok")
    await expect(call(admin, "piiOnly")).resolves.toBe("ok")
  })

  it("viewer passes protected but is FORBIDDEN on admin/pii", async () => {
    await expect(call(viewer, "viewerOk")).resolves.toBe("ok")
    await expect(call(viewer, "adminOnly")).rejects.toMatchObject({ code: "FORBIDDEN" } as Partial<TRPCError>)
    await expect(call(viewer, "piiOnly")).rejects.toMatchObject({ code: "FORBIDDEN" } as Partial<TRPCError>)
  })

  it("non-allowlisted user is UNAUTHORIZED even on protected", async () => {
    await expect(call(stranger, "viewerOk")).rejects.toMatchObject({ code: "UNAUTHORIZED" } as Partial<TRPCError>)
    await expect(call(stranger, "adminOnly")).rejects.toMatchObject({ code: "UNAUTHORIZED" } as Partial<TRPCError>)
  })
})
