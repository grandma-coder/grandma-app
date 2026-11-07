import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { isAllowed } from "../allowlist"

describe("isAllowed", () => {
  const original = process.env.CLERK_ALLOWED_EMAILS
  beforeEach(() => {
    process.env.CLERK_ALLOWED_EMAILS = "igor@mothergames.com, Team@grandma.app"
  })
  afterEach(() => {
    process.env.CLERK_ALLOWED_EMAILS = original
  })

  it("allows an email on the list", () => {
    expect(isAllowed("igor@mothergames.com")).toBe(true)
  })
  it("is case-insensitive and trims whitespace", () => {
    expect(isAllowed("  TEAM@Grandma.app ")).toBe(true)
  })
  it("rejects an email not on the list", () => {
    expect(isAllowed("stranger@example.com")).toBe(false)
  })
  it("rejects null / undefined / empty", () => {
    expect(isAllowed(null)).toBe(false)
    expect(isAllowed(undefined)).toBe(false)
    expect(isAllowed("")).toBe(false)
  })
})
