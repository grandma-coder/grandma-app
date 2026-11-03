"use client"
import { useState } from "react"
import { trpc, type RouterOutputs } from "@/lib/trpc"
import { CollapsibleSection } from "./CollapsibleSection"

type Affirmation = RouterOutputs["content"]["affirmations"][number]

// Category → behavior-style accent dot (affirmations group by category, which
// maps to a journey behavior). Unknown categories fall back to the general green.
const CATEGORY_DOT: Record<string, string> = {
  "pre-pregnancy": "#E58BB4",
  cycle: "#E58BB4",
  pregnancy: "#B7A6E8",
  kids: "#8BB8E8",
}
function dotFor(category: string): string {
  return CATEGORY_DOT[category] ?? "#BDD48C"
}
function labelFor(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, " ")
}

function EditModal({
  a,
  onClose,
  onSaved,
}: {
  a: Affirmation | { new: true; category?: string }
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
  const [category, setCategory] = useState(isNew ? (a as { category?: string }).category ?? "pregnancy" : (a as Affirmation).category)
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
  const list = trpc.content.affirmations.useQuery({ search: search.trim() || undefined })
  const categories = trpc.content.affirmationCategories.useQuery()
  const del = trpc.content.deleteAffirmation.useMutation({ onSuccess: () => utils.content.affirmations.invalidate() })

  const [editing, setEditing] = useState<Affirmation | { new: true; category?: string } | null>(null)
  const rows = list.data ?? []

  // Group by category (behavior-style), ordered by the known category list then
  // any extras. Search filters within groups; empty groups drop out.
  const known = ["pre-pregnancy", "cycle", "pregnancy", "kids"]
  const present = Array.from(new Set([...(categories.data ?? []), ...rows.map((r) => r.category)]))
  const ordered = [...known.filter((k) => present.includes(k)), ...present.filter((c) => !known.includes(c)).sort()]

  return (
    <div className="space-y-6">
      <p className="text-sm text-fg-tertiary">
        The daily affirmations shown in the app, grouped by category. This table is read live by the app, so edits
        appear instantly — no app update needed.
      </p>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search affirmations…"
        className="w-full rounded-lg border border-border-default bg-card px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none" />

      {list.isLoading ? (
        <p className="text-sm text-fg-tertiary">Loading…</p>
      ) : (
        ordered.map((cat) => {
          const items = rows.filter((r) => r.category === cat)
          if (items.length === 0 && !search) {
            // still render empty known groups so admins can add into them
            if (!known.includes(cat)) return null
          }
          return (
            <CollapsibleSection
              key={cat}
              dot={dotFor(cat)}
              title={labelFor(cat)}
              meta={`${items.length} affirmation${items.length === 1 ? "" : "s"}`}
              collapsedSummary={`${items.length}`}
              action={
                isAdmin ? (
                  <button onClick={() => setEditing({ new: true, category: cat })} className="rounded-lg bg-accent-500 px-3 py-1 text-xs font-medium text-white hover:bg-accent-600">
                    + Add
                  </button>
                ) : undefined
              }
            >
              {items.length === 0 ? (
                <p className="rounded-xl border border-border-subtle bg-deep px-4 py-3 text-sm text-fg-muted">No affirmations in this category yet.</p>
              ) : (
                <div className="space-y-2">
                  {items.map((a) => (
                    <div key={a.id} className="flex items-start justify-between gap-4 rounded-xl border border-border-default bg-card px-4 py-3 shadow-[var(--shadow-sm)]">
                      <div className="min-w-0">
                        <p className="text-sm text-fg-primary">{a.text}</p>
                        {(a.weekMin || a.weekMax) && (
                          <p className="mt-0.5 text-xs text-fg-muted">weeks {a.weekMin ?? "?"}–{a.weekMax ?? "?"}</p>
                        )}
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
              )}
            </CollapsibleSection>
          )
        })
      )}

      {isAdmin && editing && <EditModal a={editing} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
    </div>
  )
}
