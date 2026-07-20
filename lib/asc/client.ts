import "server-only"
import { importPKCS8, SignJWT } from "jose"

/**
 * App Store Connect API client (read-only) for the Releases pillar.
 *
 * Dormant when the ASC credentials are unset: `ascConfigured` is false and the
 * fetchers return empty results instead of throwing, so the UI renders a setup
 * card (mirrors the Sentry client pattern).
 *
 * Required env (from App Store Connect → Users and Access → Integrations →
 * App Store Connect API). Reads the APPSTORE_* names (mother-dashboard
 * convention), falling back to ASC_* if present:
 *   APPSTORE_ISSUER_ID   — the Issuer ID (UUID)
 *   APPSTORE_KEY_ID      — the Key ID
 *   APPSTORE_PRIVATE_KEY — the .p8 private key contents (PEM, \n-escaped ok)
 *   APPSTORE_APP_ID      — the app's numeric id (optional — auto-discovered from
 *                          the account's apps when omitted)
 *
 * Auth: ASC uses a short-lived ES256 JWT signed with the .p8 key, minted per
 * request (Apple caps lifetime at 20 min; we use 10).
 */

const ISSUER = process.env.APPSTORE_ISSUER_ID ?? process.env.ASC_ISSUER_ID
const KEY_ID = process.env.APPSTORE_KEY_ID ?? process.env.ASC_KEY_ID
const PRIVATE_KEY = process.env.APPSTORE_PRIVATE_KEY ?? process.env.ASC_PRIVATE_KEY
const APP_ID_ENV = process.env.APPSTORE_APP_ID ?? process.env.ASC_APP_ID

// Credentials are enough to talk to ASC; the app id is auto-discovered if unset.
export const ascConfigured = Boolean(ISSUER && KEY_ID && PRIVATE_KEY)

// Writing to Apple (setting release notes on a version → what users see) is a
// separate, explicit opt-in on top of having a key: set APPSTORE_WRITE=1. This
// keeps the connection read-only by default so a leaked/mis-scoped key can't
// silently change the live store listing.
export const ascWriteEnabled = ascConfigured && process.env.APPSTORE_WRITE === "1"

const BASE = "https://api.appstoreconnect.apple.com/v1"

export interface AscBuild {
  id: string
  version: string // build number, e.g. "142"
  uploadedDate: string | null
  processingState: string | null // PROCESSING | VALID | INVALID | FAILED
  expired: boolean
  /** The marketing version (e.g. "2.3.0") this build belongs to, when resolvable. */
  appVersion: string | null
}

export interface AscVersion {
  id: string
  versionString: string // "2.3.0"
  appStoreState: string | null // PREPARE_FOR_SUBMISSION | READY_FOR_SALE | …
  releaseType: string | null
  createdDate: string | null
  whatsNew: string | null // localized "What's New" release notes
}

async function mintToken(): Promise<string> {
  // .p8 contents may arrive with literal \n (Vercel env); normalize to real newlines.
  const pem = (PRIVATE_KEY ?? "").replace(/\\n/g, "\n")
  const key = await importPKCS8(pem, "ES256")
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: KEY_ID!, typ: "JWT" })
    .setIssuer(ISSUER!)
    .setAudience("appstoreconnect-v1")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(key)
}

async function ascGet<T>(path: string): Promise<T | null> {
  if (!ascConfigured) return null
  try {
    const token = await mintToken()
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) {
      console.error("[asc] request failed", path, res.status)
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.error("[asc] request error", path, err)
    return null
  }
}

