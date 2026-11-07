import { describe, it, expect } from "vitest"
import {
  parseTab,
  daysSince,
  lifecycle,
  initials,
  flagEmoji,
  countryName,
  dayKey,
  groupByDay,
  relativeDay,
  childAge,
  pregnancyProgress,
} from "@/app/(app)/users/[id]/user360"

describe("parseTab", () => {
  it("accepts known tabs and falls back to overview", () => {
    expect(parseTab("activity")).toBe("activity")
    expect(parseTab(["devices", "x"])).toBe("devices")
    expect(parseTab("nope")).toBe("overview")
    expect(parseTab(undefined)).toBe("overview")
  })
})

describe("lifecycle", () => {
  const now = Date.parse("2026-11-03T12:00:00Z")
  it("buckets by days since last activity", () => {
    expect(lifecycle(daysSince("2026-11-03T08:00:00Z", now)).key).toBe("active")
    expect(lifecycle(6).key).toBe("active")
    expect(lifecycle(7).key).toBe("dormant")
    expect(lifecycle(29).key).toBe("dormant")
    expect(lifecycle(30).key).toBe("atRisk")
    expect(lifecycle(59).key).toBe("atRisk")
    expect(lifecycle(60)).toEqual({ key: "churned", cls: "pill-danger" })
  })
  it("treats missing / invalid / epoch as no activity", () => {
    expect(daysSince(null, now)).toBeNull()
    expect(daysSince("garbage", now)).toBeNull()
    expect(daysSince("1970-01-01T00:00:00Z", now)).toBeNull()
    expect(lifecycle(null).key).toBe("none")
  })
})

describe("initials", () => {
  it("uses the name, then the email", () => {
    expect(initials("Ana Maria Souza", null)).toBe("AM")
    expect(initials(null, "joao.silva@x.com")).toBe("JS")
    expect(initials("", "")).toBe("?")
  })
})

describe("country", () => {
  it("builds a flag emoji from a 2-letter code", () => {
    expect(flagEmoji("BR")).toBe("🇧🇷")
    expect(flagEmoji("us")).toBe("🇺🇸")
    expect(flagEmoji("BRA")).toBe("")
    expect(flagEmoji(null)).toBe("")
  })
  it("localizes the name and falls back to the code", () => {
    expect(countryName("BR", "pt-BR")).toBe("Brasil")
    expect(countryName("br", "en")).toBe("Brazil")
    expect(countryName("12", "en")).toBe("12")
    expect(countryName(null, "en")).toBeNull()
  })
})

describe("timeline grouping", () => {
  const events = [
    { at: "2026-11-03T10:00:00.000000Z", kind: "a" },
    { at: "2026-11-03T01:00:00.000000Z", kind: "b" },
    { at: "2026-11-02T23:30:00.000000Z", kind: "c" },
    { at: "2026-10-30T12:00:00.000000Z", kind: "d" },
  ]
  it("groups consecutive events by UTC day, keeping order", () => {
    const g = groupByDay(events, "UTC")
    expect(g.map((x) => x.day)).toEqual(["2026-11-03", "2026-11-02", "2026-10-30"])
    expect(g[0].events.map((e) => e.kind)).toEqual(["a", "b"])
  })
  it("respects the viewer's time zone", () => {
    // 01:00Z and 23:30Z the day before are both Nov 2 in São Paulo (UTC−3).
    const g = groupByDay(events, "America/Sao_Paulo")
    expect(g.map((x) => [x.day, x.events.length])).toEqual([
      ["2026-11-03", 1],
      ["2026-11-02", 2],
      ["2026-10-30", 1],
    ])
    expect(dayKey("2026-11-03T01:00:00Z", "America/Sao_Paulo")).toBe("2026-11-02")
  })
  it("returns no groups for no events", () => expect(groupByDay([], "UTC")).toEqual([]))
  it("labels today / yesterday, across month boundaries", () => {
    expect(relativeDay("2026-11-03", "2026-11-03")).toBe("today")
    expect(relativeDay("2026-10-31", "2026-11-01")).toBe("yesterday")
    expect(relativeDay("2026-10-30", "2026-11-01")).toBeNull()
  })
})

describe("family", () => {
  const now = new Date(2026, 10, 3) // 3 Nov 2026, local
  it("computes child age in years + months", () => {
    expect(childAge("2024-08-15", now)).toEqual({ years: 2, months: 2 })
    expect(childAge("2024-11-03", now)).toEqual({ years: 2, months: 0 })
    expect(childAge("2024-11-04", now)).toEqual({ years: 1, months: 11 })
    expect(childAge("2026-10-20", now)).toEqual({ years: 0, months: 0 })
    expect(childAge("2027-01-01", now)).toBeNull()
    expect(childAge(null, now)).toBeNull()
  })
  it("derives gestational week and days left from the due date", () => {
    expect(pregnancyProgress("2026-11-03", now)).toEqual({ week: 40, daysLeft: 0 })
    expect(pregnancyProgress("2027-02-09", now)).toEqual({ week: 26, daysLeft: 98 })
    expect(pregnancyProgress("2026-10-27", now)).toEqual({ week: 41, daysLeft: -7 })
    expect(pregnancyProgress("2026-09-01", now)).toBeNull()
    expect(pregnancyProgress(null, now)).toBeNull()
  })
})
