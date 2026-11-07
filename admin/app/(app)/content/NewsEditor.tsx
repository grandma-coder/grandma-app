"use client"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { trpc, type RouterOutputs } from "@/lib/trpc"
import { CollapsibleSection } from "./CollapsibleSection"

type NewsItem = RouterOutputs["news"]["list"][number]

type Source = { title: string; url: string }
function asSources(v: unknown): Source[] {
  if (!Array.isArray(v)) return []
  return v.map((s) => {
    const o = s as { title?: unknown; url?: unknown }
    return { title: typeof o.title === "string" ? o.title : "", url: typeof o.url === "string" ? o.url : "" }
  })
}

function EditModal({ item, onClose, onSaved }: { item: NewsItem; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations("content")
  const utils = trpc.useUtils()
  const update = trpc.news.update.useMutation({ onSuccess: () => { utils.news.list.invalidate(); onSaved() }, onError: (e) => setError(e.message) })
  const [title, setTitle] = useState(item.title)
  const [summary, setSummary] = useState(item.summary ?? "")
  const [body, setBody] = useState(item.body)
  const [sources, setSources] = useState<Source[]>(asSources(item.sources))
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border-default bg-card p-6 shadow-[var(--shadow-xl)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <h2 className="display text-lg font-semibold text-fg-primary">{t("news.modal.title")}</h2>
          <button onClick={onClose} className="text-fg-muted hover:text-fg-primary" aria-label={t("ui.close")}>✕</button>
        </div>
        <label className="mb-1 block text-xs font-medium text-fg-tertiary">{t("news.modal.titleLabel")}</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140}
          className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
        <label className="mb-1 mt-3 block text-xs font-medium text-fg-tertiary">{t("news.modal.summary")}</label>
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} maxLength={240}
          className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
        <label className="mb-1 mt-3 block text-xs font-medium text-fg-tertiary">{t("news.modal.body")}</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} maxLength={4000}
          className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
        <div className="mt-3 flex items-center justify-between">
          <label className="text-xs font-medium text-fg-tertiary">{t("news.modal.sources", { n: sources.length })}</label>
          <button onClick={() => setSources((s) => [...s, { title: "", url: "" }])} className="text-xs font-medium text-accent-500 hover:underline">{t("news.modal.add")}</button>
        </div>
        <div className="mt-1 space-y-2">
          {sources.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input value={s.title} onChange={(e) => setSources((p) => p.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder={t("news.modal.sourceTitlePlaceholder")}
                className="flex-1 rounded-lg border border-border-default bg-deep px-2 py-1.5 text-xs text-fg-primary focus:border-accent-400 focus:outline-none" />
              <input value={s.url} onChange={(e) => setSources((p) => p.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} placeholder="https://…"
                className="w-1/2 rounded-lg border border-border-default bg-deep px-2 py-1.5 font-mono text-[11px] text-fg-secondary focus:border-accent-400 focus:outline-none" />
              <button onClick={() => setSources((p) => p.filter((_, j) => j !== i))} className="px-1 text-fg-muted hover:text-[var(--pill-danger-fg)]">✕</button>
            </div>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-[var(--pill-danger-fg)]">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-fg-tertiary hover:text-fg-primary">{t("ui.cancel")}</button>
          <button
            onClick={() => update.mutate({ id: item.id, title: title.trim(), summary: summary.trim() || null, body: body.trim(), mode: (item.mode as "pregnancy" | "pre-pregnancy" | "kids" | "general" | null) ?? null, sources: sources.filter((s) => s.title && /^https?:\/\//.test(s.url)) })}
            disabled={update.isPending}
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50">
            {update.isPending ? t("ui.saving") : t("ui.save")}
          </button>
        </div>
      </div>
    </div>
  )
}

function NewsCard({ item, isAdmin, onEdit }: { item: NewsItem; isAdmin: boolean; onEdit: (i: NewsItem) => void }) {
  const t = useTranslations("content")
  const utils = trpc.useUtils()
  const setStatus = trpc.news.setStatus.useMutation({ onSuccess: () => { utils.news.list.invalidate(); utils.news.counts.invalidate() } })
  const del = trpc.news.delete.useMutation({ onSuccess: () => { utils.news.list.invalidate(); utils.news.counts.invalidate() } })
  const sources = asSources(item.sources)

  return (
    <div className="rounded-xl border border-border-default bg-card p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-fg-primary">{item.title}</p>
          {item.summary && <p className="mt-0.5 text-sm text-fg-tertiary">{item.summary}</p>}
        </div>
        <span className={`pill shrink-0 ${item.status === "published" ? "pill-success" : item.status === "archived" ? "" : "pill-info"}`}>{t.has(`news.status.${item.status}`) ? t(`news.status.${item.status}`) : item.status}</span>
      </div>
      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-fg-secondary">{item.body}</p>
      {sources.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {sources.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noreferrer" className="rounded-full bg-deep px-2 py-0.5 text-[11px] text-accent-500 hover:underline">
              {s.title || new URL(s.url).hostname}
            </a>
          ))}
        </div>
      )}
      {isAdmin && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border-subtle pt-3 text-xs">
          <button onClick={() => onEdit(item)} className="font-medium text-accent-500 hover:underline">{t("ui.edit")}</button>
          {item.status !== "published" && (
            <button onClick={() => setStatus.mutate({ id: item.id, status: "published" })} className="font-medium text-[var(--pill-success-fg)] hover:underline">{t("news.publish")}</button>
          )}
          {item.status === "published" && (
            <button onClick={() => setStatus.mutate({ id: item.id, status: "draft" })} className="font-medium text-fg-tertiary hover:text-fg-primary">{t("news.unpublish")}</button>
          )}
          {item.status !== "archived" && (
            <button onClick={() => setStatus.mutate({ id: item.id, status: "archived" })} className="font-medium text-fg-tertiary hover:text-fg-primary">{t("news.archive")}</button>
          )}
          <button onClick={() => { if (window.confirm(t("news.deleteConfirm"))) del.mutate({ id: item.id }) }} className="ml-auto font-medium text-fg-tertiary hover:text-[var(--pill-danger-fg)]">{t("ui.delete")}</button>
        </div>
      )}
    </div>
  )
}

export function NewsEditor({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("content")
  const utils = trpc.useUtils()
  const status = trpc.news.status.useQuery()
  const list = trpc.news.list.useQuery()
  const counts = trpc.news.counts.useQuery()
  const research = trpc.news.research.useMutation({
    onSuccess: (r) => {
      setNotice(r.available ? t("news.researched", { n: r.created }) : t("news.notConfigured"))
      utils.news.list.invalidate()
      utils.news.counts.invalidate()
    },
    onError: (e) => setNotice(e.message),
  })

  const [topic, setTopic] = useState("")
  const [mode, setMode] = useState<"pregnancy" | "pre-pregnancy" | "kids" | "general">("pregnancy")
  const [count, setCount] = useState(3)
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState<NewsItem | null>(null)

  const available = status.data?.researchAvailable ?? false
  const rows = list.data ?? []
  const groups: { key: string; label: string; dot: string }[] = [
    { key: "draft", label: t("news.groups.draft"), dot: "#F5D652" },
    { key: "published", label: t("news.groups.published"), dot: "#BDD48C" },
    { key: "archived", label: t("news.groups.archived"), dot: "#B3AC9C" },
  ]

  return (
    <div className="space-y-6">
      {/* Research composer */}
      <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
        <h2 className="display text-base font-semibold text-fg-primary">{t("news.researchTitle")}</h2>
        <p className="mt-1 text-sm text-fg-tertiary">{t("news.researchIntro")}</p>
        {!available && (
          <p className="mt-2 rounded-lg bg-[var(--pill-warning-bg)] px-3 py-2 text-xs text-[var(--pill-warning-fg)]">
            {t.rich("news.researchOff", { code: (c) => <span className="font-mono">{c}</span> })}
          </p>
        )}
        {isAdmin && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-xs font-medium text-fg-tertiary">{t("news.topic")}</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t("news.topicPlaceholder")}
                className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-tertiary">{t("news.audience")}</label>
              <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className="rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-secondary focus:border-accent-400 focus:outline-none">
                {(["pregnancy", "pre-pregnancy", "kids", "general"] as const).map((m) => (
                  <option key={m} value={m}>{t(`news.audiences.${m}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-tertiary">{t("news.count")}</label>
              <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-secondary focus:border-accent-400 focus:outline-none">
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <button
              onClick={() => { setNotice(null); research.mutate({ topic: topic.trim(), mode, count }) }}
              disabled={research.isPending || !available || topic.trim().length < 2}
              className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-40"
            >
              {research.isPending ? t("news.researching") : t("news.research")}
            </button>
          </div>
        )}
        {notice && <p className="mt-3 text-sm text-accent-500">{notice}</p>}
        {research.isPending && <p className="mt-2 text-xs text-fg-muted">{t("news.researchWait")}</p>}
      </div>

      {/* Queues */}
      {list.isLoading ? (
        <p className="text-sm text-fg-tertiary">{t("ui.loading")}</p>
      ) : (
        groups.map((g) => {
          const items = rows.filter((r) => r.status === g.key)
          return (
            <CollapsibleSection
              key={g.key}
              dot={g.dot}
              title={g.label}
              meta={`${counts.data?.[g.key] ?? items.length}`}
              defaultOpen={g.key !== "archived"}
              collapsedSummary={`${items.length}`}
            >
              {items.length === 0 ? (
                <p className="rounded-xl border border-border-subtle bg-deep px-4 py-3 text-sm text-fg-muted">{t("news.empty")}</p>
              ) : (
                <div className="space-y-3">
                  {items.map((it) => <NewsCard key={it.id} item={it} isAdmin={isAdmin} onEdit={setEditing} />)}
                </div>
              )}
            </CollapsibleSection>
          )
        })
      )}

      {isAdmin && editing && <EditModal item={editing} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
    </div>
  )
}
