"use client"
import { trpc } from "@/lib/trpc"

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}
function num(v: number): string {
  return new Intl.NumberFormat("en-US").format(v)
}
function fmtWhen(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function AnalyticsTab({ isAdmin }: { isAdmin: boolean }) {
  const totals = trpc.pushAnalytics.totals.useQuery()
  const funnel = trpc.pushAnalytics.funnel.useQuery({ limit: 50 })
  const utils = trpc.useUtils()
  const check = trpc.pushAnalytics.checkReceipts.useMutation({
    onSuccess: () => {
      utils.pushAnalytics.funnel.invalidate()
      utils.pushAnalytics.totals.invalidate()
    },
  })

  const t = totals.data

  return (
    <div className="space-y-5">
      {/* Headline funnel */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Campaigns sent" value={t ? num(t.campaigns) : "—"} />
        <Kpi label="Sent" value={t ? num(t.sent) : "—"} />
        <Kpi label="Delivered" value={t ? num(t.delivered) : "—"} sub={t ? pct(t.deliveryRate) : undefined} />
        <Kpi label="Opened" value={t ? num(t.opened) : "—"} sub={t ? pct(t.openRate) + " of delivered" : undefined} />
      </div>

      {funnel.isLoading && <p className="text-sm text-fg-tertiary">Loading…</p>}

      {funnel.data && funnel.data.length === 0 && (
        <div className="rounded-xl border border-border-default bg-card p-6 text-sm text-fg-secondary shadow-[var(--shadow-sm)]">
          <p className="mb-1 font-medium text-fg-primary">No sent campaigns yet</p>
          <p className="text-fg-tertiary">
            Once a notification is sent, its funnel appears here. Delivery comes from Expo receipts (use{" "}
            <span className="font-medium">Check receipts</span> a few minutes after sending); opens are reported by the app when a push is tapped.
          </p>
        </div>
      )}

      {funnel.data && funnel.data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
              <tr>
                <th className="px-4 py-2.5 font-medium">Campaign</th>
                <th className="px-4 py-2.5 font-medium">Sent</th>
                <th className="px-4 py-2.5 font-medium">Delivered</th>
                <th className="px-4 py-2.5 font-medium">Opened</th>
                <th className="px-4 py-2.5 font-medium">When</th>
                {isAdmin && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {funnel.data.map((c) => (
                <tr key={c.id} className="border-t border-border-subtle text-fg-secondary hover:bg-card-hover">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-fg-primary">{c.title}</div>
                    <div className="text-xs text-fg-muted">{c.category}</div>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {num(c.sent)}
                    {c.failed > 0 && <span className="ml-1 text-xs text-danger">· {c.failed} failed</span>}
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
                        title="Poll Expo delivery receipts for this campaign"
                      >
                        {check.isPending && check.variables?.campaignId === c.id ? "Checking…" : "Check receipts"}
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
          Checked {check.data.checked} · {check.data.delivered} delivered · {check.data.errored} errored
          {check.data.deactivated > 0 && ` · ${check.data.deactivated} dead token(s) pruned`}
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
