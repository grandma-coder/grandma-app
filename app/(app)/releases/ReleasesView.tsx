"use client"
import { useState } from "react"
import { trpc, type RouterOutputs } from "@/lib/trpc"

type Note = RouterOutputs["releases"]["notes"][number]

function fmt(iso: string | Date | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString()
}

function stateColor(state: string | null): string {
  if (!state) return ""
  if (/VALID|READY_FOR_SALE|ACCEPTED/.test(state)) return "pill-success"
  if (/PROCESSING|PREPARE|WAITING|IN_REVIEW/.test(state)) return "pill-info"
  if (/INVALID|FAILED|REJECTED/.test(state)) return "pill-danger"
  return ""
}

function NoteModal({ version, build, existing, prefill, onClose, onSaved }: {
  version: string
  build: string | null
  existing: Note | undefined
  prefill?: string
  onClose: () => void
  onSaved: () => void
}) {
  const utils = trpc.useUtils()
  const upsert = trpc.releases.upsertNote.useMutation({ onSuccess: () => { utils.releases.notes.invalidate(); onSaved() }, onError: (e) => setError(e.message) })
  const status_ = trpc.releases.status.useQuery()
  const draft = trpc.releases.draftChangelog.useMutation({
    onSuccess: (d) => {
      if (!d.available) { setError("AI changelog isn't configured (set ANTHROPIC_API_KEY)."); return }
      if (d.title) setTitle(d.title)
      if (d.highlights.length) setHighlights(d.highlights.join("\n"))
      if (d.changelog) setChangelog(d.changelog)
    },
    onError: (e) => setError(e.message),
  })
  const [title, setTitle] = useState(existing?.title ?? "")
  const [changelog, setChangelog] = useState(existing?.changelog ?? prefill ?? "")
  const [highlights, setHighlights] = useState((existing?.highlights as string[] | null)?.join("\n") ?? "")
  const [status, setStatus] = useState<"draft" | "shipped">((existing?.status as "draft" | "shipped") ?? "draft")
  const [error, setError] = useState<string | null>(null)
  const aiAvailable = status_.data?.changelogAi ?? false

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border-default bg-card p-6 shadow-[var(--shadow-xl)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="display text-lg font-semibold text-fg-primary">Changelog — v{version}{build ? ` (build ${build})` : ""}</h2>
          <div className="flex items-center gap-2">
            {aiAvailable && (
              <button
                onClick={() => { setError(null); draft.mutate({ commitText: changelog || title || `Release ${version}`, version }) }}
                disabled={draft.isPending}
                className="whitespace-nowrap rounded-lg border border-border-default px-2.5 py-1 text-xs font-medium text-accent-500 hover:border-accent-400 disabled:opacity-50"
              >
                {draft.isPending ? "Drafting…" : "✨ Draft with AI"}
              </button>
            )}
            <button onClick={onClose} className="text-fg-muted hover:text-fg-primary">✕</button>
          </div>
        </div>
        <label className="mb-1 block text-xs font-medium text-fg-tertiary">Headline</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="e.g. Cycle insights + faster home"
          className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
        <label className="mb-1 mt-3 block text-xs font-medium text-fg-tertiary">User-facing highlights (one per line)</label>
        <textarea value={highlights} onChange={(e) => setHighlights(e.target.value)} rows={4} placeholder={"New fertility insights\nFaster loading"}
          className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
        <label className="mb-1 mt-3 block text-xs font-medium text-fg-tertiary">Internal changelog (what shipped)</label>
        <textarea value={changelog} onChange={(e) => setChangelog(e.target.value)} rows={8} maxLength={6000} placeholder="Full notes for the team…"
          className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
        <label className="mt-3 flex items-center gap-2 text-sm text-fg-secondary">
          <input type="checkbox" checked={status === "shipped"} onChange={(e) => setStatus(e.target.checked ? "shipped" : "draft")} /> Mark shipped
        </label>
        {error && <p className="mt-3 text-sm text-[var(--pill-danger-fg)]">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-fg-tertiary hover:text-fg-primary">Cancel</button>
          <button
            onClick={() => upsert.mutate({
              version, build,
              title: title.trim() || null,
              changelog: changelog.trim() || null,
              highlights: highlights.split("\n").map((h) => h.trim()).filter(Boolean),
              status,
              releasedAt: status === "shipped" ? new Date().toISOString() : null,
            })}
            disabled={upsert.isPending}
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50">
            {upsert.isPending ? "Saving…" : "Save changelog"}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ReleasesView({ isAdmin }: { isAdmin: boolean }) {
  const status = trpc.releases.status.useQuery()
  const builds = trpc.releases.builds.useQuery(undefined, { enabled: status.data?.ascConfigured })
  const versions = trpc.releases.versions.useQuery(undefined, { enabled: status.data?.ascConfigured })
  const easBuilds = trpc.releases.easBuilds.useQuery(undefined, { enabled: status.data?.easConfigured })
  const notes = trpc.releases.notes.useQuery()
  const [editing, setEditing] = useState<{ version: string; build: string | null; prefill?: string } | null>(null)
  const [publishing, setPublishing] = useState<{ id: string; version: string } | null>(null)

  const noteByVersion = new Map((notes.data ?? []).map((n) => [n.version, n]))
  const configured = status.data?.ascConfigured
  const canPublish = status.data?.ascWriteEnabled ?? false

  if (status.isLoading) return <p className="text-sm text-fg-tertiary">Loading…</p>

  if (!configured) {
    return (
      <div className="rounded-xl border border-border-default bg-card p-6 shadow-[var(--shadow-sm)]">
        <h2 className="display text-base font-semibold text-fg-primary">Connect App Store Connect</h2>
        <p className="mt-2 text-sm text-fg-tertiary">
          Set these env vars in the command center to pull live builds:
        </p>
        <ul className="mt-3 space-y-1 font-mono text-xs text-fg-secondary">
          <li>APPSTORE_ISSUER_ID</li>
          <li>APPSTORE_KEY_ID</li>
          <li>APPSTORE_PRIVATE_KEY <span className="font-sans text-fg-muted">(.p8 contents)</span></li>
          <li>APPSTORE_APP_ID <span className="font-sans text-fg-muted">(optional — auto-discovered)</span></li>
        </ul>
        <p className="mt-3 text-xs text-fg-muted">Generate a key in App Store Connect → Users and Access → Integrations. Editable changelog below works regardless.</p>
        <div className="mt-6">
          <ChangelogList notes={notes.data ?? []} isAdmin={isAdmin} onEdit={(v) => setEditing({ version: v, build: null })} />
        </div>
        {isAdmin && editing && <NoteModal version={editing.version} build={editing.build} existing={noteByVersion.get(editing.version)} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* EAS builds (git changelog source) */}
      {status.data?.easConfigured && (
        <section>
          <h2 className="display mb-2 text-base font-semibold text-fg-primary">EAS builds — what shipped (git)</h2>
          <div className="overflow-hidden rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
            <table className="w-full text-sm">
              <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
                <tr>
                  <th className="px-4 py-2 font-medium">Version</th>
                  <th className="px-4 py-2 font-medium">Profile</th>
                  <th className="px-4 py-2 font-medium">Commit</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  {isAdmin && <th className="px-4 py-2"></th>}
                </tr>
              </thead>
              <tbody>
                {easBuilds.isLoading ? (
                  <tr><td colSpan={isAdmin ? 5 : 4} className="px-4 py-6 text-center text-fg-tertiary">Loading EAS builds…</td></tr>
                ) : (easBuilds.data ?? []).length === 0 ? (
                  <tr><td colSpan={isAdmin ? 5 : 4} className="px-4 py-6 text-center text-fg-muted">No EAS builds.</td></tr>
                ) : (
                  (easBuilds.data ?? []).map((b) => (
                    <tr key={b.id} className="border-t border-border-subtle text-fg-secondary hover:bg-card-hover">
                      <td className="px-4 py-2.5 font-mono text-fg-primary">v{b.appVersion ?? "?"}{b.buildNumber ? ` (${b.buildNumber})` : ""} <span className="text-fg-muted">{b.platform?.toLowerCase()}</span></td>
                      <td className="px-4 py-2.5 text-xs">{b.profile ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-[11px] text-fg-tertiary">{b.gitCommitHash ?? "—"}</span>
                        {b.gitCommitMessage && <div className="max-w-[320px] truncate text-xs text-fg-secondary">{b.gitCommitMessage.split("\n")[0]}</div>}
                      </td>
                      <td className="px-4 py-2.5"><span className={`pill ${stateColor(b.status)}`}>{(b.status ?? "—").toLowerCase()}</span></td>
                      {isAdmin && (
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => setEditing({ version: b.appVersion ?? "", build: b.buildNumber, prefill: b.gitCommitMessage ?? "" })}
                            className="text-xs font-medium text-accent-500 hover:underline whitespace-nowrap"
                          >
                            → changelog
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* App Store versions */}
      <section>
        <h2 className="display mb-2 text-base font-semibold text-fg-primary">App Store versions</h2>
        {versions.isLoading ? (
          <p className="text-sm text-fg-tertiary">Loading…</p>
        ) : (
          <div className="space-y-2">
            {(versions.data ?? []).map((v) => (
              <div key={v.id} className="flex items-center gap-2 rounded-xl border border-border-default bg-card px-4 py-2.5 text-sm shadow-[var(--shadow-sm)]">
                <span className="font-medium text-fg-primary">v{v.versionString}</span>
                <span className={`pill ${stateColor(v.appStoreState)}`}>{(v.appStoreState ?? "—").replace(/_/g, " ").toLowerCase()}</span>
                {isAdmin && canPublish && (
                  <button onClick={() => setPublishing({ id: v.id, version: v.versionString })} className="ml-auto text-xs font-medium text-accent-500 hover:underline">
                    Publish notes &rarr;
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Builds */}
      <section>
        <h2 className="display mb-2 text-base font-semibold text-fg-primary">Builds ({builds.data?.length ?? 0})</h2>
        <div className="overflow-hidden rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
              <tr>
                <th className="px-4 py-2 font-medium">Build</th>
                <th className="px-4 py-2 font-medium">State</th>
                <th className="px-4 py-2 font-medium">Uploaded</th>
                <th className="px-4 py-2 font-medium">Changelog</th>
                {isAdmin && <th className="px-4 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {builds.isLoading ? (
                <tr><td colSpan={isAdmin ? 5 : 4} className="px-4 py-6 text-center text-fg-tertiary">Loading builds…</td></tr>
              ) : (builds.data ?? []).length === 0 ? (
                <tr><td colSpan={isAdmin ? 5 : 4} className="px-4 py-6 text-center text-fg-muted">No builds found.</td></tr>
              ) : (
                (builds.data ?? []).map((b) => {
                  const note = noteByVersion.get(b.version)
                  return (
                    <tr key={b.id} className="border-t border-border-subtle text-fg-secondary hover:bg-card-hover">
                      <td className="px-4 py-2.5 font-mono text-fg-primary">build {b.version}</td>
                      <td className="px-4 py-2.5">
                        <span className={`pill ${stateColor(b.processingState)}`}>{(b.processingState ?? "—").toLowerCase()}</span>
                        {b.expired && <span className="ml-1 pill">expired</span>}
                      </td>
                      <td className="px-4 py-2.5">{fmt(b.uploadedDate)}</td>
                      <td className="px-4 py-2.5">
                        {note ? (
                          <span className="text-fg-primary">{note.title ?? "documented"} {note.status === "shipped" && <span className="pill pill-success ml-1">shipped</span>}</span>
                        ) : (
                          <span className="text-fg-muted">—</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => setEditing({ version: b.version, build: b.version })} className="text-xs font-medium text-accent-500 hover:underline">
                            {note ? "Edit" : "Add changelog"}
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* All documented changelogs */}
      <section>
        <h2 className="display mb-2 text-base font-semibold text-fg-primary">Documented changelogs</h2>
        <ChangelogList notes={notes.data ?? []} isAdmin={isAdmin} onEdit={(v) => setEditing({ version: v, build: noteByVersion.get(v)?.build ?? null })} />
      </section>

      {isAdmin && editing && <NoteModal version={editing.version} build={editing.build} existing={noteByVersion.get(editing.version)} prefill={editing.prefill} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
      {isAdmin && canPublish && publishing && (
        <PublishModal
          versionId={publishing.id}
          versionString={publishing.version}
          defaultText={noteByVersion.get(publishing.version)?.highlights as string[] | undefined}
          onClose={() => setPublishing(null)}
        />
      )}
    </div>
  )
}

function PublishModal({ versionId, versionString, defaultText, onClose }: {
  versionId: string
  versionString: string
  defaultText?: string[]
  onClose: () => void
}) {
  const publish = trpc.releases.publishWhatsNew.useMutation({
    onSuccess: (r) => setResult(r.ok ? `Published to ${r.updated} localization(s).` : `Failed: ${r.error}`),
    onError: (e) => setResult(`Failed: ${e.message}`),
  })
  const [text, setText] = useState((defaultText ?? []).join("\n"))
  const [confirm, setConfirm] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-card p-6 shadow-[var(--shadow-xl)]" onClick={(e) => e.stopPropagation()}>
        <h2 className="display text-lg font-semibold text-fg-primary">Publish “What’s New” — v{versionString}</h2>
        <p className="mt-2 rounded-lg bg-[var(--pill-warning-bg)] px-3 py-2 text-xs text-[var(--pill-warning-fg)]">
          This writes to App Store Connect — it changes the release notes real users will see for v{versionString}.
        </p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} maxLength={4000} placeholder="What's new in this version…"
          className="mt-3 w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
        <label className="mt-3 flex items-center gap-2 text-sm text-fg-secondary">
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
          I understand this updates the live App Store listing.
        </label>
        {result && <p className="mt-3 text-sm text-accent-500">{result}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-fg-tertiary hover:text-fg-primary">Close</button>
          <button
            onClick={() => publish.mutate({ versionId, versionString, whatsNew: text.trim() })}
            disabled={publish.isPending || !confirm || text.trim().length < 1}
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-40"
          >
            {publish.isPending ? "Publishing…" : "Publish to App Store"}
          </button>
        </div>
      </div>
    </div>
  )
}

function ChangelogList({ notes, isAdmin, onEdit }: { notes: Note[]; isAdmin: boolean; onEdit: (v: string) => void }) {
  const utils = trpc.useUtils()
  const del = trpc.releases.deleteNote.useMutation({ onSuccess: () => utils.releases.notes.invalidate() })
  if (notes.length === 0) return <p className="rounded-xl border border-border-subtle bg-deep px-4 py-3 text-sm text-fg-muted">No changelogs documented yet.</p>
  return (
    <div className="space-y-3">
      {notes.map((n) => (
        <div key={n.version} className="rounded-xl border border-border-default bg-card p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-fg-primary">v{n.version}{n.build ? ` · build ${n.build}` : ""} {n.title ? <span className="font-normal text-fg-tertiary">— {n.title}</span> : null}</p>
              {Array.isArray(n.highlights) && (n.highlights as string[]).length > 0 && (
                <ul className="mt-1 list-inside list-disc text-sm text-fg-secondary">
                  {(n.highlights as string[]).map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              )}
              {n.changelog && <p className="mt-1 whitespace-pre-wrap text-xs text-fg-tertiary">{n.changelog}</p>}
            </div>
            <span className={`pill shrink-0 ${n.status === "shipped" ? "pill-success" : "pill-info"}`}>{n.status}</span>
          </div>
          {isAdmin && (
            <div className="mt-2 flex gap-3 border-t border-border-subtle pt-2 text-xs">
              <button onClick={() => onEdit(n.version)} className="font-medium text-accent-500 hover:underline">Edit</button>
              <button onClick={() => { if (window.confirm(`Delete changelog for v${n.version}?`)) del.mutate({ version: n.version }) }} className="font-medium text-fg-tertiary hover:text-[var(--pill-danger-fg)]">Delete</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
