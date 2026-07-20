"use client"
import { Fragment, useState } from "react"
import { trpc, type RouterOutputs } from "@/lib/trpc"

type MergedBuild = RouterOutputs["releases"]["buildsMerged"][number]

function fmt(iso: string | Date | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString()
}
function stateColor(state: string | null): string {
  if (!state) return ""
  if (/VALID|READY_FOR_SALE|ACCEPTED|FINISHED/i.test(state)) return "pill-success"
  if (/PROCESSING|PREPARE|WAITING|IN_REVIEW/i.test(state)) return "pill-info"
  if (/INVALID|FAILED|REJECTED|ERRORED/i.test(state)) return "pill-danger"
  return ""
}

// ── Changelog editor (with AI draft) ─────────────────────────────────────────
function NoteModal({ build, onClose }: { build: MergedBuild; onClose: () => void }) {
  const utils = trpc.useUtils()
  const upsert = trpc.releases.upsertNote.useMutation({ onSuccess: () => { utils.releases.buildsMerged.invalidate(); utils.releases.notes.invalidate(); onClose() }, onError: (e) => setError(e.message) })
  const st = trpc.releases.status.useQuery()
  const draft = trpc.releases.draftChangelog.useMutation({
    onSuccess: (d) => {
      if (!d.available) return setError("AI changelog isn't configured (set ANTHROPIC_API_KEY).")
      if (d.title) setTitle(d.title)
      if (d.highlights.length) setHighlights(d.highlights.join("\n"))
      if (d.changelog) setChangelog(d.changelog)
    },
    onError: (e) => setError(e.message),
  })
  const version = build.noteVersion ?? `${build.appVersion ?? "1.0.0"} (${build.buildNumber})`
  const [title, setTitle] = useState(build.title ?? build.commitMessage?.split("\n")[0] ?? "")
  const [highlights, setHighlights] = useState((build.highlights ?? []).join("\n"))
  const [changelog, setChangelog] = useState(build.changelog ?? build.commitMessage ?? "")
  const [status, setStatus] = useState<"draft" | "shipped">((build.noteStatus as "draft" | "shipped") ?? "shipped")
  const [error, setError] = useState<string | null>(null)
  const aiAvailable = st.data?.changelogAi ?? false

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border-default bg-card p-6 shadow-[var(--shadow-xl)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="display text-lg font-semibold text-fg-primary">Changelog — build {build.buildNumber}</h2>
          <div className="flex items-center gap-2">
            {aiAvailable && (
              <button onClick={() => { setError(null); draft.mutate({ commitText: changelog || build.commitMessage || title || `Build ${build.buildNumber}`, version }) }} disabled={draft.isPending}
                className="whitespace-nowrap rounded-lg border border-border-default px-2.5 py-1 text-xs font-medium text-accent-500 hover:border-accent-400 disabled:opacity-50">
                {draft.isPending ? "Drafting…" : "✨ Draft with AI"}
              </button>
            )}
            <button onClick={onClose} className="text-fg-muted hover:text-fg-primary">✕</button>
          </div>
        </div>
        {build.commitMessage && <p className="mb-3 rounded-lg bg-deep px-3 py-2 font-mono text-[11px] text-fg-tertiary">git {build.commitHash}: {build.commitMessage.split("\n")[0]}</p>}
        <label className="mb-1 block text-xs font-medium text-fg-tertiary">Headline</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160}
          className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
        <label className="mb-1 mt-3 block text-xs font-medium text-fg-tertiary">User-facing highlights (one per line)</label>
        <textarea value={highlights} onChange={(e) => setHighlights(e.target.value)} rows={4}
          className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
        <label className="mb-1 mt-3 block text-xs font-medium text-fg-tertiary">Changelog / notes</label>
        <textarea value={changelog} onChange={(e) => setChangelog(e.target.value)} rows={7} maxLength={6000}
          className="w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
        <label className="mt-3 flex items-center gap-2 text-sm text-fg-secondary">
          <input type="checkbox" checked={status === "shipped"} onChange={(e) => setStatus(e.target.checked ? "shipped" : "draft")} /> Mark shipped
        </label>
        {error && <p className="mt-3 text-sm text-[var(--pill-danger-fg)]">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-fg-tertiary hover:text-fg-primary">Cancel</button>
          <button
            onClick={() => upsert.mutate({ version, build: build.buildNumber, title: title.trim() || null, changelog: changelog.trim() || null, highlights: highlights.split("\n").map((h) => h.trim()).filter(Boolean), status, releasedAt: status === "shipped" ? (build.uploadedDate ? new Date(build.uploadedDate).toISOString() : new Date().toISOString()) : null })}
            disabled={upsert.isPending}
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50">
            {upsert.isPending ? "Saving…" : "Save changelog"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Push to TestFlight ("What to Test") ──────────────────────────────────────
function PushModal({ build, onClose }: { build: MergedBuild; onClose: () => void }) {
  const push = trpc.releases.pushToTestFlight.useMutation({
    onSuccess: (r) => setResult(r.ok ? "Pushed to TestFlight “What to Test”." : `Failed: ${r.error}`),
    onError: (e) => setResult(`Failed: ${e.message}`),
  })
  const initial = [build.title, ...(build.highlights ?? [])].filter(Boolean).join("\n") || build.changelog || build.commitMessage || ""
  const [text, setText] = useState(initial)
  const [confirm, setConfirm] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-card p-6 shadow-[var(--shadow-xl)]" onClick={(e) => e.stopPropagation()}>
        <h2 className="display text-lg font-semibold text-fg-primary">Push to TestFlight — build {build.buildNumber}</h2>
        <p className="mt-2 rounded-lg bg-[var(--pill-warning-bg)] px-3 py-2 text-xs text-[var(--pill-warning-fg)]">
          Sets the “What to Test” note testers see for build {build.buildNumber}. Writes to App Store Connect.
        </p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} maxLength={4000}
          className="mt-3 w-full rounded-lg border border-border-default bg-deep px-3 py-2 text-sm text-fg-primary focus:border-accent-400 focus:outline-none" />
        <label className="mt-3 flex items-center gap-2 text-sm text-fg-secondary">
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} /> I understand this updates what testers see.
        </label>
        {result && <p className="mt-3 text-sm text-accent-500">{result}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-fg-tertiary hover:text-fg-primary">Close</button>
          <button onClick={() => push.mutate({ buildId: build.buildId, buildNumber: build.buildNumber, whatsNew: text.trim() })} disabled={push.isPending || !confirm || text.trim().length < 1}
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-40">
            {push.isPending ? "Pushing…" : "Push to TestFlight"}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ReleasesView({ isAdmin }: { isAdmin: boolean }) {
  const status = trpc.releases.status.useQuery()
  const merged = trpc.releases.buildsMerged.useQuery(undefined, { enabled: status.data?.ascConfigured })
  const [editing, setEditing] = useState<MergedBuild | null>(null)
  const [pushing, setPushing] = useState<MergedBuild | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const canWrite = status.data?.ascWriteEnabled ?? false
  const configured = status.data?.ascConfigured

  if (status.isLoading) return <p className="text-sm text-fg-tertiary">Loading…</p>

  if (!configured) {
    return (
      <div className="rounded-xl border border-border-default bg-card p-6 shadow-[var(--shadow-sm)]">
        <h2 className="display text-base font-semibold text-fg-primary">Connect App Store Connect</h2>
        <p className="mt-2 text-sm text-fg-tertiary">Set these env vars to pull live builds:</p>
        <ul className="mt-3 space-y-1 font-mono text-xs text-fg-secondary">
          <li>APPSTORE_ISSUER_ID · APPSTORE_KEY_ID · APPSTORE_PRIVATE_KEY</li>
          <li>EXPO_ACCESS_TOKEN <span className="font-sans text-fg-muted">(EAS commits)</span></li>
          <li>APPSTORE_WRITE=1 <span className="font-sans text-fg-muted">(to publish notes)</span></li>
        </ul>
      </div>
    )
  }

  const rows = merged.data ?? []

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-tertiary">
        Every App Store build with its git commit (from EAS), state, and changelog — one row per build. Add a
        changelog, then push it to TestFlight or the App Store.
        {!canWrite && <span className="ml-1 text-fg-muted">(Set APPSTORE_WRITE=1 to enable pushing.)</span>}
      </p>

      <div className="overflow-hidden rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
        <table className="w-full text-sm">
          <thead className="border-b border-border-subtle bg-deep text-left text-fg-tertiary">
            <tr>
              <th className="px-4 py-2.5 font-medium">Build</th>
              <th className="px-4 py-2.5 font-medium">What shipped (git)</th>
              <th className="px-4 py-2.5 font-medium">State</th>
              <th className="px-4 py-2.5 font-medium">Uploaded</th>
              <th className="px-4 py-2.5 font-medium">Changelog</th>
              {isAdmin && <th className="px-4 py-2.5"></th>}
            </tr>
          </thead>
          <tbody>
            {merged.isLoading ? (
              <tr><td colSpan={isAdmin ? 6 : 5} className="px-4 py-6 text-center text-fg-tertiary">Loading builds…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={isAdmin ? 6 : 5} className="px-4 py-6 text-center text-fg-muted">No builds.</td></tr>
            ) : (
              rows.map((b) => {
                const hasNote = Boolean(b.title || b.changelog || (b.highlights?.length ?? 0))
                const open = expanded === b.buildId
                return (
                  <Fragment key={b.buildId}>
                    <tr className="border-t border-border-subtle text-fg-secondary hover:bg-card-hover">
                      <td className="px-4 py-2.5">
                        <button onClick={() => setExpanded(open ? null : b.buildId)} className="flex items-center gap-1.5 font-mono text-fg-primary">
                          <span className={`text-fg-muted transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
                          build {b.buildNumber}
                        </button>
                        {b.appVersion && <div className="pl-4 text-[11px] text-fg-muted">v{b.appVersion}</div>}
                      </td>
                      <td className="px-4 py-2.5">
                        {b.commitMessage ? (
                          <>
                            <span className="font-mono text-[11px] text-fg-tertiary">{b.commitHash}</span>
                            <div className="max-w-[300px] truncate text-xs text-fg-secondary">{b.commitMessage.split("\n")[0]}</div>
                          </>
                        ) : <span className="text-fg-muted">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`pill ${stateColor(b.processingState)}`}>{(b.processingState ?? "—").toLowerCase()}</span>
                        {b.expired && <span className="ml-1 pill">expired</span>}
                      </td>
                      <td className="px-4 py-2.5">{fmt(b.uploadedDate)}</td>
                      <td className="px-4 py-2.5">
                        {hasNote ? (
                          <span className="text-fg-primary">{b.title ?? "documented"} {b.noteStatus === "shipped" && <span className="pill pill-success ml-1">shipped</span>}</span>
                        ) : <span className="text-fg-muted">—</span>}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <button onClick={() => setEditing(b)} className="text-xs font-medium text-accent-500 hover:underline">{hasNote ? "Edit" : "Add"}</button>
                          {canWrite && hasNote && (
                            <button onClick={() => setPushing(b)} className="ml-3 text-xs font-medium text-fg-tertiary hover:text-fg-primary">→ TestFlight</button>
                          )}
                        </td>
                      )}
                    </tr>
                    {open && (
                      <tr className="border-t border-border-subtle bg-deep/40">
                        <td colSpan={isAdmin ? 6 : 5} className="px-4 py-3">
                          {hasNote ? (
                            <div>
                              {b.highlights && b.highlights.length > 0 && (
                                <ul className="mb-2 list-inside list-disc text-sm text-fg-secondary">
                                  {b.highlights.map((h, i) => <li key={i}>{h}</li>)}
                                </ul>
                              )}
                              {b.changelog && <p className="whitespace-pre-wrap text-xs text-fg-tertiary">{b.changelog}</p>}
                            </div>
                          ) : (
                            <p className="text-xs text-fg-muted">No changelog yet. {b.commitMessage ? `git: ${b.commitMessage.split("\n")[0]}` : ""}</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {isAdmin && editing && <NoteModal build={editing} onClose={() => setEditing(null)} />}
      {isAdmin && canWrite && pushing && <PushModal build={pushing} onClose={() => setPushing(null)} />}
    </div>
  )
}
