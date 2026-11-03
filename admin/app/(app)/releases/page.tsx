import { createContext } from "@/server/context"
import { ReleasesView } from "./ReleasesView"

/**
 * Releases — App Store Connect builds + versions (live) with an editable
 * changelog per version. Reference: which build shipped what. Viewer+ reads;
 * editing changelogs is admin.
 */
export default async function ReleasesPage() {
  const ctx = await createContext()
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">No access.</main>
  const isAdmin = ctx.role === "admin"

  return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Releases</p>
      <h1 className="display text-3xl font-bold tracking-tight text-fg-primary">Builds &amp; changelog</h1>
      <p className="mt-2 max-w-2xl text-sm text-fg-tertiary">
        Every build from App Store Connect, with the changelog of what shipped in each version — so you always know
        what&apos;s new in which build.
      </p>
      <div className="mt-8">
        <ReleasesView isAdmin={isAdmin} />
      </div>
    </main>
  )
}
