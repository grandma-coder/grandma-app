"use client"
import { useState } from "react"
import { trpc, type RouterOutputs } from "@/lib/trpc"

type Question = RouterOutputs["content"]["dailyQuestions"][number]
type Option = { label: string; tags: string[] }

const MODES: { key: string; label: string; dot: string }[] = [
  { key: "pre-pregnancy", label: "Pre-Pregnancy", dot: "#E58BB4" },
  { key: "pregnancy", label: "Pregnancy", dot: "#B7A6E8" },
  { key: "kids", label: "Kids", dot: "#8BB8E8" },
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
    if (!id.trim()) return setError("An id is required (e.g. q_099 / pq_099).")
    if (!prompt.trim()) return setError("A prompt is required.")
    if (clean.length < 2) return setError("At least 2 options with a label are required.")
    upsert.mutate({ id: id.trim(), mode: mode as "pregnancy" | "pre-pregnancy" | "kids", prompt: prompt.trim(), options: clean, active: true, sort: isNew ? 999 : (q as Question).sort })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border-default bg-card p-6 shadow-[var(--shadow-xl)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <h2 className="display text-lg font-semibold text-fg-primary">{isNew ? "New question" : "Edit question"}</h2>
          <button onClick={onClose} className="text-fg-muted hover:text-fg-primary" aria-label="Close">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-tertiary">ID</label>
            <input value={id} onChange={(e) => setId(e.target.value)} disabled={!isNew} placeholder="q_099"
              className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 font-mono text-sm text-fg-primary disabled:opacity-60 focus:border-accent-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-tertiary">Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-secondary focus:border-accent-400 focus:outline-none">
              {MODES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-fg-tertiary">Prompt</label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} maxLength={300}
            className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-fg-tertiary">Options ({options.length})</label>
            {options.length < 6 && (
              <button onClick={() => setOptions((p) => [...p, { label: "", tags: [] }])} className="text-xs font-medium text-accent-500 hover:underline">+ add option</button>
            )}
          </div>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input value={o.label} onChange={(e) => setOpt(i, { label: e.target.value })} placeholder="Label"
                  className="w-1/3 rounded-lg border border-border-default bg-deep px-2.5 py-1.5 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
                <input value={o.tags.join(", ")} onChange={(e) => setOpt(i, { tags: e.target.value.split(",").map((t) => t.trim()) })} placeholder="tags, comma-separated"
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
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-fg-tertiary hover:text-fg-primary">Cancel</button>
          <button onClick={save} disabled={upsert.isPending} className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50">
            {upsert.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

export function DailyQuestionsEditor({ isAdmin }: { isAdmin: boolean }) {
  const utils = trpc.useUtils()
  const list = trpc.content.dailyQuestions.useQuery()
  const setActive = trpc.content.setDailyQuestionActive.useMutation({ onSuccess: () => utils.content.dailyQuestions.invalidate() })

  const [editing, setEditing] = useState<Question | { new: true; mode: string } | null>(null)

  const rows = list.data ?? []

  return (
    <div className="space-y-6">
      <p className="text-sm text-fg-tertiary">
        The daily check-in questions users answer. Grouped by journey mode. Tags drive which supportive card the app
        shows back. Deactivate to hide a question without deleting it.
      </p>

      {list.isLoading ? (
        <p className="text-sm text-fg-tertiary">Loading…</p>
      ) : (
        MODES.map((m) => {
          const qs = rows.filter((r) => r.mode === m.key)
          return (
            <section key={m.key}>
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-block size-2.5 rounded-full" style={{ background: m.dot }} />
                <h2 className="display text-base font-semibold text-fg-primary">{m.label}</h2>
                <span className="text-xs text-fg-muted">{qs.filter((q) => q.active).length}/{qs.length} active</span>
                {isAdmin && (
                  <button onClick={() => setEditing({ new: true, mode: m.key })} className="ml-auto rounded-lg bg-accent-500 px-3 py-1 text-xs font-medium text-white hover:bg-accent-600">
                    + Add
                  </button>
                )}
              </div>

              {qs.length === 0 ? (
                <p className="rounded-xl border border-border-subtle bg-deep px-4 py-3 text-sm text-fg-muted">No questions for this mode yet.</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
                      <tr>
                        <th className="px-4 py-2 font-medium">ID</th>
                        <th className="px-4 py-2 font-medium">Prompt</th>
                        <th className="px-4 py-2 font-medium">Options</th>
                        <th className="px-4 py-2 font-medium">Status</th>
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
                            {q.active ? <span className="pill pill-success">active</span> : <span className="pill">off</span>}
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-2 text-right whitespace-nowrap">
                              <button onClick={() => setEditing(q)} className="text-xs font-medium text-accent-500 hover:underline">Edit</button>
                              <button onClick={() => setActive.mutate({ id: q.id, active: !q.active })} className="ml-3 text-xs font-medium text-fg-tertiary hover:text-fg-primary">
                                {q.active ? "Deactivate" : "Activate"}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )
        })
      )}

      {isAdmin && editing && <EditModal q={editing} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
    </div>
  )
}
