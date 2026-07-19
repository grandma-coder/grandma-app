import { describe, it, expect } from "vitest"
import { renderTemplate } from "../render"

describe("renderTemplate", () => {
  it("interpolates known variables", () => {
    expect(renderTemplate("{{actorName}} posted in {{channelName}}", { actorName: "Ana", channelName: "Sleep" })).toBe(
      "Ana posted in Sleep",
    )
  })

  it("replaces unknown/missing variables with empty string", () => {
    expect(renderTemplate("Hi {{name}}!", {})).toBe("Hi !")
  })

  it("leaves whitespaced or hyphenated placeholders untouched", () => {
    expect(renderTemplate("{{ name }} and {{a-b}}", { name: "x" })).toBe("{{ name }} and {{a-b}}")
  })

  it("is case-sensitive", () => {
    expect(renderTemplate("{{Name}}", { name: "lower" })).toBe("")
  })

  it("handles repeated placeholders", () => {
    expect(renderTemplate("{{n}}+{{n}}", { n: "2" })).toBe("2+2")
  })

  it("returns a template with no placeholders unchanged", () => {
    expect(renderTemplate("plain text", { a: "b" })).toBe("plain text")
  })
})
