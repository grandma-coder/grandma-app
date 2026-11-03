"use client"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { trpc } from "@/lib/trpc"

const LABEL: Record<string, string> = {
  OTHER: "Other",
  pre: "Cycle", preg: "Pregnancy", kids: "Kids", meno: "Menopause",
  en: "English", pt: "Português",
}
const fmt = (rows: { count: number; key: string }[]) => rows.map((r) => `${LABEL[r.key] ?? r.key} ${r.count.toLocaleString()}`).join(" · ") || "—"

const TOP_COUNTRIES = 6
// Worldwide launch: show the biggest few and fold the tail into "+N more" (full list is in the table filter).
function topCountries(rows: { country: string; count: number }[]) {
  const head = fmt(rows.slice(0, TOP_COUNTRIES).map((r) => ({ key: r.country, count: r.count })))
  return rows.length > TOP_COUNTRIES ? `${head} · +${rows.length - TOP_COUNTRIES} more` : head
}

function Tile({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{label}</p>
      <p className={small ? "mt-2 text-sm font-medium leading-6 text-fg-secondary" : "display mt-1 text-3xl font-bold tabular-nums text-fg-primary"}>{value}</p>
    </div>
  )
}

export function WaitlistStats() {
  const { data, isLoading, error } = trpc.waitlist.stats.useQuery()
  if (isLoading) return <p className="text-sm text-fg-tertiary">Loading…</p>
  if (error || !data) return <p className="text-sm text-fg-secondary">Couldn&apos;t load stats: {error?.message}</p>
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Total" value={data.total.toLocaleString()} />
        <Tile label="Last 7 days" value={data.last7.toLocaleString()} />
        <Tile label="By country" small value={topCountries(data.byCountry)} />
        <Tile label="By mode" small value={fmt(data.byMode.map((r) => ({ key: r.mode, count: r.count })))} />
      </div>
      <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Signups per day · 90 days</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.daily} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--accent-500)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
