"use client"
import { useState } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc"

const MODES = ["", "pre_pregnancy", "pregnancy", "kids"] as const
const TIERS = ["", "free", "premium_solo", "premium_family"] as const

function maskEmail(email: string | null): string {
  if (!email) return "—"
  const [user, domain] = email.split("@")
  if (!domain) return "•••"
  return `${user.slice(0, 2)}•••@${domain}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString()
}

export function UsersTable({ isAdmin }: { isAdmin: boolean }) {
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
            {s.segment}: <b className="text-fg-primary">{s.count}</b>
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name / email…"
          className="rounded-lg border border-border-default bg-card px-3 py-1.5 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none"
        />
        <select value={mode} onChange={(e) => setMode(e.target.value as (typeof MODES)[number])} className="rounded-lg border border-border-default bg-card px-2 py-1.5 text-sm text-fg-secondary focus:border-accent-400 focus:outline-none">
          {MODES.map((m) => <option key={m} value={m}>{m || "all modes"}</option>)}
        </select>
        <select value={tier} onChange={(e) => setTier(e.target.value as (typeof TIERS)[number])} className="rounded-lg border border-border-default bg-card px-2 py-1.5 text-sm text-fg-secondary focus:border-accent-400 focus:outline-none">
          {TIERS.map((t) => <option key={t} value={t}>{t || "all tiers"}</option>)}
        </select>
      </div>

      {isLoading && <p className="text-sm text-fg-tertiary">Loading…</p>}
      {error && <p className="text-sm text-danger">Error: {error.message}</p>}

      {data && (
        <div className="overflow-x-auto rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Mode</th>
                <th className="px-4 py-2.5 font-medium">Tier</th>
                <th className="px-4 py-2.5 font-medium">Lang</th>
                <th className="px-4 py-2.5 font-medium">Logs</th>
                <th className="px-4 py-2.5 font-medium">Last active</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
                {isAdmin && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((u) => (
                <tr key={u.id} className="border-t border-border-subtle text-fg-secondary transition-colors hover:bg-card-hover">
                  <td className="px-4 py-2.5 text-fg-primary">{u.name ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{isAdmin ? u.email ?? "—" : maskEmail(u.email)}</td>
                  <td className="px-4 py-2.5">{u.journeyMode ?? "—"}</td>
                  <td className="px-4 py-2.5">{u.tier ?? "—"}</td>
                  <td className="px-4 py-2.5">{u.language ?? "—"}</td>
                  <td className="px-4 py-2.5">{u.logsCount}</td>
                  <td className="px-4 py-2.5">{fmtDate(u.lastActive)}</td>
                  <td className="px-4 py-2.5">{fmtDate(u.createdAt)}</td>
                  {isAdmin && (
                    <td className="px-4 py-2.5">
                      <Link href={`/users/${u.id}`} className="text-xs font-medium text-accent-500 hover:text-accent-600">
                        detail →
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-6 text-center text-fg-muted">No users match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
