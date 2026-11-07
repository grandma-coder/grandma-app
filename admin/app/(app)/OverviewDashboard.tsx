"use client"
import Link from "next/link"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useLocale, useTranslations } from "next-intl"
import { trpc } from "@/lib/trpc"
import { htmlLang, type Locale } from "@/i18n/config"
import { Attention } from "./Attention"

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
  const t = useTranslations("home")
  const lang = htmlLang(useLocale() as Locale)
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

  if (q.isLoading) return <><Attention /><p className="mt-8 text-sm text-fg-tertiary">{t("loading")}</p></>
  if (q.error) {
    return (
      <>
        <Attention />
        <p className="mt-8 rounded-xl border border-border-default bg-card p-5 text-sm text-fg-secondary">
          {t("loadError", { error: q.error.message })} <button className="underline" onClick={() => q.refetch()}>{t("retry")}</button>
        </p>
      </>
    )
  }

  return (
    <>
    <Attention />
    <div className="mt-8 space-y-6">
      {/* Hero KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label={t("kpi.totalUsers")} value={totalUsers} sub={t("kpi.new30d", { n: num(o, "users", "new30d") })} />
        <Kpi label={t("kpi.mau")} value={mau} sub={t("kpi.today", { n: dau })} />
        <Kpi label={t("kpi.stickiness")} value={`${stickiness}%`} sub={t("kpi.stickinessSub")} />
        <Kpi label={t("kpi.totalLogs")} value={num(o, "engagement", "totalLogs").toLocaleString(lang)} sub={t("kpi.thisWeek", { n: num(o, "engagement", "logs7d").toLocaleString(lang) })} />
        <Kpi label={t("kpi.paid")} value={`${pctPaid}%`} sub={t("kpi.paidOf", { paid, total: totalUsers })} tone={paid > 0 ? "text-[var(--pill-success-fg)]" : "text-fg-primary"} />
        <Kpi label={t("kpi.estMrr")} value={`$${Number(o?.estMrr ?? 0).toFixed(0)}`} sub={t("kpi.fromTierPrices")} />
      </div>

      {/* Activity chart */}
      <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
        <h2 className="display mb-3 text-base font-semibold text-fg-primary">{t("activity.title")}</h2>
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
            <Area type="monotone" dataKey="count" name={t("activity.logs")} stroke="var(--chart-2)" strokeWidth={2} fill="url(#gOv)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdowns */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Subscription mix */}
        <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
          <h2 className="display mb-1 text-base font-semibold text-fg-primary">{t("subscriptions.title")}</h2>
          <p className="mb-4 text-xs text-fg-muted">{t("subscriptions.note", { mrr: Number(o?.estMrr ?? 0).toFixed(2) })}</p>
          <div className="space-y-3">
            <Bar label={t("subscriptions.free")} value={sub.free} total={totalUsers} color="#B3AC9C" />
            <Bar label={t("subscriptions.premiumSolo")} value={sub.premium_solo} total={totalUsers} color="#B7A6E8" />
            <Bar label={t("subscriptions.premiumFamily")} value={sub.premium_family} total={totalUsers} color="#7048B8" />
          </div>
        </div>

        {/* Behaviors */}
        <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
          <h2 className="display mb-4 text-base font-semibold text-fg-primary">{t("behaviors.title")}</h2>
          <div className="space-y-3">
            <Bar label={t("behaviors.prePregnancy")} value={num(o, "behaviors", "pre_pregnancy")} total={totalUsers} color="#E58BB4" />
            <Bar label={t("behaviors.pregnancy")} value={num(o, "behaviors", "pregnancy")} total={totalUsers} color="#B7A6E8" />
            <Bar label={t("behaviors.kids")} value={num(o, "behaviors", "kids")} total={totalUsers} color="#8BB8E8" />
          </div>
          <p className="mt-3 border-t border-border-subtle pt-2 text-[11px] text-fg-muted">{t("behaviors.note")}</p>
        </div>

        {/* Lifecycle */}
        <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
          <h2 className="display mb-4 text-base font-semibold text-fg-primary">{t("lifecycle.title")}</h2>
          <div className="space-y-3">
            <Bar label={t("lifecycle.active")} value={life.active} total={totalUsers} color="#BDD48C" />
            <Bar label={t("lifecycle.dormant")} value={life.dormant} total={totalUsers} color="#F5D652" />
            <Bar label={t("lifecycle.atRisk")} value={life.atRisk} total={totalUsers} color="#F5B896" />
            <Bar label={t("lifecycle.churned")} value={life.churned} total={totalUsers} color="#EE7B6D" />
          </div>
        </div>
      </div>

      {/* Community + content strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label={t("strip.channels")} value={num(o, "community", "channels")} />
        <Kpi label={t("strip.posts")} value={num(o, "community", "posts")} sub={t("kpi.thisWeek", { n: num(o, "community", "posts7d") })} />
        <Kpi label={t("strip.questions")} value={num(o, "content", "questions")} />
        <Kpi label={t("strip.affirmations")} value={num(o, "content", "affirmations")} />
        <Kpi label={t("strip.sources")} value={num(o, "content", "sources")} />
        <Kpi label={t("strip.newsLive")} value={num(o, "content", "newsPublished")} sub={t("strip.drafts", { n: num(o, "content", "newsDrafts") })} />
      </div>

      {/* Pillars */}
      <div>
        <h2 className="display mb-3 text-base font-semibold text-fg-primary">{t("explore")}</h2>
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
    </>
  )
}
