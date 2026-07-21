import "server-only"

/**
 * RevenueCat client (read-only) for the Revenue pillar — the source of truth for
 * real billing (Apple/Google actually charged), as opposed to the estimated-MRR
 * proxy the metrics overview derives from tier counts.
 *
 * Dormant when the RevenueCat credentials are unset: `revenueCatConfigured` is
 * false and the fetchers return null / empty instead of throwing, so the UI
 * renders a setup card (mirrors the Sentry / ASC client pattern).
 *
 * Required env (RevenueCat dashboard → Project settings → API keys → the V2
 * "Secret" API key, and Project settings → General → the Project ID):
 *   REVENUECAT_API_KEY     — a V2 secret API key (starts `sk_…`). Server-only.
 *   REVENUECAT_PROJECT_ID  — the project id (starts `proj…`).
 *
 * V2 REST API. Auth is a static bearer token (the secret key); no signing.
 * Overview metrics come from the project-level overview endpoint; per-customer
 * subscription state is a per-subscriber lookup used only for the user detail
 * drill-in (kept lazy — no bulk export exists).
 */

const BASE = "https://api.revenuecat.com/v2"
const API_KEY = process.env.REVENUECAT_API_KEY
const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID

export const revenueCatConfigured = Boolean(API_KEY && PROJECT_ID)

/** One headline metric as RevenueCat's overview returns it. */
export interface RcMetric {
  id: string
  name: string
  unit: string | null
  value: number
  lastUpdated: string | null
}

export interface RcOverview {
  configured: boolean
  metrics: RcMetric[]
  error?: string
}

interface RawOverview {
  metrics?: {
    id?: string
    name?: string
    unit?: string | null
    value?: number
    last_updated_at?: number | string | null
  }[]
}

async function rcGet<T>(path: string): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      cache: "no-store",
    })
    if (!res.ok) {
      console.error("[revenuecat] request failed", path, res.status)
      return { ok: false, error: `RevenueCat API ${res.status}` }
    }
    return { ok: true, data: (await res.json()) as T }
  } catch (err) {
    console.error("[revenuecat] request error", path, err)
    return { ok: false, error: err instanceof Error ? err.message : "fetch failed" }
  }
}

/**
 * Project overview metrics — active subscriptions, MRR, revenue (28d), active
 * trials, new customers, etc. RevenueCat returns whatever metrics the project
 * exposes; we pass them through named so the UI can pick the ones it wants.
 */
export async function fetchRevenueOverview(): Promise<RcOverview> {
  if (!revenueCatConfigured) return { configured: false, metrics: [] }
  const r = await rcGet<RawOverview>(`/projects/${PROJECT_ID}/metrics/overview`)
  if (!r.ok) return { configured: true, metrics: [], error: r.error }
  const metrics = (r.data.metrics ?? []).map((m) => ({
    id: String(m.id ?? m.name ?? ""),
    name: String(m.name ?? m.id ?? ""),
    unit: m.unit ?? null,
    value: Number(m.value ?? 0),
    lastUpdated:
      m.last_updated_at == null
        ? null
        : typeof m.last_updated_at === "number"
          ? new Date(m.last_updated_at).toISOString()
          : m.last_updated_at,
  }))
  return { configured: true, metrics }
}

export interface RcEntitlement {
  identifier: string
  productId: string | null
  store: string | null // APP_STORE | PLAY_STORE | STRIPE | …
  expiresAt: string | null
  willRenew: boolean
  isActive: boolean
  isTrial: boolean
}

export interface RcCustomer {
  configured: boolean
  found: boolean
  customerId: string | null
  firstSeen: string | null
  lastSeen: string | null
  entitlements: RcEntitlement[]
  error?: string
}

interface RawSubscription {
  status?: string
  store?: string
  product_id?: string
  current_period_ends_at?: number | string | null
  auto_renewal_status?: string
  starts_at?: number | string | null
}

function toIso(v: number | string | null | undefined): string | null {
  if (v == null) return null
  if (typeof v === "number") return new Date(v).toISOString()
  return v
}

/**
 * One customer's subscription state, keyed by the RevenueCat App User ID (which
 * for grandma is the Supabase auth UUID). Used by the user-detail drill-in.
 * Returns { found:false } when RevenueCat has never seen the user (free/never
 * subscribed) — not an error.
 */
export async function fetchCustomer(appUserId: string): Promise<RcCustomer> {
  if (!revenueCatConfigured) return { configured: false, found: false, customerId: null, firstSeen: null, lastSeen: null, entitlements: [] }
  const enc = encodeURIComponent(appUserId)
  const r = await rcGet<{
    id?: string
    first_seen_at?: number | string | null
    last_seen_at?: number | string | null
  }>(`/projects/${PROJECT_ID}/customers/${enc}`)
  if (!r.ok) {
    // 404 = never seen this user → not an error, just "no subscription".
    if (r.error.endsWith("404")) return { configured: true, found: false, customerId: null, firstSeen: null, lastSeen: null, entitlements: [] }
    return { configured: true, found: false, customerId: null, firstSeen: null, lastSeen: null, entitlements: [], error: r.error }
  }
  const subsRes = await rcGet<{ items?: RawSubscription[] }>(`/projects/${PROJECT_ID}/customers/${enc}/subscriptions`)
  const subs = subsRes.ok ? (subsRes.data.items ?? []) : []
  const entitlements: RcEntitlement[] = subs.map((s) => {
    const active = s.status === "active" || s.status === "trialing"
    return {
      identifier: s.product_id ?? "subscription",
      productId: s.product_id ?? null,
      store: s.store ?? null,
      expiresAt: toIso(s.current_period_ends_at),
      willRenew: s.auto_renewal_status === "will_renew",
      isActive: active,
      isTrial: s.status === "trialing",
    }
  })
  return {
    configured: true,
    found: true,
    customerId: r.data.id ?? appUserId,
    firstSeen: toIso(r.data.first_seen_at),
    lastSeen: toIso(r.data.last_seen_at),
    entitlements,
  }
}
