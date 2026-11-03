import { describe, it, expect } from "vitest"
import { matchScore, fold } from "@/lib/palette"
import { navFor } from "@/components/nav"

describe("matchScore", () => {
  it("matches without accents or case", () => {
    expect(fold("Usuários")).toBe("usuarios")
    expect(matchScore("usuarios", "Usuários Público /users")).toBeGreaterThan(0)
  })
  it("prefers a word start, needs every word", () => {
    expect(matchScore("map", "Mapa Público /map")).toBeGreaterThan(matchScore("apa", "Mapa Público /map"))
    expect(matchScore("mapa push", "Mapa Público /map")).toBe(0)
    expect(matchScore("", "anything")).toBe(1)
  })
})

describe("navFor", () => {
  it("hides admin pages from viewers", () => {
    const viewer = navFor(false).map((i) => i.href)
    const admin = navFor(true).map((i) => i.href)
    expect(viewer).toContain("/map")
    expect(viewer).not.toContain("/admin")
    expect(viewer).not.toContain("/sentry")
    expect(admin).toEqual(expect.arrayContaining(["/admin", "/sentry", "/beta", "/graph"]))
  })
})
