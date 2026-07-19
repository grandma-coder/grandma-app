"use client"
import { useState } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { trpc } from "@/lib/trpc"

const PRESETS = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
]

function rangeForDays(days: number) {
  const until = new Date()
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - (days - 1))
  return { since: since.toISOString().slice(0, 10), until: until.toISOString().slice(0, 10) }
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border-default bg-card p-4 shadow-[var(--shadow-sm)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">{label}</p>
      <p className="display mt-1 text-2xl font-bold tabular-nums text-fg-primary">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-fg-tertiary">{sub}</p>}
    </div>
  )
}

function fmtWhen(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString()
}

export function CommunityDashboard({ defaultSince, defaultUntil }: { defaultSince: string; defaultUntil: string }) {
  const [range, setRange] = useState({ since: defaultSince, until: defaultUntil })
  const overview = trpc.community.overview.useQuery()
  const postsDaily = trpc.community.postsDaily.useQuery(range)

  const t = overview.data?.totals
  const maxCatPosts = Math.max(1, ...(overview.data?.categories.map((c) => c.posts) ?? [0]))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Channels" value={t?.totalChannels ?? "—"} />
        <Kpi label="Members" value={t?.totalMembers ?? "—"} />
        <Kpi label="Posts" value={t?.totalPosts ?? "—"} />
        <Kpi label="Active 7d" value={t?.activeChannels7d ?? "—"} sub="channels" />
        <Kpi label="Posts today" value={t?.postsToday ?? "—"} />
        <Kpi label="Reactions" value={t?.totalReactions ?? "—"} />
      </div>

      {/* Moderation callout — only surfaces when there's something to review */}
      {t && t.pendingModeration > 0 && (
        <div className="rounded-xl border border-border-default bg-card p-4 text-sm shadow-[var(--shadow-sm)]">
          <span className="pill pill-warning mr-2">{t.pendingModeration}</span>
          <span className="text-fg-secondary">posts pending moderation review.</span>
        </div>
      )}

      {/* Posts over time */}
      <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="display text-base font-semibold text-fg-primary">Posts over time</h2>
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
        </div>
        {postsDaily.isLoading ? (
          <p className="text-sm text-fg-tertiary">Loading…</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={postsDaily.data ?? []} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gPosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} tickFormatter={(d: string) => d.slice(5)} minTickGap={28} />
              <YAxis tick={{ fontSize: 10, fill: "var(--chart-axis)" }} allowDecimals={false} width={36} />
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: "var(--fg-tertiary)" }} />
              <Area type="monotone" dataKey="posts" name="Posts" stroke="var(--chart-2)" strokeWidth={2} fill="url(#gPosts)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Channels table */}
        <div className="rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)] lg:col-span-2">
          <h2 className="display border-b border-border-subtle px-5 py-3 text-base font-semibold text-fg-primary">All channels</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-deep text-left text-fg-tertiary">
                <tr>
                  <th className="px-4 py-2 font-medium">Channel</th>
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 font-medium">Members</th>
                  <th className="px-4 py-2 font-medium">Posts</th>
                  <th className="px-4 py-2 font-medium">Rating</th>
                  <th className="px-4 py-2 font-medium">Last post</th>
                </tr>
              </thead>
              <tbody>
                {overview.data?.channels.map((c) => (
                  <tr key={c.id} className="border-t border-border-subtle text-fg-secondary hover:bg-card-hover">
                    <td className="px-4 py-2 font-medium text-fg-primary">{c.name}</td>
                    <td className="px-4 py-2">{c.category ?? "—"}</td>
                    <td className="px-4 py-2 tabular-nums">{c.memberCount}</td>
                    <td className="px-4 py-2 tabular-nums">{c.postCount}</td>
                    <td className="px-4 py-2 tabular-nums">{c.ratingCount > 0 ? `${c.avgRating?.toFixed(1)} (${c.ratingCount})` : "—"}</td>
                    <td className="px-4 py-2">{fmtWhen(c.lastPostAt)}</td>
                  </tr>
                ))}
                {overview.isLoading && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-fg-tertiary">Loading…</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
          <h2 className="display mb-4 text-base font-semibold text-fg-primary">By category</h2>
          <div className="space-y-2.5">
            {overview.data?.categories.map((c) => (
              <div key={c.category}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="capitalize text-fg-secondary">{c.category}</span>
                  <span className="tabular-nums text-fg-tertiary">{c.channels} ch · {c.posts} posts</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-deep">
                  <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${Math.max((c.posts / maxCatPosts) * 100, 3)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
