"use client"
import { useState } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc"

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  premium_solo: "Premium (Solo)",
  premium_family: "Premium (Family)",
}

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
        <h2 className="display text-base font-semibold text-fg-primary">Add a tester</h2>
        <p className="mt-1 text-sm text-fg-tertiary">
          Records who you invited. Send the actual app invite in TestFlight / Play Console — this list
          tracks whether they&apos;ve signed up and lets you grant premium.
        </p>
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            type="email"
            required
            placeholder="tester@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none"
          />
          <input
            placeholder="Name (optional)"
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
            placeholder="Note (optional)"
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
              {add.isPending ? "Adding…" : "Add tester"}
            </button>
            {error && <span className="text-sm text-[var(--pill-danger-fg)]">{error}</span>}
          </div>
        </form>
      </div>

      {/* Roster */}
      <div className="rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
          <h2 className="display text-base font-semibold text-fg-primary">
            Testers {rows.length > 0 && <span className="text-fg-muted">({signedUp}/{rows.length} signed up)</span>}
          </h2>
        </div>
        {list.isLoading ? (
          <p className="px-5 py-6 text-sm text-fg-tertiary">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-fg-muted">No testers yet. Add one above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-deep text-left text-fg-tertiary">
              <tr>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Platform</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Tier</th>
                <th className="px-4 py-2 font-medium">Last active</th>
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
                        <span className="pill pill-success">signed up</span>
                      ) : (
                        <span className="pill">invited</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.signedUp && r.tier ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{TIER_LABELS[r.tier] ?? r.tier}</span>
                          {r.tier === "free" && r.userId && (
                            <button
                              onClick={() =>
                                setTier.mutate({ userId: r.userId!, tier: "premium_solo", reason: "beta tester comp" })
                              }
                              disabled={setTier.isPending}
                              className="rounded-full bg-accent-500 px-2 py-0.5 text-[11px] font-medium text-white disabled:opacity-50"
                            >
                              Grant premium
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-fg-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {active == null ? "—" : active === 0 ? "today" : `${active}d ago`}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {r.signedUp && r.userId && (
                        <Link href={`/users/${r.userId}`} className="text-xs font-medium text-accent-500 hover:underline">
                          view →
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm(`Remove ${r.email} from the beta list?`)) remove.mutate({ id: r.id })
                        }}
                        className="ml-3 text-xs font-medium text-fg-tertiary hover:text-[var(--pill-danger-fg)]"
                      >
                        remove
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
        <p className="mb-1 font-medium text-fg-secondary">How beta invites actually work</p>
        <p>
          This list is a tracker. To give someone the app: add them in{" "}
          <span className="font-medium text-fg-primary">TestFlight</span> (iOS) or{" "}
          <span className="font-medium text-fg-primary">Play Console</span> (Android) — the store emails them the
          build. When they open the app and sign up, they turn <span className="pill pill-success">signed up</span>{" "}
          here and you can grant premium so they test paid features.
        </p>
      </div>
    </div>
  )
}