async function ascWrite(method: "PATCH" | "POST", path: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  if (!ascConfigured) return { ok: false, error: "not configured" }
  try {
    const token = await mintToken()
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      console.error(`[asc] ${method} failed`, path, res.status, text.slice(0, 300))
      return { ok: false, error: `Apple returned ${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "request error" }
  }
}
const ascPatch = (path: string, body: unknown) => ascWrite("PATCH", path, body)

interface ListResp {
  data: { id: string; attributes: Record<string, unknown> }[]
}

export interface AscApp {
  id: string
  name: string | null
  bundleId: string | null
  sku: string | null
}

/** All apps visible to this API key. Used to discover the app id. */
export async function fetchApps(): Promise<AscApp[]> {
  const json = await ascGet<ListResp>(`/apps?limit=100&fields[apps]=name,bundleId,sku`)
  if (!json?.data) return []
  return json.data.map((a) => ({
    id: a.id,
    name: (a.attributes.name as string) ?? null,
    bundleId: (a.attributes.bundleId as string) ?? null,
    sku: (a.attributes.sku as string) ?? null,
  }))
}

// Resolve the app id: explicit env wins; else pick the grandma app from the
// account's apps (match bundle id / name), else the first app. Cached per process.
let cachedAppId: string | null | undefined
async function resolveAppId(): Promise<string | null> {
  if (APP_ID_ENV) return APP_ID_ENV
  if (cachedAppId !== undefined) return cachedAppId
  const apps = await fetchApps()
  const match =
    apps.find((a) => /grandma/i.test(a.bundleId ?? "") || /grandma/i.test(a.name ?? "")) ?? apps[0] ?? null
  cachedAppId = match?.id ?? null
  return cachedAppId
}

/** Recent builds for the app, newest first. Empty array when dormant/errored. */
export async function fetchBuilds(limit = 30): Promise<AscBuild[]> {
  const appId = await resolveAppId()
  if (!appId) return []
  const json = await ascGet<ListResp>(
    `/builds?filter[app]=${appId}&sort=-uploadedDate&limit=${Math.min(limit, 200)}` +
      `&fields[builds]=version,uploadedDate,processingState,expired`,
  )
  if (!json?.data) return []
  return json.data.map((b) => ({
    id: b.id,
    version: String(b.attributes.version ?? ""),
    uploadedDate: (b.attributes.uploadedDate as string) ?? null,
    processingState: (b.attributes.processingState as string) ?? null,
    expired: Boolean(b.attributes.expired),
    appVersion: null,
  }))
}

/** App Store versions (marketing versions) with their "What's New" notes. */
export async function fetchVersions(limit = 20): Promise<AscVersion[]> {
  const appId = await resolveAppId()
  if (!appId) return []
  const json = await ascGet<ListResp>(
    `/apps/${appId}/appStoreVersions?limit=${Math.min(limit, 50)}` +
      `&fields[appStoreVersions]=versionString,appStoreState,releaseType,createdDate`,
  )
  if (!json?.data) return []
  return json.data.map((v) => ({
    id: v.id,
    versionString: String(v.attributes.versionString ?? ""),
    appStoreState: (v.attributes.appStoreState as string) ?? null,
    releaseType: (v.attributes.releaseType as string) ?? null,
    createdDate: (v.attributes.createdDate as string) ?? null,
    whatsNew: null, // localized notes require a second call per version; kept lazy
  }))
}

/**
 * Set the "What's New" release notes on an App Store version (writes to Apple —
 * changes what users see). Applies to every editable localization of the
 * version. Gated by ascWriteEnabled (APPSTORE_WRITE=1). Returns per-locale
 * outcome so the caller can report + audit.
 */
export async function setVersionWhatsNew(
  versionId: string,
  whatsNew: string,
): Promise<{ ok: boolean; updated: number; error?: string }> {
  if (!ascWriteEnabled) return { ok: false, updated: 0, error: "Writing to App Store is disabled (set APPSTORE_WRITE=1)" }

  // Find the version's localizations (release notes are per-locale).
  const locs = await ascGet<{ data: { id: string; attributes: Record<string, unknown> }[] }>(
    `/appStoreVersions/${versionId}/appStoreVersionLocalizations?fields[appStoreVersionLocalizations]=locale,whatsNew`,
  )
  const list = locs?.data ?? []
  if (list.length === 0) return { ok: false, updated: 0, error: "No editable localizations on this version" }

  let updated = 0
  for (const loc of list) {
    const r = await ascPatch(`/appStoreVersionLocalizations/${loc.id}`, {
      data: { type: "appStoreVersionLocalizations", id: loc.id, attributes: { whatsNew } },
    })
    if (r.ok) updated++
    else if (updated === 0) return { ok: false, updated, error: r.error }
  }
  return { ok: updated > 0, updated }
}

/**
 * Set a build's TestFlight "What to Test" note (betaBuildLocalizations.whatsNew).
 * Creates the en-US localization if the build has none yet, else updates it.
 * Writes to Apple → what testers see. Gated by ascWriteEnabled. Returns outcome
 * for the caller to report + audit.
 */
export async function setBuildWhatToTest(
  buildId: string,
  whatsNew: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!ascWriteEnabled) return { ok: false, error: "Writing to App Store is disabled (set APPSTORE_WRITE=1)" }

  const locs = await ascGet<{ data: { id: string; attributes: Record<string, unknown> }[] }>(
    `/builds/${buildId}/betaBuildLocalizations?fields[betaBuildLocalizations]=locale,whatsNew`,
  )
  const existing = locs?.data ?? []
  const enUs = existing.find((l) => l.attributes.locale === "en-US") ?? existing[0]

  if (enUs) {
    return ascPatch(`/betaBuildLocalizations/${enUs.id}`, {
      data: { type: "betaBuildLocalizations", id: enUs.id, attributes: { whatsNew } },
    })
  }
  // No localization yet → create one for en-US linked to the build.
  return ascWrite("POST", `/betaBuildLocalizations`, {
    data: {
      type: "betaBuildLocalizations",
      attributes: { locale: "en-US", whatsNew },
      relationships: { build: { data: { type: "builds", id: buildId } } },
    },
  })
}
