"use client"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { trpc, type RouterOutputs } from "@/lib/trpc"
import { CollapsibleSection } from "./CollapsibleSection"

type Question = RouterOutputs["content"]["dailyQuestions"][number]
type Option = { label: string; tags: string[] }

const MODES: { key: string; dot: string }[] = [
  { key: "pre-pregnancy", dot: "#E58BB4" },
  { key: "pregnancy", dot: "#B7A6E8" },
  { key: "kids", dot: "#8BB8E8" },
]

function asOptions(v: unknown): Option[] {
  if (!Array.isArray(v)) return []
  return v.map((o) => {
    const obj = o as { label?: unknown; tags?: unknown }
    return {
      label: typeof obj.label === "string" ? obj.label : "",
      tags: Array.isArray(obj.tags) ? obj.tags.filter((t): t is string => typeof t === "string") : [],
    }
  })
}

function EditModal({
  q,
  onClose,
  onSaved,
}: {
  q: Question | { new: true; mode: string }
  onClose: () => void
  onSaved: () => void
}) {
  const t = useTranslations("content")
  const isNew = "new" in q
  const utils = trpc.useUtils()
  const upsert = trpc.content.upsertDailyQuestion.useMutation({
    onSuccess: () => {
      utils.content.dailyQuestions.invalidate()
      onSaved()
    },
    onError: (e) => setError(e.message),
  })

  const [id, setId] = useState(isNew ? "" : (q as Question).id)
  const [mode, setMode] = useState(q.mode)
  const [prompt, setPrompt] = useState(isNew ? "" : (q as Question).prompt)
  const [options, setOptions] = useState<Option[]>(isNew ? [{ label: "", tags: [] }, { label: "", tags: [] }] : asOptions((q as Question).options))
  const [error, setError] = useState<string | null>(null)

  function setOpt(i: number, patch: Partial<Option>) {
    setOptions((prev) => prev.map((o, j) => (j === i ? { ...o, ...patch } : o)))
  }

  function save() {
    setError(null)
    const clean = options.map((o) => ({ label: o.label.trim(), tags: o.tags.map((t) => t.trim()).filter(Boolean) })).filter((o) => o.label)
    if (!id.trim()) return setError(t("questions.modal.errors.idRequired"))
    if (!prompt.trim()) return setError(t("questions.modal.errors.promptRequired"))
    if (clean.length < 2) return setError(t("questions.modal.errors.minOptions"))
    upsert.mutate({ id: id.trim(), mode: mode as "pregnancy" | "pre-pregnancy" | "kids", prompt: prompt.trim(), options: clean, active: true, sort: isNew ? 999 : (q as Question).sort })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border-default bg-card p-6 shadow-[var(--shadow-xl)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <h2 className="display text-lg font-semibold text-fg-primary">{isNew ? t("questions.modal.newTitle") : t("questions.modal.editTitle")}</h2>
          <button onClick={onClose} className="text-fg-muted hover:text-fg-primary" aria-label={t("ui.close")}>✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-tertiary">{t("questions.modal.id")}</label>
            <input value={id} onChange={(e) => setId(e.target.value)} disabled={!isNew} placeholder="q_099"
              className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 font-mono text-sm text-fg-primary disabled:opacity-60 focus:border-accent-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-tertiary">{t("questions.modal.mode")}</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-secondary focus:border-accent-400 focus:outline-none">
              {MODES.map((m) => <option key={m.key} value={m.key}>{t(`questions.modes.${m.key}`)}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-fg-tertiary">{t("questions.modal.prompt")}</label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} maxLength={300}
            className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-fg-tertiary">{t("questions.modal.options", { n: options.length })}</label>
            {options.length < 6 && (
              <button onClick={() => setOptions((p) => [...p, { label: "", tags: [] }])} className="text-xs font-medium text-accent-500 hover:underline">{t("questions.modal.addOption")}</button>
            )}
          </div>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input value={o.label} onChange={(e) => setOpt(i, { label: e.target.value })} placeholder={t("questions.modal.labelPlaceholder")}
                  className="w-1/3 rounded-lg border border-border-default bg-deep px-2.5 py-1.5 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
                <input value={o.tags.join(", ")} onChange={(e) => setOpt(i, { tags: e.target.value.split(",").map((t) => t.trim()) })} placeholder={t("questions.modal.tagsPlaceholder")}
                  className="flex-1 rounded-lg border border-border-default bg-deep px-2.5 py-1.5 font-mono text-xs text-fg-secondary focus:border-accent-400 focus:outline-none" />
                {options.length > 2 && (
                  <button onClick={() => setOptions((p) => p.filter((_, j) => j !== i))} className="px-1 text-fg-muted hover:text-[var(--pill-danger-fg)]">✕</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-[var(--pill-danger-fg)]">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-fg-tertiary hover:text-fg-primary">{t("ui.cancel")}</button>
          <button onClick={save} disabled={upsert.isPending} className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50">
            {upsert.isPending ? t("ui.saving") : t("ui.save")}
          </button>
        </div>
      </div>
    </div>
  )
}

export function DailyQuestionsEditor({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("content")
  const utils = trpc.useUtils()
  const list = trpc.content.dailyQuestions.useQuery()
  const setActive = trpc.content.setDailyQuestionActive.useMutation({ onSuccess: () => utils.content.dailyQuestions.invalidate() })

  const [editing, setEditing] = useState<Question | { new: true; mode: string } | null>(null)

  const rows = list.data ?? []

  return (
    <div className="space-y-6">
      <p className="text-sm text-fg-tertiary">{t("questions.intro")}</p>

      {list.isLoading ? (
        <p className="text-sm text-fg-tertiary">{t("ui.loading")}</p>
      ) : (
        MODES.map((m) => {
          const qs = rows.filter((r) => r.mode === m.key)
          return (
            <CollapsibleSection
              key={m.key}
              dot={m.dot}
              title={t(`questions.modes.${m.key}`)}
              meta={t("questions.activeCount", { active: qs.filter((q) => q.active).length, total: qs.length })}
              collapsedSummary={t("questions.count", { n: qs.length })}
              action={
                isAdmin ? (
                  <button onClick={() => setEditing({ new: true, mode: m.key })} className="rounded-lg bg-accent-500 px-3 py-1 text-xs font-medium text-white hover:bg-accent-600">
                    {t("ui.add")}
                  </button>
                ) : undefined
              }
            >
              {qs.length === 0 ? (
                <p className="rounded-xl border border-border-subtle bg-deep px-4 py-3 text-sm text-fg-muted">{t("questions.empty")}</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
                      <tr>
                        <th className="px-4 py-2 font-medium">{t("questions.columns.id")}</th>
                        <th className="px-4 py-2 font-medium">{t("questions.columns.prompt")}</th>
                        <th className="px-4 py-2 font-medium">{t("questions.columns.options")}</th>
                        <th className="px-4 py-2 font-medium">{t("questions.columns.status")}</th>
                        {isAdmin && <th className="px-4 py-2"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {qs.map((q) => (
                        <tr key={q.id} className="border-t border-border-subtle text-fg-secondary hover:bg-card-hover">
                          <td className="px-4 py-2 font-mono text-xs text-fg-tertiary">{q.id}</td>
                          <td className="px-4 py-2 text-fg-primary">{q.prompt}</td>
                          <td className="px-4 py-2 text-xs text-fg-tertiary">{asOptions(q.options).map((o) => o.label).join(" · ")}</td>
                          <td className="px-4 py-2">
                            {q.active ? <span className="pill pill-success">{t("ui.active")}</span> : <span className="pill">{t("ui.off")}</span>}
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-2 text-right whitespace-nowrap">
                              <button onClick={() => setEditing(q)} className="text-xs font-medium text-accent-500 hover:underline">{t("ui.edit")}</button>
                              <button onClick={() => setActive.mutate({ id: q.id, active: !q.active })} className="ml-3 text-xs font-medium text-fg-tertiary hover:text-fg-primary">
                                {q.active ? t("questions.deactivate") : t("questions.activate")}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleSection>
          )
        })
      )}

      {isAdmin && editing && <EditModal q={editing} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
    </div>
  )
}
