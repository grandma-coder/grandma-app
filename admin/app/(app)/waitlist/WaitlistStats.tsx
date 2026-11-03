"use client"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { useLocale, useTranslations } from "next-intl"
import { trpc } from "@/lib/trpc"
import { htmlLang, type Locale } from "@/i18n/config"

// Keys with a translated display label (messages: waitlist.labels.*); anything else (country codes) shows as-is.
const LABELED = new Set(["OTHER", "pre", "preg", "kids", "meno", "en", "pt"])

const TOP_COUNTRIES = 6

function Tile({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{label}</p>
      <p className={small ? "mt-2 text-sm font-medium leading-6 text-fg-secondary" : "display mt-1 text-3xl font-bold tabular-nums text-fg-primary"}>{value}</p>
    </div>
  )
}

export function WaitlistStats() {
  const t = useTranslations("waitlist")
  const lang = htmlLang(useLocale() as Locale)
  const fmt = (rows: { count: number; key: string }[]) =>
    rows.map((r) => `${LABELED.has(r.key) ? t(`labels.${r.key}`) : r.key} ${r.count.toLocaleString(lang)}`).join(" · ") || "—"
  // Worldwide launch: show the biggest few and fold the tail into "+N more" (full list is in the table filter).
  const topCountries = (rows: { country: string; count: number }[]) => {
    const head = fmt(rows.slice(0, TOP_COUNTRIES).map((r) => ({ key: r.country, count: r.count })))
    return rows.length > TOP_COUNTRIES ? `${head} · ${t("stats.more", { n: rows.length - TOP_COUNTRIES })}` : head
  }
  const { data, isLoading, error } = trpc.waitlist.stats.useQuery()
  if (isLoading) return <p className="text-sm text-fg-tertiary">{t("loading")}</p>
  if (error || !data) return <p className="text-sm text-fg-secondary">{t("stats.loadError", { error: error?.message ?? "" })}</p>
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label={t("stats.total")} value={data.total.toLocaleString(lang)} />
        <Tile label={t("stats.last7")} value={data.last7.toLocaleString(lang)} />
        <Tile label={t("stats.byCountry")} small value={topCountries(data.byCountry)} />
        <Tile label={t("stats.byMode")} small value={fmt(data.byMode.map((r) => ({ key: r.mode, count: r.count })))} />
      </div>
      <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{t("stats.perDay")}</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.daily} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="count" name={t("stats.signups")} fill="var(--accent-500)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
