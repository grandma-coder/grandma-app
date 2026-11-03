"use client"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { trpc } from "@/lib/trpc"

type Status = "open" | "in_progress" | "resolved" | "closed"
type T = ReturnType<typeof useTranslations>

// Tab label = message key support.tabs.<value>
const TABS: { value: Status | "all" }[] = [
  { value: "open" },
  { value: "in_progress" },
  { value: "resolved" },
  { value: "closed" },
  { value: "all" },
]

/** Display label for a DB enum value (kind/status); falls back to the raw value if it has no message. */
function enumLabel(t: T, group: "kinds" | "statuses", v: string): string {
  return t.has(`${group}.${v}`) ? t(`${group}.${v}`) : v.replace("_", " ")
}

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

function fmtWhen(t: T, iso: string | null): string {
  if (!iso) return "—"
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return t("ago.minutes", { n: mins })
  if (mins < 1440) return t("ago.hours", { n: Math.round(mins / 60) })
  return t("ago.days", { n: Math.round(mins / 1440) })
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
  const t = useTranslations("support")
  const [tab, setTab] = useState<Status | "all">("open")
  const [selected, setSelected] = useState<Ticket | null>(null)

  const counts = trpc.support.counts.useQuery()
  const list = trpc.support.list.useQuery({ status: tab === "all" ? undefined : tab })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tb) => {
          const n = tb.value === "all" ? counts.data?.total : counts.data?.[tb.value]
          return (
            <button
              key={tb.value}
              onClick={() => setTab(tb.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tab === tb.value ? "bg-accent-500 text-white" : "border border-border-default text-fg-tertiary hover:text-fg-primary"
              }`}
            >
              {t(`tabs.${tb.value}`)}
              {typeof n === "number" && <span className="ml-1.5 tabular-nums opacity-70">{n}</span>}
            </button>
          )
        })}
      </div>

      {list.isLoading && <p className="text-sm text-fg-tertiary">{t("loading")}</p>}

      {list.data && list.data.length === 0 && (
        <div className="rounded-xl border border-border-default bg-card p-6 text-sm text-fg-secondary shadow-[var(--shadow-sm)]">
          <p className="mb-1 font-medium text-fg-primary">{t("empty.title")}</p>
          <p className="text-fg-tertiary">
            {t.rich("empty.body", { code: (c) => <code className="font-mono text-xs">{c}</code> })}
          </p>
        </div>
      )}

      {list.data && list.data.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
              <tr>
                <th className="px-4 py-2.5 font-medium">{t("columns.ticket")}</th>
                <th className="px-4 py-2.5 font-medium">{t("columns.kind")}</th>
                <th className="px-4 py-2.5 font-medium">{t("columns.status")}</th>
                <th className="px-4 py-2.5 font-medium">{t("columns.assignee")}</th>
                <th className="px-4 py-2.5 font-medium">{t("columns.received")}</th>
              </tr>
            </thead>
            <tbody>
              {(list.data as Ticket[]).map((tk) => (
                <tr
                  key={tk.id}
                  onClick={() => setSelected(tk)}
                  className="cursor-pointer border-t border-border-subtle text-fg-secondary hover:bg-card-hover"
                >
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-fg-primary">{tk.subject || tk.message.slice(0, 60)}</div>
                    <div className="text-xs text-fg-muted">{tk.email ?? (tk.userId ? `${tk.userId.slice(0, 8)}…` : t("anonymous"))}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`pill ${KIND_PILL[tk.kind] ?? "pill-info"}`}>{enumLabel(t, "kinds", tk.kind)}</span>
                    {tk.priority === "high" && <span className="pill pill-danger ml-1">{t("highPill")}</span>}
                  </td>
                  <td className="px-4 py-2.5"><span className={`pill ${STATUS_PILL[tk.status] ?? "pill-info"}`}>{enumLabel(t, "statuses", tk.status)}</span></td>
                  <td className="px-4 py-2.5 text-xs text-fg-tertiary">{tk.assignee ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs">{fmtWhen(t, typeof tk.createdAt === "string" ? tk.createdAt : tk.createdAt.toISOString())}</td>
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
  const t = useTranslations("support")
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
            <span className={`pill ${KIND_PILL[ticket.kind] ?? "pill-info"}`}>{enumLabel(t, "kinds", ticket.kind)}</span>
            {ticket.rating != null && <span className="ml-2 text-sm text-fg-tertiary">{"★".repeat(ticket.rating)}</span>}
          </div>
          <button onClick={onClose} aria-label={t("drawer.close")} className="text-fg-muted hover:text-fg-primary">✕</button>
        </div>

        <h2 className="display mb-1 text-lg font-semibold text-fg-primary">{ticket.subject || t("drawer.untitled")}</h2>
        <p className="mb-1 text-xs text-fg-muted">
          {ticket.email ?? t("anonymous")} · {ticket.source} · {ticket.platform ?? "?"} {ticket.appVersion ?? ""}
        </p>
        {ticket.userId && (
          <a href={`/users/${ticket.userId}`} className="text-xs font-medium text-accent-500 hover:text-accent-600">{t("drawer.viewUser")}</a>
        )}

        <div className="my-4 rounded-lg border border-border-subtle bg-deep p-3 text-sm text-fg-secondary whitespace-pre-wrap">
          {ticket.message}
        </div>

        {!isAdmin ? (
          <p className="text-xs text-fg-muted">{t("drawer.adminOnly")}</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-fg-tertiary">{t("drawer.status")}</span>
                <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="w-full rounded-lg border border-border-default bg-card px-2.5 py-1.5 text-sm text-fg-primary focus:border-accent-400 focus:outline-none">
                  <option value="open">{t("tabs.open")}</option>
                  <option value="in_progress">{t("tabs.in_progress")}</option>
                  <option value="resolved">{t("tabs.resolved")}</option>
                  <option value="closed">{t("tabs.closed")}</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-fg-tertiary">{t("drawer.priority")}</span>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border border-border-default bg-card px-2.5 py-1.5 text-sm text-fg-primary focus:border-accent-400 focus:outline-none">
                  <option value="low">{t("priorities.low")}</option>
                  <option value="normal">{t("priorities.normal")}</option>
                  <option value="high">{t("priorities.high")}</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-fg-tertiary">{t("drawer.assignee")}</span>
              <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder={t("drawer.unassigned")} className="w-full rounded-lg border border-border-default bg-card px-2.5 py-1.5 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none" />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-fg-tertiary">{t("drawer.notes")}</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-border-default bg-card px-2.5 py-1.5 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none" />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-fg-tertiary">{t("drawer.reply")}</span>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder={ticket.reply ?? t("drawer.replyPlaceholder")} className="w-full rounded-lg border border-border-default bg-card px-2.5 py-1.5 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none" />
              <span className="mt-1 block text-[11px] text-fg-muted">{t("drawer.replyHint")}</span>
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
                {update.isPending ? t("drawer.saving") : t("drawer.save")}
              </button>
              <button onClick={onClose} className="text-sm font-medium text-fg-tertiary hover:text-fg-primary">{t("drawer.cancel")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
