"use client"
import { useState } from "react"
import { trpc } from "@/lib/trpc"

function VarBadge({ name }: { name: string }) {
  return (
    <span className="rounded bg-deep px-1.5 py-0.5 font-mono text-[11px] text-fg-tertiary">{`{{${name}}}`}</span>
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

  function startEdit(type: string, title: string, body: string) {
    setEditing(type)
    setDraftTitle(title)
    setDraftBody(body)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-fg-tertiary">
        Edit the push copy sent automatically for each event type. Use{" "}
        <span className="font-mono text-xs">{"{{variable}}"}</span> placeholders — they&apos;re filled in when the
        notification is sent.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
        <table className="w-full text-sm">
          <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
            <tr>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Title</th>
              <th className="px-4 py-2.5 font-medium">Body</th>
              <th className="px-4 py-2.5 font-medium">Variables</th>
              {isAdmin && <th className="px-4 py-2.5"></th>}
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="px-4 py-6 text-center text-fg-tertiary">
                  Loading…
                </td>
              </tr>
            ) : (
              rows.map((t) => {
                const isEditing = editing === t.type
                return (
                  <tr key={t.type} className="border-t border-border-subtle align-top text-fg-secondary">
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-deep px-2 py-0.5 font-mono text-[11px] text-fg-secondary">
                        {t.type}
                      </span>
                      {t.description && <div className="mt-1 max-w-[180px] text-xs text-fg-muted">{t.description}</div>}
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
                            onClick={() => startEdit(t.type, t.titleTemplate, t.bodyTemplate)}
                            className="text-xs font-medium text-accent-500 hover:underline"
                          >
                            Edit
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
    </div>
  )
}
