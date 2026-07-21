"use client"
import { useState } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { trpc } from "@/lib/trpc"

const RANGES = [
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
] as const

function usd(v: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: v >= 100 ? 0 : 2 }).format(v)
}
function compactNum(v: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v)
}

export function AiCostView() {
  const [days, setDays] = useState<number>(30)
  const { data, isLoading } = trpc.ai.overview.useQuery({ days }, { staleTime: 60_000 })

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setDays(r.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              days === r.value ? "bg-accent-500 text-white" : "border border-border-default text-fg-tertiary hover:text-fg-primary"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-fg-tertiary">Loading…</p>}

      {data && !data.hasData && (
        <div className="rounded-xl border border-border-default bg-card p-6 text-sm text-fg-secondary shadow-[var(--shadow-sm)]">
          <p className="mb-1 font-medium text-fg-primary">No AI usage logged yet</p>
          <p className="text-fg-tertiary">
            The edge functions log one <code className="font-mono text-xs">ai_usage</code> row per Claude call. Once{" "}
            <span className="font-mono">nana-chat</span> / <span className="font-mono">food-ai</span> / <span className="font-mono">scan-image</span> deploy with the
            <code className="font-mono text-xs"> logAiUsage()</code> helper, spend appears here.
          </p>
        </div>
      )}

      {data?.hasData && (
        <>
          {/* Headline totals */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kpi label="Total spend" value={usd(data.totals.cost)} />
            <Kpi label="Calls" value={compactNum(data.totals.calls)} />
            <Kpi label="Tokens" value={compactNum(data.totals.tokens)} />
            <Kpi
              label="Error rate"
              value={`${(data.totals.errorRate * 100).toFixed(1)}%`}
              tone={data.totals.errorRate > 0.05 ? "text-danger" : "text-fg-primary"}
            />
          </div>

          {/* Daily cost trend */}
          {data.daily.length > 1 && (
            <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-fg-muted">Daily spend</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data.daily} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gAi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-500)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent-500)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--fg-muted)" }} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--fg-muted)" }} tickFormatter={(v: number) => `$${v}`} width={44} />
                  <Tooltip
                    contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: "var(--fg-tertiary)" }}
                    formatter={(v) => [usd(Number(v)), "spend"]}
                  />
                  <Area type="monotone" dataKey="cost" stroke="var(--accent-500)" strokeWidth={2} fill="url(#gAi)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Per function */}
            <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-fg-muted">By function</p>
              <div className="space-y-2">
                {data.byFunction.map((f) => (
                  <div key={f.fn} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-mono text-xs text-fg-secondary">{f.fn}</span>
                    <div className="flex items-center gap-3 text-xs text-fg-tertiary">
                      <span>{compactNum(f.calls)} calls</span>
                      {f.errors > 0 && <span className="text-danger">{f.errors} err</span>}
                      <span className="display font-semibold tabular-nums text-fg-primary">{usd(f.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Per model */}
            <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-fg-muted">By model</p>
              <div className="space-y-2">
                {data.byModel.map((m) => (
                  <div key={m.model} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-mono text-xs text-fg-secondary">{m.model}</span>
                    <div className="flex items-center gap-3 text-xs text-fg-tertiary">
                      <span>{compactNum(m.tokens)} tok</span>
                      <span className="display font-semibold tabular-nums text-fg-primary">{usd(m.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top spenders */}
          {data.topUsers.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
              <table className="w-full text-sm">
                <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Top users by spend</th>
                    <th className="px-4 py-2.5 font-medium">Calls</th>
                    <th className="px-4 py-2.5 font-medium">Cost</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {data.topUsers.map((u) => (
                    <tr key={u.userId} className="border-t border-border-subtle text-fg-secondary hover:bg-card-hover">
                      <td className="px-4 py-2.5 text-fg-primary">{u.email ?? <span className="font-mono text-xs text-fg-muted">{u.userId.slice(0, 8)}…</span>}</td>
                      <td className="px-4 py-2.5 tabular-nums">{compactNum(u.calls)}</td>
                      <td className="px-4 py-2.5 display font-semibold tabular-nums text-fg-primary">{usd(u.cost)}</td>
                      <td className="px-4 py-2.5">
                        <a href={`/users/${u.userId}`} className="text-xs font-medium text-accent-500 hover:text-accent-600">view →</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-muted">{label}</p>
      <p className={`display mt-2 text-3xl font-bold tabular-nums ${tone ?? "text-fg-primary"}`}>{value}</p>
    </div>
  )
}
