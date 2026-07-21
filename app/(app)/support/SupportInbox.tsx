"use client"
import { useState } from "react"
import { trpc } from "@/lib/trpc"

type Status = "open" | "in_progress" | "resolved" | "closed"

const TABS: { value: Status | "all"; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
]

const KIND_PILL: Record<string, string> = {
  bug: "pill-danger",
  question: "pill-info",
  review: "pill-warning",
  feedback: "pill-info",
}

const STATUS_PILL: Record<string, string> = {
  open: "pill-warning",
  in_progress: "pill-info",
  resolved: "pill-success",
  closed: "pill-info",
}

function fmtWhen(iso: string | null): string {
  if (!iso) return "—"
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
}

type Ticket = {
  id: string
  userId: string | null
  email: string | null
  kind: string
  subject: string | null
  message: string
  status: string
  priority: string
  source: string
  rating: number | null
  appVersion: string | null
  platform: string | null
  assignee: string | null
  adminNotes: string | null
  reply: string | null
  createdAt: string | Date
}

export function SupportInbox({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<Status | "all">("open")
  const [selected, setSelected] = useState<Ticket | null>(null)

  const counts = trpc.support.counts.useQuery()
  const list = trpc.support.list.useQuery({ status: tab === "all" ? undefined : tab })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const n = t.value === "all" ? counts.data?.total : counts.data?.[t.value]
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tab === t.value ? "bg-accent-500 text-white" : "border border-border-default text-fg-tertiary hover:text-fg-primary"
              }`}
            >
              {t.label}
              {typeof n === "number" && <span className="ml-1.5 tabular-nums opacity-70">{n}</span>}
            </button>
          )
        })}
      </div>

      {list.isLoading && <p className="text-sm text-fg-tertiary">Loading…</p>}

      {list.data && list.data.length === 0 && (
        <div className="rounded-xl border border-border-default bg-card p-6 text-sm text-fg-secondary shadow-[var(--shadow-sm)]">
          <p className="mb-1 font-medium text-fg-primary">Nothing here</p>
          <p className="text-fg-tertiary">
            No tickets in this view. New reports arrive from the app via the <code className="font-mono text-xs">support_tickets</code> table.
          </p>
        </div>
      )}

      {list.data && list.data.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
              <tr>
                <th className="px-4 py-2.5 font-medium">Ticket</th>
                <th className="px-4 py-2.5 font-medium">Kind</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Assignee</th>
                <th className="px-4 py-2.5 font-medium">Received</th>
              </tr>
            </thead>
            <tbody>
              {(list.data as Ticket[]).map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className="cursor-pointer border-t border-border-subtle text-fg-secondary hover:bg-card-hover"
                >
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-fg-primary">{t.subject || t.message.slice(0, 60)}</div>
                    <div className="text-xs text-fg-muted">{t.email ?? (t.userId ? `${t.userId.slice(0, 8)}…` : "anonymous")}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`pill ${KIND_PILL[t.kind] ?? "pill-info"}`}>{t.kind}</span>
                    {t.priority === "high" && <span className="pill pill-danger ml-1">high</span>}
                  </td>
                  <td className="px-4 py-2.5"><span className={`pill ${STATUS_PILL[t.status] ?? "pill-info"}`}>{t.status.replace("_", " ")}</span></td>
                  <td className="px-4 py-2.5 text-xs text-fg-tertiary">{t.assignee ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs">{fmtWhen(typeof t.createdAt === "string" ? t.createdAt : t.createdAt.toISOString())}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <TicketDrawer
          ticket={selected}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onSaved={() => {
            counts.refetch()
            list.refetch()
            setSelected(null)
          }}
        />
      )}
    </div>
  )
}

function TicketDrawer({ ticket, isAdmin, onClose, onSaved }: { ticket: Ticket; isAdmin: boolean; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<Status>(ticket.status as Status)
  const [priority, setPriority] = useState(ticket.priority)
  const [assignee, setAssignee] = useState(ticket.assignee ?? "")
  const [notes, setNotes] = useState(ticket.adminNotes ?? "")
  const [reply, setReply] = useState("")

  const update = trpc.support.update.useMutation({ onSuccess: onSaved })

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <span className={`pill ${KIND_PILL[ticket.kind] ?? "pill-info"}`}>{ticket.kind}</span>
            {ticket.rating != null && <span className="ml-2 text-sm text-fg-tertiary">{"★".repeat(ticket.rating)}</span>}
          </div>
          <button onClick={onClose} className="text-fg-muted hover:text-fg-primary">✕</button>
        </div>

        <h2 className="display mb-1 text-lg font-semibold text-fg-primary">{ticket.subject || "Feedback"}</h2>
        <p className="mb-1 text-xs text-fg-muted">
          {ticket.email ?? "anonymous"} · {ticket.source} · {ticket.platform ?? "?"} {ticket.appVersion ?? ""}
        </p>
        {ticket.userId && (
          <a href={`/users/${ticket.userId}`} className="text-xs font-medium text-accent-500 hover:text-accent-600">view user →</a>
        )}

        <div className="my-4 rounded-lg border border-border-subtle bg-deep p-3 text-sm text-fg-secondary whitespace-pre-wrap">
          {ticket.message}
        </div>

        {!isAdmin ? (
          <p className="text-xs text-fg-muted">Triage actions are admin-only. You can read and route by assignment offline.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-fg-tertiary">Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="w-full rounded-lg border border-border-default bg-card px-2.5 py-1.5 text-sm text-fg-primary focus:border-accent-400 focus:outline-none">
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-fg-tertiary">Priority</span>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border border-border-default bg-card px-2.5 py-1.5 text-sm text-fg-primary focus:border-accent-400 focus:outline-none">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-fg-tertiary">Assignee (email)</span>
              <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="unassigned" className="w-full rounded-lg border border-border-default bg-card px-2.5 py-1.5 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none" />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-fg-tertiary">Internal notes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-border-default bg-card px-2.5 py-1.5 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none" />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-fg-tertiary">Reply sent (recorded)</span>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder={ticket.reply ?? "What you replied — recorded for the audit trail"} className="w-full rounded-lg border border-border-default bg-card px-2.5 py-1.5 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none" />
              <span className="mt-1 block text-[11px] text-fg-muted">Recording only — this doesn&apos;t deliver the message to the user.</span>
            </label>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() =>
                  update.mutate({
                    id: ticket.id,
                    status,
                    priority: priority as "low" | "normal" | "high",
                    assignee: assignee.trim() || null,
                    adminNotes: notes.trim() || null,
                    reply: reply.trim() || undefined,
                  })
                }
                disabled={update.isPending}
                className="rounded-lg bg-accent-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
              >
                {update.isPending ? "Saving…" : "Save"}
              </button>
              <button onClick={onClose} className="text-sm font-medium text-fg-tertiary hover:text-fg-primary">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
