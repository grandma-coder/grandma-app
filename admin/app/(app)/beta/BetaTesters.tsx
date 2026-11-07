"use client"
import { useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { trpc } from "@/lib/trpc"

// Tiers with a translated label (messages: beta.tiers.*); unknown tiers show the raw value.
const TIERS = new Set(["free", "premium_solo", "premium_family"])

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.floor((Date.now() - t) / 86_400_000)
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString()
}

export function BetaTesters() {
  const t = useTranslations("beta")
  const utils = trpc.useUtils()
  const list = trpc.beta.list.useQuery()
  const add = trpc.beta.add.useMutation({
    onSuccess: () => {
      setEmail("")
      setName("")
      setNote("")
      setError(null)
      utils.beta.list.invalidate()
    },
    onError: (e) => setError(e.message),
  })
  const remove = trpc.beta.remove.useMutation({ onSuccess: () => utils.beta.list.invalidate() })
  const setTier = trpc.users.setTier.useMutation({ onSuccess: () => utils.beta.list.invalidate() })

  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [platform, setPlatform] = useState<"ios" | "android" | "both">("both")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  const rows = list.data ?? []
  const signedUp = rows.filter((r) => r.signedUp).length

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    add.mutate({ email: email.trim(), name: name.trim() || undefined, platform, note: note.trim() || undefined })
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
        <h2 className="display text-base font-semibold text-fg-primary">{t("add.title")}</h2>
        <p className="mt-1 text-sm text-fg-tertiary">{t("add.body")}</p>
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            type="email"
            required
            placeholder="tester@email.com"
            aria-label={t("add.emailLabel")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none"
          />
          <input
            placeholder={t("add.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as typeof platform)}
            className="rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-secondary focus:border-accent-400 focus:outline-none"
          >
            <option value="both">iOS + Android</option>
            <option value="ios">iOS (TestFlight)</option>
            <option value="android">Android (Play)</option>
          </select>
          <input
            placeholder={t("add.note")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none"
          />
          <div className="sm:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={add.isPending}
              className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50"
            >
              {add.isPending ? t("add.adding") : t("add.submit")}
            </button>
            {error && <span className="text-sm text-[var(--pill-danger-fg)]">{error}</span>}
          </div>
        </form>
      </div>

      {/* Roster */}
      <div className="rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
          <h2 className="display text-base font-semibold text-fg-primary">
            {t("roster.title")} {rows.length > 0 && <span className="text-fg-muted">{t("roster.signedUpCount", { signedUp, total: rows.length })}</span>}
          </h2>
        </div>
        {list.isLoading ? (
          <p className="px-5 py-6 text-sm text-fg-tertiary">{t("loading")}</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-fg-muted">{t("roster.empty")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-deep text-left text-fg-tertiary">
              <tr>
                <th className="px-4 py-2 font-medium">{t("columns.email")}</th>
                <th className="px-4 py-2 font-medium">{t("columns.platform")}</th>
                <th className="px-4 py-2 font-medium">{t("columns.status")}</th>
                <th className="px-4 py-2 font-medium">{t("columns.tier")}</th>
                <th className="px-4 py-2 font-medium">{t("columns.lastActive")}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const active = daysSince(r.lastActive)
                return (
                  <tr key={r.id} className="border-t border-border-subtle text-fg-secondary hover:bg-card-hover">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-fg-primary">{r.name ?? r.email}</div>
                      {r.name && <div className="text-xs text-fg-tertiary">{r.email}</div>}
                      {r.note && <div className="mt-0.5 text-xs text-fg-muted">{r.note}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-xs">{r.platform === "both" ? "iOS + Android" : r.platform}</td>
                    <td className="px-4 py-2.5">
                      {r.signedUp ? (
                        <span className="pill pill-success">{t("status.signedUp")}</span>
                      ) : (
                        <span className="pill">{t("status.invited")}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.signedUp && r.tier ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{TIERS.has(r.tier) ? t(`tiers.${r.tier}`) : r.tier}</span>
                          {r.tier === "free" && r.userId && (
                            <button
                              onClick={() =>
                                setTier.mutate({ userId: r.userId!, tier: "premium_solo", reason: "beta tester comp" })
                              }
                              disabled={setTier.isPending}
                              className="rounded-full bg-accent-500 px-2 py-0.5 text-[11px] font-medium text-white disabled:opacity-50"
                            >
                              {t("roster.grantPremium")}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-fg-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {active == null ? "—" : active === 0 ? t("roster.today") : t("roster.daysAgo", { n: active })}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {r.signedUp && r.userId && (
                        <Link href={`/users/${r.userId}`} className="text-xs font-medium text-accent-500 hover:underline">
                          {t("roster.view")}
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm(t("roster.confirmRemove", { email: r.email }))) remove.mutate({ id: r.id })
                        }}
                        className="ml-3 text-xs font-medium text-fg-tertiary hover:text-[var(--pill-danger-fg)]"
                      >
                        {t("roster.remove")}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* How-to note */}
      <div className="rounded-xl border border-border-subtle bg-deep p-4 text-xs leading-relaxed text-fg-tertiary">
        <p className="mb-1 font-medium text-fg-secondary">{t("howTo.title")}</p>
        <p>
          {t.rich("howTo.body", {
            b: (c) => <span className="font-medium text-fg-primary">{c}</span>,
            pill: (c) => <span className="pill pill-success">{c}</span>,
          })}
        </p>
      </div>
    </div>
  )
}
