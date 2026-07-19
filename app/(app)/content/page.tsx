import { createContext } from "@/server/context"
import { ContentWorkspace } from "./ContentWorkspace"

/**
 * Content pillar — manage the app's editable content (Stage 1: daily-tracking
 * questions). Edits flow live to the app, which reads DB-first with a bundled
 * fallback. Viewer+ can browse; editing is admin-only (enforced on the router).
 */
export default async function ContentPage() {
  const ctx = await createContext()
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">No access.</main>
  const isAdmin = ctx.role === "admin"

  return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Content</p>
      <h1 className="display text-3xl font-bold tracking-tight text-fg-primary">Content database</h1>
      <p className="mt-2 max-w-2xl text-sm text-fg-tertiary">
        The app&apos;s editable content. Changes here flow live to the app, which reads DB-first and falls back to
        its bundled copy if the DB is unreachable — so a bad edit never blanks the app.
      </p>
      <div className="mt-8">
        <ContentWorkspace isAdmin={isAdmin} />
      </div>
    </main>
  )
}
