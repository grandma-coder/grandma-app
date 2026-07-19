"use client"
import Link from "next/link"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { trpc } from "@/lib/trpc"

type Nums = Record<string, number>

function num(o: unknown, ...path: string[]): number {
  let cur: unknown = o
  for (const k of path) cur = (cur as Record<string, unknown> | undefined)?.[k]
  return Number(cur ?? 0)
}

function Kpi({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border-default bg-card p-4 shadow-[var(--shadow-sm)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">{label}</p>
      <p className={`display mt-1 text-2xl font-bold tabular-nums ${tone ?? "text-fg-primary"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-fg-tertiary">{sub}</p>}
    </div>
  )
}

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-fg-secondary">
          <span className="inline-block size-2 rounded-full" style={{ background: color }} />
          {label}
        </span>
        <span className="tabular-nums text-fg-tertiary">{value} · {pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-deep">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, value ? 3 : 0)}%`, background: color }} />
      </div>
    </div>
  )
}

export function OverviewDashboard({ pillars }: { pillars: { name: string; href: string; blurb: string }[] }) {
  const q = trpc.metrics.overview.useQuery()
  const o = q.data as (Record<string, unknown> & { estMrr?: number; activity?: { day: string; count: number }[] }) | undefined

  const totalUsers = num(o, "users", "total")
  const mau = num(o, "engagement", "mau")
  const dau = num(o, "engagement", "dau")
  const stickiness = mau > 0 ? Math.round((dau / mau) * 100) : 0
  const paid = num(o, "subscription", "paid")
  const pctPaid = totalUsers > 0 ? Math.round((paid / totalUsers) * 100) : 0

  const sub: Nums = {
    free: num(o, "subscription", "free"),
    premium_solo: num(o, "subscription", "premium_solo"),
    premium_family: num(o, "subscription", "premium_family"),
  }
  const life: Nums = {
    active: num(o, "lifecycle", "active"),
    dormant: num(o, "lifecycle", "dormant"),
    atRisk: num(o, "lifecycle", "atRisk"),
    churned: num(o, "lifecycle", "churned"),
  }

  if (q.isLoading) return <p className="mt-8 text-sm text-fg-tertiary">Loading overview…</p>

  return (
    <div className="mt-8 space-y-6">
      {/* Hero KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Total users" value={totalUsers} sub={`+${num(o, "users", "new30d")} in 30d`} />
        <Kpi label="MAU" value={mau} sub={`${dau} today`} />
        <Kpi label="Stickiness" value={`${stickiness}%`} sub="DAU / MAU" />
        <Kpi label="Total logs" value={num(o, "engagement", "totalLogs").toLocaleString()} sub={`${num(o, "engagement", "logs7d").toLocaleString()} this week`} />
        <Kpi label="Paid" value={`${pctPaid}%`} sub={`${paid} of ${totalUsers}`} tone={paid > 0 ? "text-[var(--pill-success-fg)]" : "text-fg-primary"} />
        <Kpi label="Est. MRR" value={`$${Number(o?.estMrr ?? 0).toFixed(0)}`} sub="from tier prices" />
      </div>

      {/* Activity chart */}
      <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
        <h2 className="display mb-3 text-base font-semibold text-fg-primary">Activity — last 30 days</h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={o?.activity ?? []} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gOv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} tickFormatter={(d: string) => d.slice(5)} minTickGap={28} />
            <YAxis tick={{ fontSize: 10, fill: "var(--chart-axis)" }} allowDecimals={false} width={40} />
            <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: "var(--fg-tertiary)" }} />
            <Area type="monotone" dataKey="count" name="Logs" stroke="var(--chart-2)" strokeWidth={2} fill="url(#gOv)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdowns */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Subscription mix */}
        <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
          <h2 className="display mb-1 text-base font-semibold text-fg-primary">Subscriptions</h2>
          <p className="mb-4 text-xs text-fg-muted">Est. MRR ${Number(o?.estMrr ?? 0).toFixed(2)} · real $ needs RevenueCat</p>
          <div className="space-y-3">
            <Bar label="Free" value={sub.free} total={totalUsers} color="#B3AC9C" />
            <Bar label="Premium (Solo)" value={sub.premium_solo} total={totalUsers} color="#B7A6E8" />
            <Bar label="Premium (Family)" value={sub.premium_family} total={totalUsers} color="#7048B8" />
          </div>
        </div>

        {/* Behaviors */}
        <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
          <h2 className="display mb-4 text-base font-semibold text-fg-primary">Users by behavior</h2>
          <div className="space-y-3">
            <Bar label="Pre-Pregnancy" value={num(o, "behaviors", "pre_pregnancy")} total={totalUsers} color="#E58BB4" />
            <Bar label="Pregnancy" value={num(o, "behaviors", "pregnancy")} total={totalUsers} color="#B7A6E8" />
            <Bar label="Kids" value={num(o, "behaviors", "kids")} total={totalUsers} color="#8BB8E8" />
          </div>
          <p className="mt-3 border-t border-border-subtle pt-2 text-[11px] text-fg-muted">A user in multiple journeys counts in each.</p>
        </div>

        {/* Lifecycle */}
        <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
          <h2 className="display mb-4 text-base font-semibold text-fg-primary">Lifecycle</h2>
          <div className="space-y-3">
            <Bar label="Active (7d)" value={life.active} total={totalUsers} color="#BDD48C" />
            <Bar label="Dormant (7–30d)" value={life.dormant} total={totalUsers} color="#F5D652" />
            <Bar label="At risk (30–60d)" value={life.atRisk} total={totalUsers} color="#F5B896" />
            <Bar label="Churned (60d+)" value={life.churned} total={totalUsers} color="#EE7B6D" />
          </div>
        </div>
      </div>

      {/* Community + content strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Channels" value={num(o, "community", "channels")} />
        <Kpi label="Posts" value={num(o, "community", "posts")} sub={`${num(o, "community", "posts7d")} this week`} />
        <Kpi label="Questions" value={num(o, "content", "questions")} />
        <Kpi label="Affirmations" value={num(o, "content", "affirmations")} />
        <Kpi label="Sources" value={num(o, "content", "sources")} />
        <Kpi label="News live" value={num(o, "content", "newsPublished")} sub={`${num(o, "content", "newsDrafts")} drafts`} />
      </div>

      {/* Pillars */}
      <div>
        <h2 className="display mb-3 text-base font-semibold text-fg-primary">Explore</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => (
            <Link key={p.name} href={p.href} className="rounded-xl border border-border-default bg-card p-4 shadow-[var(--shadow-sm)] transition-all hover:border-accent-400 hover:shadow-[var(--shadow-md)]">
              <h3 className="display text-base font-semibold text-fg-primary">{p.name}</h3>
              <p className="mt-1 text-sm text-fg-tertiary">{p.blurb}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
