"use client"
import { trpc } from "@/lib/trpc"

/**
 * RevenueCat overview dashboard. RevenueCat returns whatever metrics the project
 * exposes (active subscriptions, MRR, revenue, active trials, new customers, …);
 * we format each by inferred type — currency for money metrics, counts for the
 * rest — into a card grid. Dormant → setup card (Sentry/ASC pattern).
 */

const CURRENCY_HINTS = ["mrr", "revenue", "arr"]

function isCurrency(id: string, unit: string | null): boolean {
  if (unit && /usd|\$|currency/i.test(unit)) return true
  return CURRENCY_HINTS.some((h) => id.toLowerCase().includes(h))
}

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: v >= 1000 ? 0 : 2 }).format(v)
}

function fmtCount(v: number): string {
  return new Intl.NumberFormat("en-US").format(v)
}

function prettyName(name: string): string {
  // RevenueCat ids arrive like "active_subscriptions" / "mrr" — title-case them.
  return name
    .replace(/_/g, " ")
    .replace(/\bmrr\b/i, "MRR")
    .replace(/\barr\b/i, "ARR")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function RevenueView() {
  const { data, isLoading } = trpc.revenue.overview.useQuery(undefined, { staleTime: 60_000 })

  if (isLoading) return <p className="text-sm text-fg-tertiary">Loading…</p>

  if (data && !data.configured) {
    return (
      <div className="rounded-xl border border-border-default bg-card p-6 text-sm text-fg-secondary shadow-[var(--shadow-sm)]">
        <p className="mb-1 font-medium text-fg-primary">RevenueCat not configured</p>
        <p className="text-fg-tertiary">
          Set <code className="font-mono text-xs">REVENUECAT_API_KEY</code> (a V2 secret key, <span className="font-mono">sk_…</span>) and{" "}
          <code className="font-mono text-xs">REVENUECAT_PROJECT_ID</code> in the environment to pull live billing.
        </p>
        <p className="mt-2 text-xs text-fg-muted">
          RevenueCat dashboard → Project settings → API keys (V2 secret) &amp; Project settings → General (Project ID).
        </p>
      </div>
    )
  }

  if (data?.error) {
    return <p className="text-sm text-danger">RevenueCat error: {data.error}</p>
  }

  if (!data || data.metrics.length === 0) {
    return <p className="text-sm text-fg-muted">No metrics returned for this project yet.</p>
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {data.metrics.map((m) => {
        const currency = isCurrency(m.id, m.unit)
        return (
          <div key={m.id} className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-muted">{prettyName(m.name)}</p>
            <p className="display mt-2 text-3xl font-bold tabular-nums text-fg-primary">
              {currency ? fmtCurrency(m.value) : fmtCount(m.value)}
            </p>
            {m.unit && !currency && <p className="mt-1 text-xs text-fg-tertiary">{m.unit}</p>}
          </div>
        )
      })}
    </div>
  )
}
