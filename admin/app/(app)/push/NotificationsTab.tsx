"use client"
import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { htmlLang, type Locale } from "@/i18n/config"
import { trpc } from "@/lib/trpc"
import { ComposerModal } from "./ComposerModal"

const STATUS_FILTERS = ["", "draft", "scheduled", "sending", "sent", "cancelled", "failed"] as const

/** Display label for a campaign status; unknown values fall back to the raw value. */
function useStatusLabel() {
  const t = useTranslations("push")
  return (s: string) => (t.has(`status.${s}`) ? t(`status.${s}`) : s)
}

function StatusPill({ status }: { status: string }) {
  const t = useTranslations("push")
  const label = useStatusLabel()
  const map: Record<string, string> = {
    sent: "pill-success",
    sending: "pill-warning",
    scheduled: "pill-info",
    draft: "",
    cancelled: "",
    failed: "pill-danger",
  }
  return <span className={`pill ${map[status] ?? ""}`}>{status === "sending" ? t("status.sendingNow") : label(status)}</span>
}

function fmt(iso: string | Date | null, lang: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(lang, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

function fmtDate(iso: string | Date | null, lang: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(lang)
}

export function NotificationsTab({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("push")
  const lang = htmlLang(useLocale() as Locale)
  const statusLabel = useStatusLabel()
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
          placeholder={t("list.searchPlaceholder")}
          className="min-w-[200px] flex-1 rounded-lg border border-border-default bg-card px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="rounded-lg border border-border-default bg-card px-3 py-2 text-sm text-fg-secondary focus:border-accent-400 focus:outline-none"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === "" ? t("list.allStatuses") : statusLabel(s)}
            </option>
          ))}
        </select>
        {isAdmin && (
          <button
            onClick={openNew}
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-600"
          >
            {t("list.new")}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
        <table className="w-full text-sm">
          <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
            <tr>
              <th className="px-4 py-2.5 font-medium">{t("list.colTitle")}</th>
              <th className="px-4 py-2.5 font-medium">{t("list.colStatus")}</th>
              <th className="px-4 py-2.5 font-medium">{t("list.colTarget")}</th>
              <th className="px-4 py-2.5 font-medium">{t("list.colScheduled")}</th>
              <th className="px-4 py-2.5 font-medium">{t("list.colSent")}</th>
              <th className="px-4 py-2.5 font-medium tabular-nums">{t("list.colSentCount")}</th>
              <th className="px-4 py-2.5 font-medium">{t("list.colCreated")}</th>
              {isAdmin && <th className="px-4 py-2.5 font-medium"></th>}
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-6 text-center text-fg-tertiary">
                  {t("loading")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-6 text-center text-fg-muted">
                  {t("list.empty")}
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
                      {c.targetType === "users" ? t("list.targetUsers", { n: c.targetUserIds.length }) : t("list.allUsers")}
                    </td>
                    <td className="px-4 py-2.5">{fmt(c.scheduledAt, lang)}</td>
                    <td className="px-4 py-2.5">{fmt(c.sentAt, lang)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{c.status === "sent" ? c.sentCount : "—"}</td>
                    <td className="px-4 py-2.5">{fmtDate(c.createdAt, lang)}</td>
                    {isAdmin && (
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {editable && (
                          <button
                            onClick={() => openEdit(c.id)}
                            className="text-xs font-medium text-accent-500 hover:underline"
                          >
                            {t("edit")}
                          </button>
                        )}
                        {c.status !== "sent" && c.status !== "sending" && (
                          <button
                            onClick={() => {
                              if (window.confirm(c.status === "scheduled" ? t("list.confirmCancel") : t("list.confirmDelete")))
                                cancel.mutate({ campaignId: c.id })
                            }}
                            className="ml-3 text-xs font-medium text-fg-tertiary hover:text-[var(--pill-danger-fg)]"
                          >
                            {c.status === "scheduled" ? t("cancel") : t("list.delete")}
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
