"use client"
import { useState } from "react"
import { trpc, type RouterOutputs } from "@/lib/trpc"

type Template = RouterOutputs["notificationTemplates"]["list"][number]

// Behavior sections, in journey order + General last. Each carries the mode
// accent color used elsewhere in the app for that behavior.
const SECTIONS: { key: string; label: string; blurb: string; dot: string }[] = [
  { key: "pre_pregnancy", label: "Pre-Pregnancy", blurb: "Trying to conceive — cycle & fertility", dot: "#E58BB4" },
  { key: "pregnancy", label: "Pregnancy", blurb: "Expecting — weekly progress, appointments, kicks", dot: "#B7A6E8" },
  { key: "kids", label: "Kids", blurb: "Parents 0–5y — logs, milestones, health", dot: "#8BB8E8" },
  { key: "general", label: "General", blurb: "Across all behaviors — community, care circle, account", dot: "#BDD48C" },
]

function VarBadge({ name }: { name: string }) {
  return (
    <span className="rounded bg-deep px-1.5 py-0.5 font-mono text-[11px] text-fg-tertiary">{`{{${name}}}`}</span>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "live") {
    return <span className="pill pill-success">live</span>
  }
  return (
    <span className="pill" title="A sensible event the app doesn't fire yet — editable now, ready when it ships">
      planned
    </span>
  )
}

export function TemplatesTab({ isAdmin }: { isAdmin: boolean }) {
  const utils = trpc.useUtils()
  const list = trpc.notificationTemplates.list.useQuery()
  const update = trpc.notificationTemplates.update.useMutation({
    onSuccess: () => {
      setEditing(null)
      utils.notificationTemplates.list.invalidate()
    },
  })

  const [editing, setEditing] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState("")
  const [draftBody, setDraftBody] = useState("")

  const rows = list.data ?? []

  function startEdit(t: Template) {
    setEditing(t.type)
    setDraftTitle(t.titleTemplate)
    setDraftBody(t.bodyTemplate)
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-fg-tertiary">
        Push copy sent automatically for each event, grouped by behavior. Use{" "}
        <span className="font-mono text-xs">{"{{variable}}"}</span> placeholders — filled in when the notification is
        sent. <span className="pill pill-success align-middle">live</span> = the app fires this today;{" "}
        <span className="pill align-middle">planned</span> = ready to edit, not wired in the app yet.
      </p>

      {list.isLoading ? (
        <p className="text-sm text-fg-tertiary">Loading…</p>
      ) : (
        SECTIONS.map((section) => {
          const sectionRows = rows.filter((r) => r.behavior === section.key)
          if (sectionRows.length === 0) return null
          const liveCount = sectionRows.filter((r) => r.status === "live").length

          return (
            <section key={section.key}>
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-block size-2.5 rounded-full" style={{ background: section.dot }} />
                <h2 className="display text-base font-semibold text-fg-primary">{section.label}</h2>
                <span className="text-xs text-fg-muted">
                  {section.blurb} · {liveCount}/{sectionRows.length} live
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
                <table className="w-full text-sm">
                  <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Type</th>
                      <th className="px-4 py-2.5 font-medium">Title</th>
                      <th className="px-4 py-2.5 font-medium">Body</th>
                      <th className="px-4 py-2.5 font-medium">Variables</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      {isAdmin && <th className="px-4 py-2.5"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sectionRows.map((t) => {
                      const isEditing = editing === t.type
                      return (
                        <tr key={t.type} className="border-t border-border-subtle align-top text-fg-secondary">
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-deep px-2 py-0.5 font-mono text-[11px] text-fg-secondary">
                              {t.type}
                            </span>
                            {t.description && (
                              <div className="mt-1 max-w-[190px] text-xs text-fg-muted">{t.description}</div>
                            )}
                          </td>
                          {isEditing ? (
                            <>
                              <td className="px-4 py-3">
                                <input
                                  value={draftTitle}
                                  onChange={(e) => setDraftTitle(e.target.value)}
                                  maxLength={100}
                                  className="w-full rounded-lg border border-border-default bg-deep px-2 py-1.5 text-sm text-fg-primary focus:border-accent-400 focus:outline-none"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <textarea
                                  value={draftBody}
                                  onChange={(e) => setDraftBody(e.target.value)}
                                  maxLength={500}
                                  rows={2}
                                  className="w-full rounded-lg border border-border-default bg-deep px-2 py-1.5 text-sm text-fg-primary focus:border-accent-400 focus:outline-none"
                                />
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-fg-primary">{t.titleTemplate}</td>
                              <td className="px-4 py-3">{t.bodyTemplate}</td>
                            </>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {t.variables.length === 0 ? (
                                <span className="text-xs text-fg-muted">—</span>
                              ) : (
                                t.variables.map((v) => <VarBadge key={v} name={v} />)
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={t.status} />
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              {isEditing ? (
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() =>
                                      update.mutate({ type: t.type, titleTemplate: draftTitle, bodyTemplate: draftBody })
                                    }
                                    disabled={update.isPending || !draftTitle.trim() || !draftBody.trim()}
                                    className="rounded-lg bg-accent-500 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                                  >
                                    {update.isPending ? "…" : "Save"}
                                  </button>
                                  <button
                                    onClick={() => setEditing(null)}
                                    className="text-xs font-medium text-fg-tertiary hover:text-fg-primary"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEdit(t)}
                                  className="text-xs font-medium text-accent-500 hover:underline"
                                >
                                  Edit
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
