"use client"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { trpc } from "@/lib/trpc"

const PERIODS = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "14d", label: "14d" },
] as const

function LevelPill({ level }: { level: string }) {
  const t = useTranslations("sentry")
  const map: Record<string, string> = {
    fatal: "pill-danger",
    error: "pill-danger",
    warning: "pill-warning",
    info: "pill-info",
    debug: "pill-info",
  }
  return <span className={`pill ${map[level] ?? "pill-info"}`}>{t.has(`levels.${level}`) ? t(`levels.${level}`) : level}</span>
}

function fmtWhen(iso: string, ago: (unit: "minutes" | "hours" | "days", n: number) => string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return ago("minutes", mins)
  if (mins < 1440) return ago("hours", Math.round(mins / 60))
  return ago("days", Math.round(mins / 1440))
}

export function SentryConsole() {
  const t = useTranslations("sentry")
  const ago = (unit: "minutes" | "hours" | "days", n: number) => t(`ago.${unit}`, { n })
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

      {isLoading && <p className="text-sm text-fg-tertiary">{t("loading")}</p>}

      {data && !data.configured && (
        <div className="rounded-xl border border-border-default bg-card p-6 text-sm text-fg-secondary shadow-[var(--shadow-sm)]">
          <p className="mb-1 font-medium text-fg-primary">{t("notConfigured.title")}</p>
          <p className="text-fg-tertiary">
            {t.rich("notConfigured.body", {
              code: (c) => <code className="font-mono text-xs">{c}</code>,
              mono: (c) => <span className="font-mono">{c}</span>,
            })}
          </p>
        </div>
      )}

      {data?.error && (
        <p className="text-sm text-danger">{t("error", { error: data.error })}</p>
      )}

      {data?.configured && !data.error && (
        data.issues.length === 0 ? (
          <p className="text-sm text-fg-muted">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
            <table className="w-full text-sm">
              <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{t("columns.issue")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("columns.level")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("columns.events")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("columns.users")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("columns.lastSeen")}</th>
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
                    <td className="px-4 py-2.5">{fmtWhen(i.lastSeen, ago)}</td>
                    <td className="px-4 py-2.5">
                      <a href={i.permalink} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-accent-500 hover:text-accent-600">
                        {t("open")}
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
