"use client"
import { useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { htmlLang, type Locale } from "@/i18n/config"
import { trpc } from "@/lib/trpc"

const MODES = ["", "pre_pregnancy", "pregnancy", "kids"] as const
const TIERS = ["", "free", "premium_solo", "premium_family"] as const

const MODE_DOT: Record<string, string> = { pre_pregnancy: "#E58BB4", pregnancy: "#B7A6E8", kids: "#8BB8E8" }
// Short mode labels live in users.modeShort.<mode>.
function normalizeMode(m: string): string {
  return m === "cycle" || m === "pre-pregnancy" ? "pre_pregnancy" : m
}

function maskEmail(email: string | null): string {
  if (!email) return "—"
  const [user, domain] = email.split("@")
  if (!domain) return "•••"
  return `${user.slice(0, 2)}•••@${domain}`
}

function fmtDate(iso: string | null, lang: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(lang)
}

export function UsersTable({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("users")
  const lang = htmlLang(useLocale() as Locale)
  /** Translated label for a DB value under `ns`; unknown values show raw. */
  const label = (ns: string, v: string) => (t.has(`${ns}.${v}`) ? t(`${ns}.${v}`) : v)
  const [mode, setMode] = useState<(typeof MODES)[number]>("")
  const [tier, setTier] = useState<(typeof TIERS)[number]>("")
  const [search, setSearch] = useState("")

  const { data, isLoading, error } = trpc.users.list.useQuery({
    mode: mode || undefined,
    tier: tier || undefined,
    search: search || undefined,
    limit: 50,
    offset: 0,
  })

  const segments = trpc.users.segments.useQuery()

  return (
    <div>
      {/* Segment counts */}
      <div className="mb-4 flex flex-wrap gap-2">
        {segments.data?.map((s) => (
          <span key={s.segment} className="rounded-full bg-deep px-3 py-1 text-xs text-fg-secondary">
            {label("segments", s.segment)}: <b className="text-fg-primary">{s.count}</b>
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("list.searchPlaceholder")}
          className="rounded-lg border border-border-default bg-card px-3 py-1.5 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none"
        />
        <select value={mode} onChange={(e) => setMode(e.target.value as (typeof MODES)[number])} className="rounded-lg border border-border-default bg-card px-2 py-1.5 text-sm text-fg-secondary focus:border-accent-400 focus:outline-none">
          {MODES.map((m) => <option key={m} value={m}>{m ? label("modeOption", m) : t("list.allModes")}</option>)}
        </select>
        <select value={tier} onChange={(e) => setTier(e.target.value as (typeof TIERS)[number])} className="rounded-lg border border-border-default bg-card px-2 py-1.5 text-sm text-fg-secondary focus:border-accent-400 focus:outline-none">
          {TIERS.map((v) => <option key={v} value={v}>{v ? label("tierOption", v) : t("list.allTiers")}</option>)}
        </select>
      </div>

      {isLoading && <p className="text-sm text-fg-tertiary">{t("loading")}</p>}
      {error && <p className="text-sm text-danger">{t("list.error", { message: error.message })}</p>}

      {data && (
        <div className="overflow-x-auto rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
              <tr>
                <th className="px-4 py-2.5 font-medium">{t("list.colName")}</th>
                <th className="px-4 py-2.5 font-medium">{t("list.colEmail")}</th>
                <th className="px-4 py-2.5 font-medium">{t("list.colMode")}</th>
                <th className="px-4 py-2.5 font-medium">{t("list.colTier")}</th>
                <th className="px-4 py-2.5 font-medium">{t("list.colLang")}</th>
                <th className="px-4 py-2.5 font-medium">{t("list.colLogs")}</th>
                <th className="px-4 py-2.5 font-medium">{t("list.colLastActive")}</th>
                <th className="px-4 py-2.5 font-medium">{t("list.colJoined")}</th>
                {isAdmin && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((u) => (
                <tr key={u.id} className="border-t border-border-subtle text-fg-secondary transition-colors hover:bg-card-hover">
                  <td className="px-4 py-2.5 text-fg-primary">{u.name ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{isAdmin ? u.email ?? "—" : maskEmail(u.email)}</td>
                  <td className="px-4 py-2.5">
                    {u.behaviors.length ? (
                      <div className="flex flex-wrap gap-1">
                        {u.behaviors.map((b) => (
                          <span
                            key={b}
                            title={u.journeyMode && normalizeMode(u.journeyMode) === b ? t("list.currentlyActive") : undefined}
                            className="inline-flex items-center gap-1 rounded-full border border-border-subtle px-2 py-0.5 text-xs"
                          >
                            <span className="inline-block size-1.5 rounded-full" style={{ background: MODE_DOT[b] ?? "#BDD48C" }} />
                            {label("modeShort", b)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5">{u.tier ? label("tierOption", u.tier) : "—"}</td>
                  <td className="px-4 py-2.5">{u.language ?? "—"}</td>
                  <td className="px-4 py-2.5">{u.logsCount}</td>
                  <td className="px-4 py-2.5">{fmtDate(u.lastActive, lang)}</td>
                  <td className="px-4 py-2.5">{fmtDate(u.createdAt, lang)}</td>
                  {isAdmin && (
                    <td className="px-4 py-2.5">
                      <Link href={`/users/${u.id}`} className="text-xs font-medium text-accent-500 hover:text-accent-600">
                        {t("list.detail")}
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-6 text-center text-fg-muted">{t("list.empty")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
