"use client"
import { useLocale, useTranslations } from "next-intl"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { trpc } from "@/lib/trpc"
import { htmlLang, type Locale } from "@/i18n/config"
import { type Profile, num, fmtDate, daysSince, lifecycle } from "./user360"
import { MODE_DOT } from "./HeaderStrip"
import { Card, Kpi, ErrorState } from "./parts"

/**
 * Visão geral — KPI row, 90-day activity chart, behavior breakdown and
 * engagement. Profile-derived numbers render instantly; only the chart +
 * streak wait on `users.detailMetrics`, fetched when this tab is open.
 */
export function OverviewTab({ userId, profile, active }: { userId: string; profile: Profile; active: boolean }) {
  const t = useTranslations("users")
  const lang = htmlLang(useLocale() as Locale)
  const label = (ns: string, v: string) => (t.has(`${ns}.${v}`) ? t(`${ns}.${v}`) : v)
  const metrics = trpc.users.detailMetrics.useQuery({ userId, days: 90 }, { enabled: active, staleTime: 60_000, retry: 1 })

  const lastActiveDays = daysSince(profile.last_active)
  const life = lifecycle(lastActiveDays)
  const behaviors = (profile.behaviors as string[] | null) ?? []
  const totalLogs = num(profile, "child_logs_count") + num(profile, "cycle_logs_count") + num(profile, "pregnancy_logs_count")
  const accountAgeDays = daysSince(profile.created_at)

  const behaviorRows = [
    { key: "cycle", label: t("detail.behavior.cycle"), count: num(profile, "cycle_logs_count") },
    { key: "pregnancy", label: t("detail.behavior.pregnancy"), count: num(profile, "pregnancy_logs_count") },
    { key: "kids", label: t("detail.behavior.kids"), count: num(profile, "child_logs_count") },
  ]
  const maxBehavior = Math.max(1, ...behaviorRows.map((b) => b.count))

  const streak = metrics.data ? t("detail.kpi.days", { n: metrics.data.streak }) : metrics.isError ? "—" : "…"

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi
          label={t("detail.kpi.lastActive")}
          value={lastActiveDays == null ? "—" : lastActiveDays === 0 ? t("detail.kpi.today") : t("detail.kpi.days", { n: lastActiveDays })}
          sub={lastActiveDays == null ? t("detail.kpi.noActivity") : t("detail.kpi.ago")}
          tone={life.cls === "pill-danger" ? "text-[var(--pill-danger-fg)]" : life.cls === "pill-warning" ? "text-[var(--pill-warning-fg)]" : "text-fg-primary"}
        />
        <Kpi label={t("detail.kpi.currentStreak")} value={streak} sub={t("detail.kpi.consecutiveDays")} />
        <Kpi label={t("detail.kpi.totalLogs")} value={totalLogs} sub={t("detail.kpi.in30d", { n: num(profile, "logs_30d") })} />
        <Kpi label={t("detail.kpi.accountAge")} value={accountAgeDays == null ? "—" : t("detail.kpi.days", { n: accountAgeDays })} sub={fmtDate(profile.created_at, lang)} />
        <Kpi label={t("detail.kpi.children")} value={num(profile, "children_count")} />
        <Kpi label={t("detail.kpi.devices")} value={num(profile, "active_device_count")} sub={t("detail.kpi.devicesTotal", { n: num(profile, "device_count") })} />
      </div>

      <Card title={t("detail.activity.heading")} aside={<span className="text-xs text-fg-muted">{t("detail.activity.logsThisWeek", { n: num(profile, "logs_7d") })}</span>}>
        {metrics.isError ? (
          <ErrorState what="metrics" onRetry={() => metrics.refetch()} />
        ) : metrics.isLoading || !metrics.data ? (
          <div className="h-[200px] animate-pulse rounded-lg bg-deep" aria-label={t("loading")} />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={metrics.data.series} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gAct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} tickFormatter={(d: string) => d.slice(5)} minTickGap={28} />
              <YAxis tick={{ fontSize: 10, fill: "var(--chart-axis)" }} allowDecimals={false} width={32} />
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: "var(--fg-tertiary)" }} />
              <Area type="monotone" dataKey="count" name={t("detail.activity.series")} stroke="var(--chart-2)" strokeWidth={2} fill="url(#gAct)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("detail.behavior.heading")}>
          <p className="-mt-2 mb-4 text-xs text-fg-muted">
            {behaviors.length
              ? t("detail.behavior.enrolled", { list: behaviors.map((b) => label("journeyMode", b)).join(", ") })
              : t("detail.behavior.inferred")}
          </p>
          <div className="space-y-3">
            {behaviorRows.map((b) => (
              <div key={b.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-fg-secondary">
                    <span className="inline-block size-2 rounded-full" style={{ background: MODE_DOT[b.key] }} />
                    {b.label}
                  </span>
                  <span className="tabular-nums text-fg-tertiary">{t("detail.behavior.logs", { n: b.count })}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-deep">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.max((b.count / maxBehavior) * 100, b.count ? 3 : 0)}%`, background: MODE_DOT[b.key] }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title={t("detail.overview.engagement")}>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["posts", num(profile, "posts_count"), t("detail.behavior.posts")],
              ["comments", num(profile, "comments_count"), t("detail.behavior.comments")],
              ["points", num(profile, "total_points"), t("detail.behavior.points")],
              ["notifications", num(profile, "notifications_count"), t("detail.overview.notifications")],
              ["caregivers", num(profile, "caregivers_count"), t("detail.overview.caregivers")],
              ["logs30d", num(profile, "logs_30d"), t("detail.overview.logs30d")],
            ].map(([k, v, l]) => (
              <div key={k as string} className="rounded-lg bg-deep px-2 py-3">
                <p className="display text-lg font-bold tabular-nums text-fg-primary">{v}</p>
                <p className="text-[10px] uppercase tracking-wide text-fg-muted">{l}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
