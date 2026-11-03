"use client"
import { useState } from "react"
import { trpc } from "@/lib/trpc"

type Role = "admin" | "viewer"

function initials(name: string | null, email: string | null): string {
  const base = name ?? email ?? "?"
  const parts = base.split(/[\s@.]+/).filter(Boolean)
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0]?.toUpperCase() ?? "")
}

function fmtWhen(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`pill ${role === "admin" ? "pill-info" : ""}`}>
      {role === "admin" ? "admin" : "viewer"}
    </span>
  )
}

export function AdminPanel() {
  const utils = trpc.useUtils()
  const roster = trpc.team.roster.useQuery()

  const [email, setEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<Role>("viewer")
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = () => utils.team.roster.invalidate()

  const invite = trpc.team.invite.useMutation({
    onSuccess: (r) => {
      setMsg({ kind: "ok", text: `Invite sent to ${r.email}.` })
      setEmail("")
      setInviteRole("viewer")
      refresh()
    },
    onError: (e) => setMsg({ kind: "err", text: e.message }),
  })

  const setRole = trpc.team.setRole.useMutation({
    onMutate: (v) => setBusyId(v.userId),
    onSuccess: () => { setMsg(null); refresh() },
    onError: (e) => setMsg({ kind: "err", text: e.message }),
    onSettled: () => setBusyId(null),
  })

  const remove = trpc.team.remove.useMutation({
    onMutate: (v) => setBusyId(v.userId),
    onSuccess: () => { setMsg({ kind: "ok", text: "Member removed." }); refresh() },
    onError: (e) => setMsg({ kind: "err", text: e.message }),
    onSettled: () => setBusyId(null),
  })

  const revokeInvite = trpc.team.revokeInvite.useMutation({
    onMutate: (v) => setBusyId(v.invitationId),
    onSuccess: () => { setMsg({ kind: "ok", text: "Invite revoked." }); refresh() },
    onError: (e) => setMsg({ kind: "err", text: e.message }),
    onSettled: () => setBusyId(null),
  })

  const onInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setMsg(null)
    invite.mutate({ email: email.trim(), role: inviteRole })
  }

  const members = roster.data?.members ?? []
  const invites = roster.data?.invites ?? []
  const adminCount = members.filter((m) => m.role === "admin").length

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
        <h2 className="display text-base font-semibold text-fg-primary">Invite a teammate</h2>
        <p className="mt-1 text-sm text-fg-tertiary">
          They&apos;ll get an email to sign in. New members land with the role you pick here.
        </p>
        <form onSubmit={onInvite} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="email"
            required
            placeholder="teammate@mothergames.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as Role)}
            className="rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none"
          >
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={invite.isPending}
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-60"
          >
            {invite.isPending ? "Sending…" : "Send invite"}
          </button>
        </form>
        {msg && (
          <p className={`mt-3 text-sm ${msg.kind === "ok" ? "text-fg-secondary" : "text-[var(--pill-danger-fg)]"}`}>
            {msg.text}
          </p>
        )}
        <p className="mt-3 text-xs text-fg-muted">
          <span className="font-medium text-fg-tertiary">Viewer</span> — read metrics, users, community.{" "}
          <span className="font-medium text-fg-tertiary">Admin</span> — everything, plus PII, push, Sentry &amp; this panel.
        </p>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
          <h2 className="display border-b border-border-subtle px-5 py-3 text-base font-semibold text-fg-primary">
            Pending invites <span className="text-fg-muted">({invites.length})</span>
          </h2>
          <ul className="divide-y divide-border-subtle">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg-primary">{i.email}</p>
                  <p className="text-xs text-fg-tertiary">Invited {fmtWhen(i.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <RoleBadge role={i.role} />
                  <button
                    onClick={() => revokeInvite.mutate({ invitationId: i.id, email: i.email })}
                    disabled={busyId === i.id}
                    className="text-xs font-medium text-[var(--pill-danger-fg)] hover:underline disabled:opacity-50"
                  >
                    {busyId === i.id ? "…" : "Revoke"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Members */}
      <div className="rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
        <h2 className="display border-b border-border-subtle px-5 py-3 text-base font-semibold text-fg-primary">
          Team {roster.data && <span className="text-fg-muted">({members.length})</span>}
        </h2>
        {roster.isLoading ? (
          <p className="px-5 py-6 text-sm text-fg-tertiary">Loading…</p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {members.map((m) => {
              const isLastAdmin = m.role === "admin" && adminCount <= 1
              const busy = busyId === m.id
              return (
                <li key={m.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-deep text-xs font-semibold text-fg-secondary">
                    {initials(m.name, m.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg-primary">
                      {m.name ?? m.email ?? "Unknown"}
                      {m.isSelf && <span className="ml-2 text-xs font-normal text-fg-muted">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-fg-tertiary">
                      {m.email} · last active {fmtWhen(m.lastActiveAt)}
                    </p>
                  </div>

                  <select
                    value={m.role}
                    disabled={busy || m.isSelf || isLastAdmin}
                    onChange={(e) => setRole.mutate({ userId: m.id, role: e.target.value as Role })}
                    title={
                      m.isSelf
                        ? "You can't change your own role"
                        : isLastAdmin
                          ? "Last admin — promote someone else first"
                          : undefined
                    }
                    className="rounded-lg border border-border-default bg-deep px-2.5 py-1.5 text-xs text-fg-primary focus:border-accent-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>

                  <button
                    onClick={() => remove.mutate({ userId: m.id })}
                    disabled={busy || m.isSelf}
                    title={m.isSelf ? "You can't remove yourself" : "Remove from team"}
                    className="text-xs font-medium text-fg-tertiary hover:text-[var(--pill-danger-fg)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
