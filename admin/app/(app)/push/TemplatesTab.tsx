"use client"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { trpc, type RouterOutputs } from "@/lib/trpc"

type Template = RouterOutputs["notificationTemplates"]["list"][number]

// Behavior sections, in journey order + General last. Each carries the mode
// accent color used elsewhere in the app for that behavior. Label + blurb live
// in push.templates.sections.<key>.
const SECTIONS: { key: string; dot: string }[] = [
  { key: "pre_pregnancy", dot: "#E58BB4" },
  { key: "pregnancy", dot: "#B7A6E8" },
  { key: "kids", dot: "#8BB8E8" },
  { key: "general", dot: "#BDD48C" },
]

function VarBadge({ name }: { name: string }) {
  return (
    <span className="rounded bg-deep px-1.5 py-0.5 font-mono text-[11px] text-fg-tertiary">{`{{${name}}}`}</span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("push.templates")
  if (status === "live") {
    return <span className="pill pill-success">{t("live")}</span>
  }
  return (
    <span className="pill" title={t("plannedHint")}>
      {t("planned")}
    </span>
  )
}

export function TemplatesTab({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("push")
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
  // Sections are expanded by default; a set holds the collapsed ones.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const rows = list.data ?? []

  function startEdit(tpl: Template) {
    setEditing(tpl.type)
    setDraftTitle(tpl.titleTemplate)
    setDraftBody(tpl.bodyTemplate)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-fg-tertiary">
          {t.rich("templates.intro", {
            placeholder: "{{variable}}",
            code: (c) => <span className="font-mono text-xs">{c}</span>,
            live: (c) => <span className="pill pill-success align-middle">{c}</span>,
            planned: (c) => <span className="pill align-middle">{c}</span>,
          })}
        </p>
        <button
          onClick={() => setCollapsed((prev) => (prev.size ? new Set() : new Set(SECTIONS.map((s) => s.key))))}
          className="shrink-0 rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-fg-tertiary hover:text-fg-primary"
        >
          {collapsed.size ? t("templates.expandAll") : t("templates.collapseAll")}
        </button>
      </div>

      {list.isLoading ? (
        <p className="text-sm text-fg-tertiary">{t("loading")}</p>
      ) : (
        SECTIONS.map((section) => {
          const sectionRows = rows.filter((r) => r.behavior === section.key)
          if (sectionRows.length === 0) return null
          const liveCount = sectionRows.filter((r) => r.status === "live").length
          const isCollapsed = collapsed.has(section.key)

          return (
            <section key={section.key}>
              <button
                onClick={() => toggle(section.key)}
                aria-expanded={!isCollapsed}
                className="group mb-2 flex w-full items-center gap-2 text-left"
              >
                <svg
                  viewBox="0 0 16 16"
                  className={`size-3.5 shrink-0 text-fg-muted transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 6l4 4 4-4" />
                </svg>
                <span className="inline-block size-2.5 rounded-full" style={{ background: section.dot }} />
                <h2 className="display text-base font-semibold text-fg-primary group-hover:text-accent-500">
                  {t(`templates.sections.${section.key}.label`)}
                </h2>
                <span className="text-xs text-fg-muted">
                  {t(`templates.sections.${section.key}.blurb`)} · {t("templates.liveCount", { live: liveCount, total: sectionRows.length })}
                </span>
                {isCollapsed && (
                  <span className="ml-auto text-xs text-fg-muted">{t("templates.templatesCount", { n: sectionRows.length })}</span>
                )}
              </button>

              {!isCollapsed && (
              <div className="overflow-x-auto rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
                <table className="w-full text-sm">
                  <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">{t("templates.colType")}</th>
                      <th className="px-4 py-2.5 font-medium">{t("templates.colTitle")}</th>
                      <th className="px-4 py-2.5 font-medium">{t("templates.colBody")}</th>
                      <th className="px-4 py-2.5 font-medium">{t("templates.colVariables")}</th>
                      <th className="px-4 py-2.5 font-medium">{t("templates.colStatus")}</th>
                      {isAdmin && <th className="px-4 py-2.5"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sectionRows.map((tpl) => {
                      const isEditing = editing === tpl.type
                      return (
                        <tr key={tpl.type} className="border-t border-border-subtle align-top text-fg-secondary">
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-deep px-2 py-0.5 font-mono text-[11px] text-fg-secondary">
                              {tpl.type}
                            </span>
                            {tpl.description && (
                              <div className="mt-1 max-w-[190px] text-xs text-fg-muted">{tpl.description}</div>
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
                              <td className="px-4 py-3 text-fg-primary">{tpl.titleTemplate}</td>
                              <td className="px-4 py-3">{tpl.bodyTemplate}</td>
                            </>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {tpl.variables.length === 0 ? (
                                <span className="text-xs text-fg-muted">—</span>
                              ) : (
                                tpl.variables.map((v) => <VarBadge key={v} name={v} />)
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={tpl.status} />
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              {isEditing ? (
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() =>
                                      update.mutate({ type: tpl.type, titleTemplate: draftTitle, bodyTemplate: draftBody })
                                    }
                                    disabled={update.isPending || !draftTitle.trim() || !draftBody.trim()}
                                    className="rounded-lg bg-accent-500 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                                  >
                                    {update.isPending ? t("templates.saving") : t("save")}
                                  </button>
                                  <button
                                    onClick={() => setEditing(null)}
                                    className="text-xs font-medium text-fg-tertiary hover:text-fg-primary"
                                  >
                                    {t("cancel")}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEdit(tpl)}
                                  className="text-xs font-medium text-accent-500 hover:underline"
                                >
                                  {t("edit")}
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
              )}
            </section>
          )
        })
      )}
    </div>
  )
}
