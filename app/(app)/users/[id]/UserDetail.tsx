"use client"
import { useState } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { trpc } from "@/lib/trpc"

type Profile = Record<string, unknown>

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  premium_solo: "Premium (Solo)",
  premium_family: "Premium (Family)",
}

const MODE_DOT: Record<string, string> = {
  "pre-pregnancy": "#E58BB4",
  pre_pregnancy: "#E58BB4",
  cycle: "#E58BB4",
  pregnancy: "#B7A6E8",
  kids: "#8BB8E8",
}

function str(p: Profile, k: string): string {
  const v = p[k]
  return v == null || v === "" ? "—" : String(v)
}
function num(p: Profile, k: string): number {
  return Number(p[k] ?? 0)
}

function daysSince(iso: unknown): number | null {
  if (!iso) return null
  const t = new Date(String(iso)).getTime()
  if (Number.isNaN(t) || t <= 0) return null
  return Math.floor((Date.now() - t) / 86_400_000)
}

/** active < 7d · dormant 7–29d · at-risk 30–59d · churned 60d+ */
function lifecycle(days: number | null): { label: string; cls: string } {
  if (days == null) return { label: "no activity", cls: "" }
  if (days < 7) return { label: "active", cls: "pill-success" }
  if (days < 30) return { label: "dormant", cls: "pill-info" }
  if (days < 60) return { label: "at risk", cls: "pill-warning" }
  return { label: "churned", cls: "pill-danger" }
}

