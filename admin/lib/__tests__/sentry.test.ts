import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// The client reads env at import time, so set it before importing.
describe("sentry-api", () => {
  const origToken = process.env.SENTRY_AUTH_TOKEN
  afterEach(() => {
    process.env.SENTRY_AUTH_TOKEN = origToken
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("is dormant (configured=false, no throw) when SENTRY_AUTH_TOKEN is unset", async () => {
    delete process.env.SENTRY_AUTH_TOKEN
    vi.resetModules()
    const { listIssues } = await import("../sentry-api")
    const res = await listIssues()
    expect(res.configured).toBe(false)
    expect(res.issues).toEqual([])
  })

  it("maps raw Sentry issues when configured", async () => {
    process.env.SENTRY_AUTH_TOKEN = "test-token"
    vi.resetModules()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "1", shortId: "GA-1", title: "TypeError: boom", count: "42", userCount: 7, level: "error", lastSeen: "2026-07-17T00:00:00Z", permalink: "https://grandmaapp.sentry.io/issues/1/" },
      ],
    }) as unknown as typeof fetch
    const { listIssues } = await import("../sentry-api")
    const res = await listIssues({ query: "is:unresolved" })
    expect(res.configured).toBe(true)
    expect(res.issues).toHaveLength(1)
    expect(res.issues[0]).toMatchObject({ id: "1", shortId: "GA-1", title: "TypeError: boom", count: "42", userCount: 7 })
  })

  it("returns an error field (no throw) on a non-OK response", async () => {
    process.env.SENTRY_AUTH_TOKEN = "test-token"
    vi.resetModules()
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 }) as unknown as typeof fetch
    const { listIssues } = await import("../sentry-api")
    const res = await listIssues()
    expect(res.configured).toBe(true)
    expect(res.error).toContain("403")
  })
})
