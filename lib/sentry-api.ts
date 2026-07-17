import "server-only"

/**
 * Read-only Sentry client for the crash-triage pillar. Pulls grandma's issues
 * from the Sentry REST API (org `grandmaapp`, project `react-native`). Nothing
 * here writes to Sentry — data flows one way, into the console.
 *
 * Dormant when SENTRY_AUTH_TOKEN is unset: `configured` is false and the
 * fetchers return an empty result instead of throwing, so the UI can render a
 * "not configured" state rather than a crash.
 */
const BASE = "https://sentry.io/api/0"
const ORG = process.env.SENTRY_ORG ?? "grandmaapp"
const PROJECT = process.env.SENTRY_PROJECT ?? "react-native"
const TOKEN = process.env.SENTRY_AUTH_TOKEN

export const sentryConfigured = !!TOKEN

export interface SentryIssue {
  id: string
  shortId: string
  title: string
  culprit: string | null
  count: string
  userCount: number
  level: string
  lastSeen: string
  firstSeen: string
  permalink: string
}

export interface IssuesResult {
  configured: boolean
  issues: SentryIssue[]
  error?: string
}

interface RawIssue {
  id: string
  shortId?: string
  title: string
  culprit?: string | null
  count?: string | number
  userCount?: number
  level?: string
  lastSeen?: string
  firstSeen?: string
  permalink?: string
}

function mapIssue(r: RawIssue): SentryIssue {
  return {
    id: String(r.id),
    shortId: r.shortId ?? String(r.id),
    title: r.title,
    culprit: r.culprit ?? null,
    count: String(r.count ?? 0),
    userCount: Number(r.userCount ?? 0),
    level: r.level ?? "error",
    lastSeen: r.lastSeen ?? "",
    firstSeen: r.firstSeen ?? "",
    permalink: r.permalink ?? `https://${ORG}.sentry.io/issues/${r.id}/`,
  }
}

/**
 * List issues. Defaults to unresolved, sorted by frequency, over a stats
 * window. `query`/`statsPeriod` mirror Sentry's own params.
 */
export async function listIssues(opts: { query?: string; statsPeriod?: string; limit?: number } = {}): Promise<IssuesResult> {
  if (!TOKEN) return { configured: false, issues: [] }
  const params = new URLSearchParams({
    query: opts.query ?? "is:unresolved",
    statsPeriod: opts.statsPeriod ?? "24h",
    sort: "freq",
    limit: String(opts.limit ?? 25),
  })
  try {
    const res = await fetch(`${BASE}/projects/${ORG}/${PROJECT}/issues/?${params}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: "no-store",
    })
    if (!res.ok) {
      return { configured: true, issues: [], error: `Sentry API ${res.status}` }
    }
    const rows = (await res.json()) as RawIssue[]
    return { configured: true, issues: rows.map(mapIssue) }
  } catch (err) {
    return { configured: true, issues: [], error: err instanceof Error ? err.message : "fetch failed" }
  }
}
