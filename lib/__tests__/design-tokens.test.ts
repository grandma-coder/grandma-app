import { describe, it, expect } from "vitest"
import { cssVarsExport, jsonExport, brand } from "../design-tokens"

describe("design-tokens exports", () => {
  it("cssVarsExport emits a :root block with the primary color", () => {
    const css = cssVarsExport()
    expect(css).toContain(":root {")
    expect(css).toContain("--gm-primary: #7048B8;")
    expect(css).toContain("--gm-radius-full: 999px;")
  })

  it("jsonExport is valid JSON with the primary color and radius", () => {
    const parsed = JSON.parse(jsonExport())
    expect(parsed.colors.primary).toBe("#7048B8")
    expect(parsed.radius.full).toBe(999)
    expect(parsed.spacing.md).toBe(16)
  })

  it("brand group carries the three mode colors", () => {
    const names = brand.swatches.map((s) => s.name)
    expect(names).toContain("prePregnancy")
    expect(names).toContain("pregnancy")
    expect(names).toContain("kids")
  })
})
