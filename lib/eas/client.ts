import "server-only"

/**
 * EAS (Expo Application Services) GraphQL client — read-only, for the Releases
 * pillar. Pulls recent builds with their git commit + message so the changelog
 * of what shipped in each EAS build can be surfaced (and composed) in the
 * command center.
 *
 * Dormant when EXPO_TOKEN is unset: `easConfigured` is false and fetchers return
 * [] instead of throwing (Sentry/ASC pattern).
 *
 * Env:
 *   EXPO_TOKEN      — an Expo access token (expo.dev → Account → Access Tokens)
 *   EAS_PROJECT_ID  — the app's EAS project id (defaults to grandma-app's)
 */

const TOKEN = process.env.EXPO_TOKEN
const PROJECT_ID = process.env.EAS_PROJECT_ID ?? "3e90f69b-67ad-4c0e-82b5-12677de0e331"
const ENDPOINT = "https://api.expo.dev/graphql"

export const easConfigured = Boolean(TOKEN)

export interface EasBuild {
  id: string
  platform: string | null // IOS | ANDROID
  status: string | null // FINISHED | ERRORED | …
  appVersion: string | null // marketing version, e.g. "1.0"
  buildNumber: string | null // iOS build number / Android versionCode
  profile: string | null // build profile: production / preview
  channel: string | null
  gitCommitHash: string | null
  gitCommitMessage: string | null
  createdAt: string | null
}

const BUILDS_QUERY = `
  query CCBuilds($appId: String!, $limit: Int!) {
    app {
      byId(appId: $appId) {
        builds(limit: $limit, offset: 0) {
          id
          platform
          status
          appVersion
          appBuildVersion
          buildProfile
          channel
          gitCommitHash
          gitCommitMessage
          createdAt
        }
      }
    }
  }
`

interface GqlBuild {
  id: string
  platform?: string
  status?: string
  appVersion?: string
  appBuildVersion?: string
  buildProfile?: string
  channel?: string
  gitCommitHash?: string
  gitCommitMessage?: string
  createdAt?: string
}

/**
 * Recent EAS builds, newest first. Empty array when dormant/errored. Optionally
 * filter to a build profile (e.g. 'production').
 */
export async function fetchEasBuilds(limit = 30, profile?: string): Promise<EasBuild[]> {
  if (!easConfigured) return []
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ query: BUILDS_QUERY, variables: { appId: PROJECT_ID, limit: Math.min(limit, 100) } }),
      cache: "no-store",
    })
    if (!res.ok) {
      console.error("[eas] request failed", res.status)
      return []
    }
    const json = (await res.json()) as { data?: { app?: { byId?: { builds?: GqlBuild[] } } }; errors?: unknown }
    const builds = json.data?.app?.byId?.builds ?? []
    const mapped: EasBuild[] = builds.map((b) => ({
      id: b.id,
      platform: b.platform ?? null,
      status: b.status ?? null,
      appVersion: b.appVersion ?? null,
      buildNumber: b.appBuildVersion ?? null,
      profile: b.buildProfile ?? null,
      channel: b.channel ?? null,
      gitCommitHash: b.gitCommitHash ? b.gitCommitHash.slice(0, 8) : null,
      gitCommitMessage: b.gitCommitMessage ?? null,
      createdAt: b.createdAt ?? null,
    }))
    return profile ? mapped.filter((b) => b.profile === profile) : mapped
  } catch (err) {
    console.error("[eas] request error", err)
    return []
  }
}
