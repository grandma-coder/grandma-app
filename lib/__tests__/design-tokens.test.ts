import { describe, it, expect } from "vitest"
import { cssVarsExport, jsonExport, diffuseFields, stickers } from "../design-tokens"

describe("diffuse design-tokens exports", () => {
  it("cssVarsExport emits a :root block with a Diffuse neutral + field accent", () => {
    const css = cssVarsExport()
    expect(css).toContain(":root {")
    expect(css).toContain("--d-bg: #F4F1E8;")
    expect(css).toContain("--d-r-lg: 28px;")
    expect(css).toContain("field-preg-accent")
  })

  it("jsonExport is valid JSON with neutrals, fields and radius", () => {
    const parsed = JSON.parse(jsonExport())
    expect(parsed.neutrals.bg).toBe("#F4F1E8")
    expect(parsed.fields.preg.accent).toBe("#8F5FC6")
    expect(parsed.radius.lg).toBe(28)
  })

  it("has all four behavior fields with 4 gradient stops each", () => {
    expect(diffuseFields.map((f) => f.key)).toEqual(["pre", "preg", "kids", "care"])
    for (const f of diffuseFields) {
      expect([f.g1, f.g2, f.g3, f.g4].every((c) => /^#[0-9A-Fa-f]{6}$/.test(c))).toBe(true)
    }
  })

  it("stickers carry real SVG path data", () => {
    expect(stickers.length).toBeGreaterThan(8)
    expect(stickers.find((s) => s.name === "Heart")?.paths[0]).toContain("M50,88")
  })
})
