"use client"
import { useState } from "react"
import { trpc } from "@/lib/trpc"

const PERIODS = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "14d", label: "14d" },
] as const

function LevelPill({ level }: { level: string }) {
  const map: Record<string, string> = {
    fatal: "pill-danger",
    error: "pill-danger",
    warning: "pill-warning",
    info: "pill-info",
    debug: "pill-info",
  }
  return <span className={`pill ${map[level] ?? "pill-info"}`}>{level}</span>
}

function fmtWhen(iso: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
}

export function SentryConsole() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["value"]>("24h")
  const { data, isLoading } = trpc.sentry.issues.useQuery({ statsPeriod: period })

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              period === p.value ? "bg-accent-500 text-white" : "border border-border-default text-fg-tertiary hover:text-fg-primary"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-fg-tertiary">Loading…</p>}

      {data && !data.configured && (
        <div className="rounded-xl border border-border-default bg-card p-6 text-sm text-fg-secondary shadow-[var(--shadow-sm)]">
          <p className="mb-1 font-medium text-fg-primary">Sentry not configured</p>
          <p className="text-fg-tertiary">
            Set <code className="font-mono text-xs">SENTRY_AUTH_TOKEN</code> (read scope, org{" "}
            <span className="font-mono">grandmaapp</span>) in the environment to pull live issues.
          </p>
        </div>
      )}

      {data?.error && (
        <p className="text-sm text-danger">Sentry error: {data.error}</p>
      )}

      {data?.configured && !data.error && (
        data.issues.length === 0 ? (
          <p className="text-sm text-fg-muted">No unresolved issues in this window. 🎉</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
            <table className="w-full text-sm">
              <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Issue</th>
                  <th className="px-4 py-2.5 font-medium">Level</th>
                  <th className="px-4 py-2.5 font-medium">Events</th>
                  <th className="px-4 py-2.5 font-medium">Users</th>
                  <th className="px-4 py-2.5 font-medium">Last seen</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {data.issues.map((i) => (
                  <tr key={i.id} className="border-t border-border-subtle text-fg-secondary hover:bg-card-hover">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-fg-primary">{i.title}</div>
                      {i.culprit && <div className="text-xs text-fg-muted">{i.culprit}</div>}
                    </td>
                    <td className="px-4 py-2.5"><LevelPill level={i.level} /></td>
                    <td className="px-4 py-2.5 tabular-nums">{i.count}</td>
                    <td className="px-4 py-2.5 tabular-nums">{i.userCount}</td>
                    <td className="px-4 py-2.5">{fmtWhen(i.lastSeen)}</td>
                    <td className="px-4 py-2.5">
                      <a href={i.permalink} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-accent-500 hover:text-accent-600">
                        open ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
