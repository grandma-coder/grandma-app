import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the db module so we test writeAudit's contract (calls insert, never
// throws on failure) without a live connection.
const insertValues = vi.fn()
vi.mock("@/db", () => ({
  db: { insert: () => ({ values: insertValues }) },
}))

import { writeAudit } from "../audit"

describe("writeAudit", () => {
  beforeEach(() => {
    insertValues.mockReset()
  })

  it("inserts a row and returns true on success", async () => {
    insertValues.mockResolvedValueOnce(undefined)
    const ok = await writeAudit({ actorEmail: "a@grandma.app", action: "user.detail.view", target: "u1" })
    expect(ok).toBe(true)
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ actorEmail: "a@grandma.app", action: "user.detail.view", target: "u1" }),
    )
  })

  it("never throws and returns false when the write fails", async () => {
    insertValues.mockRejectedValueOnce(new Error("db down"))
    const ok = await writeAudit({ actorEmail: "a@grandma.app", action: "push.send" })
    expect(ok).toBe(false)
  })
})
