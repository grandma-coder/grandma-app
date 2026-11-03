"use client"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { htmlLang, type Locale } from "@/i18n/config"
import { trpc } from "@/lib/trpc"

export function AnalyticsTab({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("push")
  const format = useFormatter()
  const lang = htmlLang(useLocale() as Locale)
  const pct = (v: number) => format.number(v, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const num = (v: number) => format.number(v)
  const fmtWhen = (iso: string | null) => {
    if (!iso) return "—"
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(lang, { month: "short", day: "numeric" })
  }
  const category = (c: string) => (t.has(`categories.${c}`) ? t(`categories.${c}`) : c)
  const totals = trpc.pushAnalytics.totals.useQuery()
  const funnel = trpc.pushAnalytics.funnel.useQuery({ limit: 50 })
  const utils = trpc.useUtils()
  const check = trpc.pushAnalytics.checkReceipts.useMutation({
    onSuccess: () => {
      utils.pushAnalytics.funnel.invalidate()
      utils.pushAnalytics.totals.invalidate()
    },
  })

  const tot = totals.data

  return (
    <div className="space-y-5">
      {/* Headline funnel */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label={t("analytics.campaignsSent")} value={tot ? num(tot.campaigns) : "—"} />
        <Kpi label={t("analytics.sent")} value={tot ? num(tot.sent) : "—"} />
        <Kpi label={t("analytics.delivered")} value={tot ? num(tot.delivered) : "—"} sub={tot ? pct(tot.deliveryRate) : undefined} />
        <Kpi label={t("analytics.opened")} value={tot ? num(tot.opened) : "—"} sub={tot ? t("analytics.ofDelivered", { pct: pct(tot.openRate) }) : undefined} />
      </div>

      {funnel.isLoading && <p className="text-sm text-fg-tertiary">{t("loading")}</p>}

      {funnel.data && funnel.data.length === 0 && (
        <div className="rounded-xl border border-border-default bg-card p-6 text-sm text-fg-secondary shadow-[var(--shadow-sm)]">
          <p className="mb-1 font-medium text-fg-primary">{t("analytics.emptyTitle")}</p>
          <p className="text-fg-tertiary">
            {t.rich("analytics.emptyBody", { b: (c) => <span className="font-medium">{c}</span> })}
          </p>
        </div>
      )}

      {funnel.data && funnel.data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
              <tr>
                <th className="px-4 py-2.5 font-medium">{t("analytics.colCampaign")}</th>
                <th className="px-4 py-2.5 font-medium">{t("analytics.sent")}</th>
                <th className="px-4 py-2.5 font-medium">{t("analytics.delivered")}</th>
                <th className="px-4 py-2.5 font-medium">{t("analytics.opened")}</th>
                <th className="px-4 py-2.5 font-medium">{t("analytics.colWhen")}</th>
                {isAdmin && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {funnel.data.map((c) => (
                <tr key={c.id} className="border-t border-border-subtle text-fg-secondary hover:bg-card-hover">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-fg-primary">{c.title}</div>
                    <div className="text-xs text-fg-muted">{category(c.category)}</div>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {num(c.sent)}
                    {c.failed > 0 && <span className="ml-1 text-xs text-danger">{t("analytics.failed", { n: c.failed })}</span>}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {num(c.delivered)}
                    <span className="ml-1 text-xs text-fg-muted">{pct(c.deliveryRate)}</span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {num(c.opened)}
                    <span className="ml-1 text-xs text-fg-muted">{pct(c.openRate)}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs">{fmtWhen(c.sentAt)}</td>
                  {isAdmin && (
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => check.mutate({ campaignId: c.id })}
                        disabled={check.isPending}
                        className="rounded-lg border border-border-default px-2.5 py-1 text-xs font-medium text-fg-secondary hover:bg-card-hover disabled:opacity-40"
                        title={t("analytics.checkHint")}
                      >
                        {check.isPending && check.variables?.campaignId === c.id ? t("analytics.checking") : t("analytics.checkReceipts")}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {check.data && (
        <p className="text-xs text-fg-tertiary">
          {t("analytics.checkResult", { checked: check.data.checked, delivered: check.data.delivered, errored: check.data.errored })}
          {check.data.deactivated > 0 && t("analytics.pruned", { n: check.data.deactivated })}
        </p>
      )}
    </div>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-muted">{label}</p>
      <p className="display mt-2 text-3xl font-bold tabular-nums text-fg-primary">{value}</p>
      {sub && <p className="mt-1 text-xs text-fg-tertiary">{sub}</p>}
    </div>
  )
}