function fmtDate(iso: unknown): string {
  if (!iso) return "—"
  const d = new Date(String(iso))
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString()
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

/**
 * Real RevenueCat subscription state for this user — what Apple/Google actually
 * charged, distinct from the in-app tier grant above. Renders nothing when
 * RevenueCat is dormant so the Account card stays clean until it's wired.
 * The query is admin-gated + audit-logged at the router.
 */
function RevenueCatPanel({ userId }: { userId: string }) {
  const { data, isLoading } = trpc.revenue.customer.useQuery({ appUserId: userId }, { staleTime: 60_000, retry: false })

  if (isLoading || !data || !data.configured) return null

  if (!data.found) {
    return (
      <div className="mb-4 rounded-lg border border-border-subtle bg-deep p-3 text-xs text-fg-tertiary">
        <span className="font-medium text-fg-secondary">RevenueCat:</span> no billing record — never subscribed.
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-lg border border-border-subtle bg-deep p-3">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">RevenueCat — real billing</p>
      {data.entitlements.length === 0 ? (
        <p className="text-xs text-fg-tertiary">Known customer, no active subscription.</p>
      ) : (
        <div className="space-y-1.5">
          {data.entitlements.map((e) => (
            <div key={e.identifier} className="flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="font-medium text-fg-primary">{e.productId ?? e.identifier}</span>
                {e.store && <span className="ml-1.5 text-fg-muted">{e.store}</span>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {e.isTrial && <span className="pill pill-info">trial</span>}
                <span className={`pill ${e.isActive ? "pill-success" : "pill-danger"}`}>{e.isActive ? "active" : "expired"}</span>
                <span className="text-fg-tertiary">{e.willRenew ? "renews" : "ends"} {fmtDate(e.expiresAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function UserDetail({ userId, profile }: { userId: string; profile: Profile }) {
  const utils = trpc.useUtils()
  const metrics = trpc.users.detailMetrics.useQuery({ userId, days: 90 })
  const setTier = trpc.users.setTier.useMutation({
    onSuccess: () => {
      setNotice("Subscription updated.")
      utils.users.detail.invalidate()
    },
    onError: (e) => setNotice(e.message),
  })

  const [promoteOpen, setPromoteOpen] = useState(false)
  const [nextTier, setNextTier] = useState<string>((profile.subscription_tier as string) ?? "free")
  const [reason, setReason] = useState("")
  const [notice, setNotice] = useState<string | null>(null)

  const name = str(profile, "name") !== "—" ? str(profile, "name") : str(profile, "email")
  const tier = (profile.subscription_tier as string) ?? "free"
  const mode = str(profile, "journey_mode")
  const lastActiveDays = daysSince(profile.last_active)
  const life = lifecycle(lastActiveDays)
  const behaviors = (profile.behaviors as string[] | null) ?? []
  const deletionRequested = Boolean(profile.deletion_requested)

  const totalLogs = num(profile, "child_logs_count") + num(profile, "cycle_logs_count") + num(profile, "pregnancy_logs_count")
  const accountAgeDays = daysSince(profile.created_at)

  const behaviorRows = [
    { key: "cycle", label: "Pre-Pregnancy (cycle)", count: num(profile, "cycle_logs_count") },
    { key: "pregnancy", label: "Pregnancy", count: num(profile, "pregnancy_logs_count") },
    { key: "kids", label: "Kids (child logs)", count: num(profile, "child_logs_count") },
  ]
  const maxBehavior = Math.max(1, ...behaviorRows.map((b) => b.count))

  function submitTier() {
    setNotice(null)
    setTier.mutate({ userId, tier: nextTier as "free" | "premium_solo" | "premium_family", reason: reason.trim() || undefined })
    setPromoteOpen(false)
  }

  return (
    <div className="mt-3 space-y-6">
      {/* Hero */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {mode !== "—" && (
              <span className="inline-block size-2.5 rounded-full" style={{ background: MODE_DOT[mode] ?? "#BDD48C" }} />
            )}
            <h1 className="display text-2xl font-bold text-fg-primary">{name}</h1>
          </div>
          <p className="mt-0.5 text-sm text-fg-tertiary">{str(profile, "email")}</p>
          <p className="mt-1 text-xs text-fg-muted">id: {userId} · this view was audit-logged</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`pill ${life.cls}`}>{life.label}</span>
          <span className="pill pill-info">{TIER_LABELS[tier] ?? tier}</span>
          {mode !== "—" && <span className="pill">{mode}</span>}
          {deletionRequested && <span className="pill pill-danger">deletion requested</span>}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi
          label="Last active"
          value={lastActiveDays == null ? "—" : lastActiveDays === 0 ? "today" : `${lastActiveDays}d`}
          sub={lastActiveDays == null ? "no activity" : "ago"}
          tone={life.cls === "pill-danger" ? "text-[var(--pill-danger-fg)]" : life.cls === "pill-warning" ? "text-[var(--pill-warning-fg)]" : "text-fg-primary"}
        />
        <Kpi label="Current streak" value={metrics.data ? `${metrics.data.streak}d` : "…"} sub="consecutive days" />
        <Kpi label="Total logs" value={totalLogs} sub={`${num(profile, "logs_30d")} in 30d`} />
        <Kpi label="Account age" value={accountAgeDays == null ? "—" : `${accountAgeDays}d`} sub={fmtDate(profile.created_at)} />
        <Kpi label="Children" value={num(profile, "children_count")} />
        <Kpi label="Devices" value={num(profile, "active_device_count")} sub={`${num(profile, "device_count")} total`} />
      </div>

      {/* Activity chart */}
      <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="display text-base font-semibold text-fg-primary">Activity — last 90 days</h2>
          <span className="text-xs text-fg-muted">{num(profile, "logs_7d")} logs this week</span>
        </div>
        {metrics.isLoading ? (
          <p className="text-sm text-fg-tertiary">Loading…</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={metrics.data?.series ?? []} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
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
              <Area type="monotone" dataKey="count" name="Logs" stroke="var(--chart-2)" strokeWidth={2} fill="url(#gAct)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Behavior breakdown */}
        <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
          <h2 className="display mb-1 text-base font-semibold text-fg-primary">Behavior</h2>
          <p className="mb-4 text-xs text-fg-muted">
            {behaviors.length ? `Enrolled: ${behaviors.join(", ")}` : "Inferred from what they log"}
          </p>
          <div className="space-y-3">
            {behaviorRows.map((b) => (
              <div key={b.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-fg-secondary">
                    <span className="inline-block size-2 rounded-full" style={{ background: MODE_DOT[b.key] }} />
                    {b.label}
                  </span>
                  <span className="tabular-nums text-fg-tertiary">{b.count} logs</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-deep">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.max((b.count / maxBehavior) * 100, b.count ? 3 : 0)}%`, background: MODE_DOT[b.key] }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border-subtle pt-3 text-center">
            <div>
              <p className="display text-lg font-bold tabular-nums text-fg-primary">{num(profile, "posts_count")}</p>
              <p className="text-[10px] uppercase tracking-wide text-fg-muted">posts</p>
            </div>
            <div>
              <p className="display text-lg font-bold tabular-nums text-fg-primary">{num(profile, "comments_count")}</p>
              <p className="text-[10px] uppercase tracking-wide text-fg-muted">comments</p>
            </div>
            <div>
              <p className="display text-lg font-bold tabular-nums text-fg-primary">{num(profile, "total_points")}</p>
              <p className="text-[10px] uppercase tracking-wide text-fg-muted">points</p>
            </div>
          </div>
        </div>

        {/* Account & lifecycle + actions */}
        <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="display text-base font-semibold text-fg-primary">Account</h2>
            <button
              onClick={() => setPromoteOpen((v) => !v)}
              className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-600"
            >
              Change subscription
            </button>
          </div>

          {promoteOpen && (
            <div className="mb-4 rounded-lg border border-border-subtle bg-deep p-3">
              <label className="mb-1 block text-xs font-medium text-fg-tertiary">New tier</label>
              <select
                value={nextTier}
                onChange={(e) => setNextTier(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-card px-2.5 py-1.5 text-sm text-fg-primary focus:border-accent-400 focus:outline-none"
              >
                <option value="free">Free</option>
                <option value="premium_solo">Premium (Solo)</option>
                <option value="premium_family">Premium (Family)</option>
              </select>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional — logged)"
                className="mt-2 w-full rounded-lg border border-border-default bg-card px-2.5 py-1.5 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={submitTier}
                  disabled={setTier.isPending || nextTier === tier}
                  className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                >
                  {setTier.isPending ? "Saving…" : "Apply"}
                </button>
                <button onClick={() => setPromoteOpen(false)} className="text-xs font-medium text-fg-tertiary hover:text-fg-primary">
                  Cancel
                </button>
              </div>
              <p className="mt-2 text-[11px] text-fg-muted">
                Direct grant — unlocks premium in-app immediately. Does not create a paid RevenueCat subscription.
              </p>
            </div>
          )}
          <RevenueCatPanel userId={userId} />
          {notice && <p className="mb-3 text-sm text-accent-500">{notice}</p>}

          <dl className="divide-y divide-border-subtle text-sm">
            {[
              ["Subscription", `${TIER_LABELS[tier] ?? tier} · ${str(profile, "subscription_status")}`],
              ["Joined", fmtDate(profile.created_at)],
              ["Consent", profile.consented_at ? fmtDate(profile.consented_at) : "not given"],
              ["Language", str(profile, "language")],
              ["Country", str(profile, "country_code")],
              ["Due date", fmtDate(profile.due_date)],
              ["Caregivers", `${num(profile, "caregivers_count")} in their circle`],
              ["Caregiver for", `${num(profile, "caregiver_for_count")} other user(s)`],
              ["Notifications", `${num(profile, "notifications_count")} (${num(profile, "notifications_unread")} unread)`],
              ["Verified expert", profile.is_verified_expert ? str(profile, "expert_title") || "yes" : "no"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2">
                <dt className="text-fg-tertiary">{k}</dt>
                <dd className="text-fg-primary">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Raw prefs */}
      <details className="rounded-xl border border-border-default bg-card p-4 text-sm">
        <summary className="cursor-pointer font-medium text-fg-secondary">Notification & privacy settings (JSON)</summary>
        <pre className="mt-2 overflow-x-auto text-xs text-fg-tertiary">
{JSON.stringify({ notification_prefs: profile.notification_prefs, privacy_settings: profile.privacy_settings }, null, 2)}
        </pre>
      </details>
    </div>
  )
}
