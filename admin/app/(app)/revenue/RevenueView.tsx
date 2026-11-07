"use client"
import { useLocale, useTranslations } from "next-intl"
import { trpc } from "@/lib/trpc"
import { htmlLang, type Locale } from "@/i18n/config"

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

function fmtCurrency(v: number, lang: string): string {
  return new Intl.NumberFormat(lang, { style: "currency", currency: "USD", maximumFractionDigits: v >= 1000 ? 0 : 2 }).format(v)
}

function fmtCount(v: number, lang: string): string {
  return new Intl.NumberFormat(lang).format(v)
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
  const t = useTranslations("revenue")
  const lang = htmlLang(useLocale() as Locale)
  const { data, isLoading } = trpc.revenue.overview.useQuery(undefined, { staleTime: 60_000 })

  if (isLoading) return <p className="text-sm text-fg-tertiary">{t("loading")}</p>

  if (data && !data.configured) {
    return (
      <div className="rounded-xl border border-border-default bg-card p-6 text-sm text-fg-secondary shadow-[var(--shadow-sm)]">
        <p className="mb-1 font-medium text-fg-primary">{t("setup.title")}</p>
        <p className="text-fg-tertiary">
          {t.rich("setup.body", {
            code: (c) => <code className="font-mono text-xs">{c}</code>,
            mono: (c) => <span className="font-mono">{c}</span>,
          })}
        </p>
        <p className="mt-2 text-xs text-fg-muted">{t("setup.where")}</p>
      </div>
    )
  }

  if (data?.error) {
    return <p className="text-sm text-danger">{t("error", { error: data.error })}</p>
  }

  if (!data || data.metrics.length === 0) {
    return <p className="text-sm text-fg-muted">{t("empty")}</p>
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {data.metrics.map((m) => {
        const currency = isCurrency(m.id, m.unit)
        return (
          <div key={m.id} className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-muted">{prettyName(m.name)}</p>
            <p className="display mt-2 text-3xl font-bold tabular-nums text-fg-primary">
              {currency ? fmtCurrency(m.value, lang) : fmtCount(m.value, lang)}
            </p>
            {m.unit && !currency && <p className="mt-1 text-xs text-fg-tertiary">{m.unit}</p>}
          </div>
        )
      })}
    </div>
  )
}
