import { describe, it, expect } from "vitest"
import { ratePct, wowPct, gapFillDaily, computeFunnelStages } from "../transforms"

describe("ratePct", () => {
  it("returns null on zero denominator", () => expect(ratePct(3, 0)).toBeNull())
  it("computes a percentage to 1 decimal", () => expect(ratePct(1, 3)).toBe(33.3))
})

describe("wowPct", () => {
  it("returns null when prior is 0", () => expect(wowPct(10, 0)).toBeNull())
  it("computes delta %", () => expect(wowPct(120, 100)).toBe(20))
  it("handles decline", () => expect(wowPct(80, 100)).toBe(-20))
})

describe("gapFillDaily", () => {
  it("fills missing days with zeros so charts have no holes", () => {
    const rows = [
      { day: "2026-07-01", dau: 5, newSignups: 2 },
      { day: "2026-07-03", dau: 7, newSignups: 0 },
    ]
    const out = gapFillDaily(rows, "2026-07-01", "2026-07-03")
    expect(out.map((r) => r.dau)).toEqual([5, 0, 7])
    expect(out).toHaveLength(3)
    expect(out[1]).toEqual({ day: "2026-07-02", dau: 0, newSignups: 0 })
  })
})

describe("computeFunnelStages", () => {
  it("attaches step and overall conversion %", () => {
    const out = computeFunnelStages([
      { stage: "signed_up", count: 100 },
      { stage: "onboarded", count: 50 },
      { stage: "activated", count: 25 },
    ])
    expect(out[0]).toMatchObject({ stepPct: 100, overallPct: 100 })
    expect(out[1]).toMatchObject({ stepPct: 50, overallPct: 50 })
    expect(out[2]).toMatchObject({ stepPct: 50, overallPct: 25 })
  })
  it("clamps divide-by-zero to null", () => {
    const out = computeFunnelStages([
      { stage: "signed_up", count: 0 },
      { stage: "onboarded", count: 0 },
    ])
    expect(out[1].stepPct).toBeNull()
    expect(out[1].overallPct).toBeNull()
  })
})
