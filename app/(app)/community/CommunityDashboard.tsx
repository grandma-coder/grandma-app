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

export function CommunityDashboard({ defaultSince, defaultUntil, isAdmin }: { defaultSince: string; defaultUntil: string; isAdmin: boolean }) {
  const [range, setRange] = useState({ since: defaultSince, until: defaultUntil })
  const [tab, setTab] = useState<"overview" | "moderation">("overview")
  const overview = trpc.community.overview.useQuery()
  const postsDaily = trpc.community.postsDaily.useQuery(range)

  const t = overview.data?.totals
  const maxCatPosts = Math.max(1, ...(overview.data?.categories.map((c) => c.posts) ?? [0]))
  const pending = t?.pendingModeration ?? 0

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border-subtle pb-3">
        {(["overview", "moderation"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
              tab === v ? "bg-accent-500 text-white" : "border border-border-default text-fg-tertiary hover:text-fg-primary"
            }`}
          >
            {v}
            {v === "moderation" && pending > 0 && (
              <span className={`ml-1.5 tabular-nums ${tab === v ? "opacity-80" : "text-warning"}`}>{pending}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "moderation" ? (
        <ModerationQueue isAdmin={isAdmin} onChange={() => overview.refetch()} />
      ) : (
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

      {/* Moderation callout — jumps to the queue when there's something to review */}
      {pending > 0 && (
        <button
          onClick={() => setTab("moderation")}
          className="flex w-full items-center gap-2 rounded-xl border border-border-default bg-card p-4 text-left text-sm shadow-[var(--shadow-sm)] hover:bg-card-hover"
        >
          <span className="pill pill-warning">{pending}</span>
          <span className="text-fg-secondary">open report{pending === 1 ? "" : "s"} awaiting review.</span>
          <span className="ml-auto text-xs font-medium text-accent-500">Review →</span>
        </button>
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
      )}
    </div>
  )
}

const REASON_PILL: Record<string, string> = {
  spam: "pill-warning",
  harassment: "pill-danger",
  hate: "pill-danger",
  inappropriate: "pill-warning",
  misinformation: "pill-info",
}

function ModerationQueue({ isAdmin, onChange }: { isAdmin: boolean; onChange: () => void }) {
  const [scope, setScope] = useState<"open" | "resolved" | "all">("open")
  const queue = trpc.moderation.queue.useQuery({ scope })

  const refresh = () => {
    queue.refetch()
    onChange()
  }
  const setStatus = trpc.moderation.setPostStatus.useMutation({ onSuccess: refresh })
  const resolve = trpc.moderation.resolveReport.useMutation({ onSuccess: refresh })

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["open", "resolved", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              scope === s ? "bg-accent-500 text-white" : "border border-border-default text-fg-tertiary hover:text-fg-primary"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {queue.isLoading && <p className="text-sm text-fg-tertiary">Loading…</p>}

      {queue.data && queue.data.length === 0 && (
        <div className="rounded-xl border border-border-default bg-card p-6 text-sm text-fg-secondary shadow-[var(--shadow-sm)]">
          <p className="mb-1 font-medium text-fg-primary">{scope === "open" ? "Nothing to review 🎉" : "No reports"}</p>
          <p className="text-fg-tertiary">User reports from the app land here for triage.</p>
        </div>
      )}

      <div className="space-y-3">
        {queue.data?.map((r) => {
          const busy = setStatus.isPending || resolve.isPending
          return (
            <div key={r.id} className="rounded-xl border border-border-default bg-card p-4 shadow-[var(--shadow-sm)]">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`pill ${REASON_PILL[r.reason ?? ""] ?? "pill-info"}`}>{r.reason ?? "reported"}</span>
                <span className="text-xs text-fg-muted">{r.contentType}</span>
                {r.reportCount > 1 && <span className="pill pill-warning">×{r.reportCount} reports</span>}
                {r.channelName && <span className="text-xs text-fg-tertiary">in {r.channelName}</span>}
                {r.moderationStatus && r.moderationStatus !== "visible" && (
                  <span className="pill pill-danger">{r.moderationStatus}</span>
                )}
                <span className="ml-auto text-xs text-fg-muted">{fmtWhen(r.createdAt)}</span>
              </div>

              {r.content != null ? (
                <p className="mb-2 whitespace-pre-wrap rounded-lg border border-border-subtle bg-deep p-3 text-sm text-fg-secondary">{r.content}</p>
              ) : (
                <p className="mb-2 text-sm text-fg-muted italic">Content unavailable (deleted or not a post).</p>
              )}

              {r.details && <p className="mb-2 text-xs text-fg-tertiary">Reporter note: {r.details}</p>}

              <div className="flex flex-wrap items-center gap-2">
                {r.authorId && (
                  <a href={`/users/${r.authorId}`} className="text-xs font-medium text-accent-500 hover:text-accent-600">
                    author {r.authorName ? `· ${r.authorName}` : ""} →
                  </a>
                )}
                {isAdmin && (
                  <div className="ml-auto flex flex-wrap gap-2">
                    {r.contentType === "post" && r.moderationStatus !== "hidden" && (
                      <button
                        disabled={busy}
                        onClick={() => setStatus.mutate({ postId: r.contentId, status: "hidden" })}
                        className="rounded-lg border border-border-default px-2.5 py-1 text-xs font-medium text-fg-secondary hover:bg-card-hover disabled:opacity-40"
                      >
                        Hide
                      </button>
                    )}
                    {r.contentType === "post" && r.moderationStatus !== "removed" && (
                      <button
                        disabled={busy}
                        onClick={() => setStatus.mutate({ postId: r.contentId, status: "removed" })}
                        className="rounded-lg bg-danger px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    )}
                    {r.contentType === "post" && r.moderationStatus && r.moderationStatus !== "visible" && (
                      <button
                        disabled={busy}
                        onClick={() => setStatus.mutate({ postId: r.contentId, status: "visible" })}
                        className="rounded-lg border border-border-default px-2.5 py-1 text-xs font-medium text-fg-secondary hover:bg-card-hover disabled:opacity-40"
                      >
                        Restore
                      </button>
                    )}
                    <button
                      disabled={busy}
                      onClick={() => resolve.mutate({ id: r.id, outcome: "dismissed" })}
                      className="rounded-lg border border-border-default px-2.5 py-1 text-xs font-medium text-fg-secondary hover:bg-card-hover disabled:opacity-40"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
