import { describe, it, expect } from "vitest"
import { intensity, mergeCounts, foldSmall, flag, countryName, countOf } from "@/lib/geo"
import world from "@/lib/geo/world-paths.json"
import br from "@/lib/geo/br-paths.json"

describe("intensity", () => {
  it("is 0 for nobody and 1 for the biggest", () => {
    expect(intensity(0, 40)).toBe(0)
    expect(intensity(40, 40)).toBe(1)
    expect(intensity(5, 0)).toBe(0)
  })
  it("square-root scales and keeps one person visible", () => {
    expect(intensity(10, 40)).toBeCloseTo(0.5)
    expect(intensity(1, 10_000)).toBe(0.12)
  })
})

describe("mergeCounts", () => {
  it("joins both sources by uppercased key, biggest total first", () => {
    const rows = mergeCounts([{ key: "BR", n: 40 }, { key: "PT", n: 2 }], [{ key: "br", n: 3 }, { key: "US", n: 5 }])
    expect(rows).toEqual([
      { key: "BR", waitlist: 40, app: 3 },
      { key: "US", waitlist: 0, app: 5 },
      { key: "PT", waitlist: 2, app: 0 },
    ])
    expect(countOf(rows[0], "waitlist")).toBe(40)
    expect(countOf(rows[0], "app")).toBe(3)
    expect(countOf(rows[0], "all")).toBe(43)
  })
})

describe("foldSmall", () => {
  const others = (n: number, places: number) => ({ key: `+${places}`, n })
  it("folds places under the minimum into one bucket at the end", () => {
    expect(foldSmall([{ key: "SP", n: 9 }, { key: "a", n: 1 }, { key: "RJ", n: 3 }, { key: "b", n: 2 }], 3, others))
      .toEqual([{ key: "SP", n: 9 }, { key: "RJ", n: 3 }, { key: "+2", n: 3 }])
  })
  it("leaves rows alone when nothing is small or min is 1", () => {
    expect(foldSmall([{ key: "SP", n: 9 }], 3, others)).toEqual([{ key: "SP", n: 9 }])
    expect(foldSmall([{ key: "a", n: 1 }], 1, others)).toEqual([{ key: "a", n: 1 }])
  })
})

describe("flag and countryName", () => {
  it("turns a code into its flag and anything else into the globe", () => {
    expect(flag("BR")).toBe("🇧🇷")
    expect(flag("pt")).toBe("🇵🇹")
    expect(flag("OTHER")).toBe("🌐")
    expect(flag(null)).toBe("🌐")
  })
  it("names countries in the UI language", () => {
    expect(countryName("BR", "pt-BR", "?")).toBe("Brasil")
    expect(countryName("DE", "en", "?")).toBe("Germany")
    expect(countryName("OTHER", "pt-BR", "Desconhecido")).toBe("Desconhecido")
  })
})

describe("map data", () => {
  it("has the countries people sign up from and every Brazilian state", () => {
    for (const c of ["BR", "PT", "US", "GB", "DE", "AR", "MX"]) expect(world.paths).toHaveProperty(c)
    expect(Object.keys(br.paths)).toHaveLength(27)
    expect(br.paths).toHaveProperty("SP")
    expect(br.paths).toHaveProperty("DF")
  })
  it("keeps a dot for states too small to see", () => {
    expect(world.dots).toHaveProperty("SG")
    expect(world.dots).not.toHaveProperty("AU")
  })
})
