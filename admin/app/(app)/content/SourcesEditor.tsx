"use client"
import { useState } from "react"
import { trpc, type RouterOutputs } from "@/lib/trpc"
import { CollapsibleSection } from "./CollapsibleSection"

type Source = RouterOutputs["content"]["sources"][number]

function slug(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)
}

function EditModal({
  s,
  onClose,
  onSaved,
}: {
  s: Source | { new: true }
  onClose: () => void
  onSaved: () => void
}) {
  const isNew = "new" in s
  const utils = trpc.useUtils()
  const upsert = trpc.content.upsertSource.useMutation({
    onSuccess: () => {
      utils.content.sources.invalidate()
      onSaved()
    },
    onError: (e) => setError(e.message),
  })

  const [org, setOrg] = useState(isNew ? "" : (s as Source).org)
  const [title, setTitle] = useState(isNew ? "" : (s as Source).title)
  const [url, setUrl] = useState(isNew ? "" : (s as Source).url)
  const [topic, setTopic] = useState(isNew ? "" : (s as Source).topic ?? "")
  const [key, setKey] = useState(isNew ? "" : (s as Source).key)
  const [active, setActive] = useState(isNew ? true : (s as Source).active)
  const [error, setError] = useState<string | null>(null)

  function save() {
    setError(null)
    const finalKey = isNew ? (key.trim() || slug(`${org}-${title}`)) : key
    if (!org.trim() || !title.trim() || !url.trim()) return setError("Org, title and URL are required.")
    if (!finalKey) return setError("A key is required.")
    upsert.mutate({ key: finalKey, org: org.trim(), title: title.trim(), url: url.trim(), topic: topic.trim() || null, active })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-card p-6 shadow-[var(--shadow-xl)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <h2 className="display text-lg font-semibold text-fg-primary">{isNew ? "New source" : "Edit source"}</h2>
          <button onClick={onClose} className="text-fg-muted hover:text-fg-primary" aria-label="Close">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-tertiary">Org</label>
            <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="ACOG"
              className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-tertiary">Topic</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="pregnancy / kids / …"
              className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-secondary focus:border-accent-400 focus:outline-none" />
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-fg-tertiary">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Gestational diabetes"
            className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-fg-tertiary">URL</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…"
            className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 font-mono text-xs text-fg-secondary focus:border-accent-400 focus:outline-none" />
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-fg-tertiary">Key {isNew && <span className="text-fg-muted">(auto from org+title if blank)</span>}</label>
          <input value={key} onChange={(e) => setKey(e.target.value)} disabled={!isNew} placeholder="acogGdm"
            className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 font-mono text-xs text-fg-primary disabled:opacity-60 focus:border-accent-400 focus:outline-none" />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-fg-secondary">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
        </label>

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

export function SourcesEditor({ isAdmin }: { isAdmin: boolean }) {
  const utils = trpc.useUtils()
  const list = trpc.content.sources.useQuery()
  const del = trpc.content.deleteSource.useMutation({ onSuccess: () => utils.content.sources.invalidate() })
  const [editing, setEditing] = useState<Source | { new: true } | null>(null)

  const rows = list.data ?? []
  const orgs = Array.from(new Set(rows.map((r) => r.org)))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-fg-tertiary">
          The app&apos;s managed medical evidence base — the authority citations (ACOG, CDC, WHO, NICE, Cochrane…)
          behind its health content. Migrated from <span className="font-mono text-xs">lib/medicalSources.ts</span>.
          Content will reference these by key as areas are wired up.
        </p>
        {isAdmin && (
          <button onClick={() => setEditing({ new: true })} className="shrink-0 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600">
            + New source
          </button>
        )}
      </div>

      {list.isLoading ? (
        <p className="text-sm text-fg-tertiary">Loading…</p>
      ) : (
        orgs.map((org) => {
          const items = rows.filter((r) => r.org === org)
          return (
            <CollapsibleSection key={org} dot="#8BB8E8" title={org} meta={`${items.length} source${items.length === 1 ? "" : "s"}`} collapsedSummary={`${items.length}`}>
              <div className="space-y-2">
                {items.map((s) => (
                  <div key={s.key} className="flex items-start justify-between gap-4 rounded-xl border border-border-default bg-card px-4 py-3 shadow-[var(--shadow-sm)]">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fg-primary">
                        {s.title}
                        {!s.active && <span className="ml-2 pill">off</span>}
                      </p>
                      <a href={s.url} target="_blank" rel="noreferrer" className="block truncate font-mono text-xs text-accent-500 hover:underline">{s.url}</a>
                      <p className="mt-0.5 font-mono text-[10px] text-fg-muted">{s.key}{s.topic ? ` · ${s.topic}` : ""}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex shrink-0 items-center gap-3">
                        <button onClick={() => setEditing(s)} className="text-xs font-medium text-accent-500 hover:underline">Edit</button>
                        <button onClick={() => { if (window.confirm(`Delete source "${s.key}"?`)) del.mutate({ key: s.key }) }}
                          className="text-xs font-medium text-fg-tertiary hover:text-[var(--pill-danger-fg)]">Delete</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )
        })
      )}

      {isAdmin && editing && <EditModal s={editing} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
    </div>
  )
}
