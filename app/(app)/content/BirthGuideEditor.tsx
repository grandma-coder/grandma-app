"use client"
import { useState } from "react"
import { trpc, type RouterOutputs } from "@/lib/trpc"
import { CollapsibleSection } from "./CollapsibleSection"

type Topic = RouterOutputs["content"]["birthTopics"][number]
type Source = { label: string; org: string; url: string }

function asSources(v: unknown): Source[] {
  if (!Array.isArray(v)) return []
  return v.map((s) => {
    const o = s as { label?: unknown; org?: unknown; url?: unknown }
    return {
      label: typeof o.label === "string" ? o.label : "",
      org: typeof o.org === "string" ? o.org : "",
      url: typeof o.url === "string" ? o.url : "",
    }
  })
}
function sectionCount(v: unknown): number {
  return Array.isArray(v) ? v.length : 0
}

function TopicEditor({ topic, isAdmin }: { topic: Topic; isAdmin: boolean }) {
  const utils = trpc.useUtils()
  const invalidate = () => utils.content.birthTopics.invalidate()

  const meta = trpc.content.updateBirthTopicMeta.useMutation({ onSuccess: () => { setNotice("Saved."); invalidate() }, onError: (e) => setNotice(e.message) })
  const saveSources = trpc.content.updateBirthTopicSources.useMutation({ onSuccess: () => { setNotice("Sources saved."); invalidate() }, onError: (e) => setNotice(e.message) })
  const saveSections = trpc.content.updateBirthTopicSections.useMutation({ onSuccess: () => { setNotice("Sections saved."); invalidate() }, onError: (e) => setNotice(e.message) })

  const [emoji, setEmoji] = useState(topic.emoji)
  const [title, setTitle] = useState(topic.title)
  const [subtitle, setSubtitle] = useState(topic.subtitle)
  const [disclaimer, setDisclaimer] = useState(topic.disclaimer ?? "")
  const [active, setActive] = useState(topic.active)
  const [sources, setSources] = useState<Source[]>(asSources(topic.sources))
  const [sectionsJson, setSectionsJson] = useState(() => JSON.stringify(topic.sections, null, 2))
  const [showSections, setShowSections] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
      {/* Meta */}
      <div className="grid grid-cols-[64px_1fr] gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-tertiary">Emoji</label>
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} disabled={!isAdmin} maxLength={8}
            className="w-full rounded-lg border border-border-default bg-deep px-2 py-2 text-center text-lg focus:border-accent-400 focus:outline-none disabled:opacity-70" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-tertiary">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!isAdmin} maxLength={120}
            className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none disabled:opacity-70" />
        </div>
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-fg-tertiary">Subtitle</label>
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} disabled={!isAdmin} maxLength={200}
          className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none disabled:opacity-70" />
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-fg-tertiary">Disclaimer (health notice)</label>
        <textarea value={disclaimer} onChange={(e) => setDisclaimer(e.target.value)} disabled={!isAdmin} rows={2} maxLength={600}
          className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none disabled:opacity-70" />
      </div>
      {isAdmin && (
        <div className="mt-3 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-fg-secondary">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
          </label>
          <button
            onClick={() => meta.mutate({ key: topic.key, emoji, title, subtitle, disclaimer: disclaimer || null, active })}
            disabled={meta.isPending}
            className="ml-auto rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-600 disabled:opacity-50"
          >
            {meta.isPending ? "Saving…" : "Save details"}
          </button>
        </div>
      )}

      {/* Sources */}
      <div className="mt-5 border-t border-border-subtle pt-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-fg-primary">Sources ({sources.length})</h4>
          {isAdmin && (
            <button onClick={() => setSources((s) => [...s, { label: "", org: "", url: "" }])} className="text-xs font-medium text-accent-500 hover:underline">+ add source</button>
          )}
        </div>
        <div className="space-y-2">
          {sources.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input value={s.org} onChange={(e) => setSources((p) => p.map((x, j) => j === i ? { ...x, org: e.target.value } : x))} disabled={!isAdmin} placeholder="Org (ACOG, 2021)"
                className="w-1/4 rounded-lg border border-border-default bg-deep px-2 py-1.5 text-xs text-fg-primary focus:border-accent-400 focus:outline-none disabled:opacity-70" />
              <input value={s.label} onChange={(e) => setSources((p) => p.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} disabled={!isAdmin} placeholder="Title / label"
                className="flex-1 rounded-lg border border-border-default bg-deep px-2 py-1.5 text-xs text-fg-primary focus:border-accent-400 focus:outline-none disabled:opacity-70" />
              <input value={s.url} onChange={(e) => setSources((p) => p.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} disabled={!isAdmin} placeholder="https://…"
                className="w-1/3 rounded-lg border border-border-default bg-deep px-2 py-1.5 font-mono text-[11px] text-fg-secondary focus:border-accent-400 focus:outline-none disabled:opacity-70" />
              {isAdmin && <button onClick={() => setSources((p) => p.filter((_, j) => j !== i))} className="px-1 text-fg-muted hover:text-[var(--pill-danger-fg)]">✕</button>}
            </div>
          ))}
        </div>
        {isAdmin && (
          <button onClick={() => saveSources.mutate({ key: topic.key, sources: sources.filter((s) => s.label && s.org && s.url) })} disabled={saveSources.isPending}
            className="mt-2 rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-600 disabled:opacity-50">
            {saveSources.isPending ? "Saving…" : "Save sources"}
          </button>
        )}
      </div>

      {/* Sections (JSON) */}
      <div className="mt-5 border-t border-border-subtle pt-4">
        <button onClick={() => setShowSections((v) => !v)} className="flex items-center gap-2 text-sm font-semibold text-fg-primary hover:text-accent-500">
          <span className={`transition-transform ${showSections ? "rotate-90" : ""}`}>▸</span>
          Sections ({sectionCount(topic.sections)}) — advanced JSON edit
        </button>
        {showSections && (
          <div className="mt-2">
            <textarea value={sectionsJson} onChange={(e) => setSectionsJson(e.target.value)} disabled={!isAdmin} rows={14} spellCheck={false}
              className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 font-mono text-xs text-fg-secondary focus:border-accent-400 focus:outline-none disabled:opacity-70" />
            {isAdmin && (
              <button onClick={() => saveSections.mutate({ key: topic.key, sections: sectionsJson })} disabled={saveSections.isPending}
                className="mt-2 rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-600 disabled:opacity-50">
                {saveSections.isPending ? "Saving…" : "Save sections"}
              </button>
            )}
            <p className="mt-1 text-[11px] text-fg-muted">Each section needs a title + content string. Validated before save; a bad paste is rejected, not persisted.</p>
          </div>
        )}
      </div>

      {notice && <p className="mt-3 text-sm text-accent-500">{notice}</p>}
    </div>
  )
}

export function BirthGuideEditor({ isAdmin }: { isAdmin: boolean }) {
  const list = trpc.content.birthTopics.useQuery()
  const topics = list.data ?? []

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-tertiary">
        The birth-guide topics (labor, C-section, pain relief, recovery…) with their medical sources. Read DB-first
        by the app with the bundled copy as fallback. Edit details + sources inline; deep section content via the
        advanced JSON editor.
      </p>

      {list.isLoading ? (
        <p className="text-sm text-fg-tertiary">Loading…</p>
      ) : (
        topics.map((t) => (
          <CollapsibleSection
            key={t.key}
            dot="#B7A6E8"
            title={`${t.emoji} ${t.title}`}
            meta={`${sectionCount(t.sections)} sections · ${asSources(t.sources).length} sources`}
            defaultOpen={false}
            collapsedSummary={t.active ? "active" : "off"}
          >
            <TopicEditor topic={t} isAdmin={isAdmin} />
          </CollapsibleSection>
        ))
      )}
    </div>
  )
}
