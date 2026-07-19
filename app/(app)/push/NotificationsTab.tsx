"use client"
import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { ComposerModal } from "./ComposerModal"

const STATUS_FILTERS = ["", "draft", "scheduled", "sending", "sent", "cancelled", "failed"] as const

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    sent: "pill-success",
    sending: "pill-warning",
    scheduled: "pill-info",
    draft: "",
    cancelled: "",
    failed: "pill-danger",
  }
  return <span className={`pill ${map[status] ?? ""}`}>{status === "sending" ? "sending…" : status}</span>
}

function fmt(iso: string | Date | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

function fmtDate(iso: string | Date | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString()
}

export function NotificationsTab({ isAdmin }: { isAdmin: boolean }) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("")
  const [composerOpen, setComposerOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const utils = trpc.useUtils()
  const list = trpc.push.list.useQuery({
    search: search.trim() || undefined,
    status: status || undefined,
  })
  const cancel = trpc.push.cancelCampaign.useMutation({
    onSuccess: () => utils.push.list.invalidate(),
  })

  const rows = list.data ?? []
  const editRow = editId ? rows.find((r) => r.id === editId) ?? null : null

  const openNew = () => {
    setEditId(null)
    setComposerOpen(true)
  }
  const openEdit = (id: string) => {
    setEditId(id)
    setComposerOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or body…"
          className="min-w-[200px] flex-1 rounded-lg border border-border-default bg-card px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="rounded-lg border border-border-default bg-card px-3 py-2 text-sm text-fg-secondary focus:border-accent-400 focus:outline-none"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === "" ? "All statuses" : s}
            </option>
          ))}
        </select>
        {isAdmin && (
          <button
            onClick={openNew}
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-600"
          >
            + New notification
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
        <table className="w-full text-sm">
          <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
            <tr>
              <th className="px-4 py-2.5 font-medium">Title</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Target</th>
              <th className="px-4 py-2.5 font-medium">Scheduled</th>
              <th className="px-4 py-2.5 font-medium">Sent</th>
              <th className="px-4 py-2.5 font-medium tabular-nums">Sent #</th>
              <th className="px-4 py-2.5 font-medium">Created</th>
              {isAdmin && <th className="px-4 py-2.5 font-medium"></th>}
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-6 text-center text-fg-tertiary">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-6 text-center text-fg-muted">
                  No notifications yet.
                </td>
              </tr>
            ) : (
              rows.map((c) => {
                const editable = c.status === "draft" || c.status === "scheduled"
                return (
                  <tr key={c.id} className="border-t border-border-subtle text-fg-secondary hover:bg-card-hover">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-fg-primary">{c.title}</div>
                      <div className="max-w-[280px] truncate text-xs text-fg-tertiary">{c.body}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={c.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      {c.targetType === "users" ? `${c.targetUserIds.length} user(s)` : "All users"}
                    </td>
                    <td className="px-4 py-2.5">{fmt(c.scheduledAt)}</td>
                    <td className="px-4 py-2.5">{fmt(c.sentAt)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{c.status === "sent" ? c.sentCount : "—"}</td>
                    <td className="px-4 py-2.5">{fmtDate(c.createdAt)}</td>
                    {isAdmin && (
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {editable && (
                          <button
                            onClick={() => openEdit(c.id)}
                            className="text-xs font-medium text-accent-500 hover:underline"
                          >
                            Edit
                          </button>
                        )}
                        {c.status !== "sent" && c.status !== "sending" && (
                          <button
                            onClick={() => {
                              if (window.confirm(c.status === "scheduled" ? "Cancel this scheduled notification?" : "Delete this notification?"))
                                cancel.mutate({ campaignId: c.id })
                            }}
                            className="ml-3 text-xs font-medium text-fg-tertiary hover:text-[var(--pill-danger-fg)]"
                          >
                            {c.status === "scheduled" ? "Cancel" : "Delete"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {isAdmin && composerOpen && (
        <ComposerModal
          editRow={editRow}
          onClose={() => setComposerOpen(false)}
          onSaved={() => {
            setComposerOpen(false)
            utils.push.list.invalidate()
          }}
        />
      )}
    </div>
  )
}
