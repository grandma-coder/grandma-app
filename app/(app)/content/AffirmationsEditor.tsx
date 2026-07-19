"use client"
import { useState } from "react"
import { trpc, type RouterOutputs } from "@/lib/trpc"

type Affirmation = RouterOutputs["content"]["affirmations"][number]

function EditModal({
  a,
  onClose,
  onSaved,
}: {
  a: Affirmation | { new: true }
  onClose: () => void
  onSaved: () => void
}) {
  const isNew = "new" in a
  const utils = trpc.useUtils()
  const upsert = trpc.content.upsertAffirmation.useMutation({
    onSuccess: () => {
      utils.content.affirmations.invalidate()
      onSaved()
    },
    onError: (e) => setError(e.message),
  })

  const [text, setText] = useState(isNew ? "" : (a as Affirmation).text)
  const [category, setCategory] = useState(isNew ? "pregnancy" : (a as Affirmation).category)
  const [weekMin, setWeekMin] = useState(isNew ? "" : String((a as Affirmation).weekMin ?? ""))
  const [weekMax, setWeekMax] = useState(isNew ? "" : String((a as Affirmation).weekMax ?? ""))
  const [error, setError] = useState<string | null>(null)

  function save() {
    setError(null)
    if (!text.trim()) return setError("Text is required.")
    upsert.mutate({
      id: isNew ? undefined : (a as Affirmation).id,
      text: text.trim(),
      category: category.trim() || "pregnancy",
      weekMin: weekMin ? Number(weekMin) : null,
      weekMax: weekMax ? Number(weekMax) : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-card p-6 shadow-[var(--shadow-xl)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <h2 className="display text-lg font-semibold text-fg-primary">{isNew ? "New affirmation" : "Edit affirmation"}</h2>
          <button onClick={onClose} className="text-fg-muted hover:text-fg-primary" aria-label="Close">✕</button>
        </div>

        <label className="mb-1 block text-xs font-medium text-fg-tertiary">Affirmation ({text.length}/400)</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={400}
          placeholder="Your body knows exactly what to do…"
          className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <label className="mb-1 block text-xs font-medium text-fg-tertiary">Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-deep px-2.5 py-1.5 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-tertiary">Week min</label>
            <input value={weekMin} onChange={(e) => setWeekMin(e.target.value.replace(/\D/g, ""))} placeholder="—"
              className="w-full rounded-lg border border-border-default bg-deep px-2.5 py-1.5 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-tertiary">Week max</label>
            <input value={weekMax} onChange={(e) => setWeekMax(e.target.value.replace(/\D/g, ""))} placeholder="—"
              className="w-full rounded-lg border border-border-default bg-deep px-2.5 py-1.5 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
          </div>
        </div>
        <p className="mt-1 text-[11px] text-fg-muted">Week min/max optionally gate an affirmation to a pregnancy-week range. Leave blank for all weeks.</p>

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

export function AffirmationsEditor({ isAdmin }: { isAdmin: boolean }) {
  const utils = trpc.useUtils()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const list = trpc.content.affirmations.useQuery({ search: search.trim() || undefined, category: category || undefined })
  const categories = trpc.content.affirmationCategories.useQuery()
  const del = trpc.content.deleteAffirmation.useMutation({ onSuccess: () => utils.content.affirmations.invalidate() })

  const [editing, setEditing] = useState<Affirmation | { new: true } | null>(null)
  const rows = list.data ?? []

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-tertiary">
        The daily affirmations shown in the app. This table is read live by the app, so edits appear instantly —
        no app update needed.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search affirmations…"
          className="min-w-[200px] flex-1 rounded-lg border border-border-default bg-card px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none" />
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-border-default bg-card px-3 py-2 text-sm text-fg-secondary focus:border-accent-400 focus:outline-none">
          <option value="">All categories</option>
          {(categories.data ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {isAdmin && (
          <button onClick={() => setEditing({ new: true })} className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600">
            + New affirmation
          </button>
        )}
      </div>

      <p className="text-xs text-fg-muted">{list.isLoading ? "Loading…" : `${rows.length} affirmation${rows.length === 1 ? "" : "s"}`}</p>

      <div className="space-y-2">
        {rows.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-4 rounded-xl border border-border-default bg-card px-4 py-3 shadow-[var(--shadow-sm)]">
            <div className="min-w-0">
              <p className="text-sm text-fg-primary">{a.text}</p>
              <p className="mt-0.5 text-xs text-fg-muted">
                {a.category}
                {a.weekMin || a.weekMax ? ` · weeks ${a.weekMin ?? "?"}–${a.weekMax ?? "?"}` : ""}
              </p>
            </div>
            {isAdmin && (
              <div className="flex shrink-0 items-center gap-3">
                <button onClick={() => setEditing(a)} className="text-xs font-medium text-accent-500 hover:underline">Edit</button>
                <button onClick={() => { if (window.confirm("Delete this affirmation?")) del.mutate({ id: a.id }) }}
                  className="text-xs font-medium text-fg-tertiary hover:text-[var(--pill-danger-fg)]">Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdmin && editing && <EditModal a={editing} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
    </div>
  )
}
