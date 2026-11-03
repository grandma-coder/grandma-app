"use client"
import { useState } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { trpc } from "@/lib/trpc"

const PRESETS = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "6m", days: 182 },
  { label: "1y", days: 365 },
]

function rangeForDays(days: number) {
  const until = new Date()
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - (days - 1))
  return { since: since.toISOString().slice(0, 10), until: until.toISOString().slice(0, 10) }
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border-default bg-card p-4 shadow-[var(--shadow-sm)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">{label}</p>
      <p className="display mt-1 text-2xl font-bold tabular-nums text-fg-primary">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-fg-tertiary">{sub}</p>}
    </div>
  )
}

export function MetricsDashboard({ defaultSince, defaultUntil }: { defaultSince: string; defaultUntil: string }) {
  const [range, setRange] = useState({ since: defaultSince, until: defaultUntil })

  const kpis = trpc.metrics.kpis.useQuery(range)
  const funnel = trpc.metrics.funnel.useQuery(range)

  const t = kpis.data?.totals
  const wow = kpis.data?.signupsWow

  return (
    <div className="space-y-6">
      {/* Range presets */}
      <div className="flex gap-2">
        {PRESETS.map((p) => {
          const r = rangeForDays(p.days)
          const active = r.since === range.since
          return (
            <button
              key={p.label}
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active ? "bg-accent-500 text-white" : "border border-border-default text-fg-tertiary hover:text-fg-primary"
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total users" value={t?.totalUsers ?? "—"} />
        <KpiCard label="Premium" value={t?.premiumUsers ?? "—"} />
        <KpiCard label="DAU" value={t?.dau ?? "—"} sub="last 24h" />
        <KpiCard label="WAU" value={t?.wau ?? "—"} sub="7d" />
        <KpiCard label="MAU" value={t?.mau ?? "—"} sub="30d" />
        <KpiCard
          label="Signups"
          value={kpis.data?.curSignups ?? "—"}
          sub={wow == null ? "in range" : `${wow >= 0 ? "▲" : "▼"} ${Math.abs(wow)}% vs prior`}
        />
      </div>

      {/* Signups + DAU timeseries */}
      <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
        <h2 className="display mb-4 text-base font-semibold text-fg-primary">Signups & active users</h2>
        {kpis.isLoading ? (
          <p className="text-sm text-fg-tertiary">Loading…</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={kpis.data?.daily ?? []} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gSignups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDau" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} tickFormatter={(d: string) => d.slice(5)} minTickGap={28} />
              <YAxis tick={{ fontSize: 10, fill: "var(--chart-axis)" }} allowDecimals={false} width={36} />
              <Tooltip
                contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: "var(--fg-tertiary)" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="newSignups" name="Signups" stroke="var(--chart-1)" strokeWidth={2} fill="url(#gSignups)" />
              <Area type="monotone" dataKey="dau" name="DAU" stroke="var(--chart-3)" strokeWidth={2} fill="url(#gDau)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Activation funnel */}
        <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
          <h2 className="display mb-4 text-base font-semibold text-fg-primary">Activation funnel</h2>
          {funnel.isLoading ? (
            <p className="text-sm text-fg-tertiary">Loading…</p>
          ) : (
            <div className="space-y-2.5">
              {funnel.data?.stages.map((s) => {
                const pct = s.overallPct ?? 0
                return (
                  <div key={s.stage}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="capitalize text-fg-secondary">{s.stage.replace(/_/g, " ")}</span>
                      <span className="tabular-nums text-fg-tertiary">
                        {s.count} {s.overallPct != null && <span className="text-fg-muted">· {s.overallPct}%</span>}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-deep">
                      <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Mode split */}
        <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
          <h2 className="display mb-4 text-base font-semibold text-fg-primary">Journey mode</h2>
          <div className="space-y-2.5">
            {[
              { label: "Pregnancy", val: t?.modeSplit.pregnancy ?? 0, color: "var(--chart-2)" },
              { label: "Kids", val: t?.modeSplit.kids ?? 0, color: "var(--chart-4)" },
              { label: "Pre-pregnancy", val: t?.modeSplit.pre ?? 0, color: "var(--chart-5)" },
            ].map((m) => {
              const total = (t?.totalUsers ?? 0) || 1
              const pct = Math.round((m.val / total) * 100)
              return (
                <div key={m.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-fg-secondary">{m.label}</span>
                    <span className="tabular-nums text-fg-tertiary">{m.val} <span className="text-fg-muted">· {pct}%</span></span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-deep">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 2)}%`, background: m.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
