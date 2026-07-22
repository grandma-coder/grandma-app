import { createContext } from "@/server/context"
import { RelationshipExplorer } from "./RelationshipExplorer"

/**
 * Relationship Explorer — an ego graph of one user's world (children,
 * care-circle, behaviors, subscription, community). It exposes a user's full
 * relationship web (PII), so it's admin-only; the router gate enforces it and
 * every graph view is audited. This page hides the view for non-admins.
 */
export default async function GraphPage() {
  const ctx = await createContext()
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">No access.</main>
  if (ctx.role !== "admin") {
    return (
      <main className="mx-auto max-w-3xl px-8 py-10">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Relationships</p>
        <h1 className="display text-2xl font-bold text-fg-primary">Admin only</h1>
        <p className="mt-2 text-fg-secondary">The relationship graph exposes a user&apos;s full network, so it&apos;s restricted to the admin role.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Relationships</p>
      <h1 className="display mb-1 text-3xl font-bold tracking-tight text-fg-primary">Relationship explorer</h1>
      <p className="mb-6 text-sm text-fg-tertiary">
        Pick a user to map their world — children, care-circle, caregivers, behaviors, subscription, and community. Click any node to inspect it or jump to its pillar.
      </p>
      <RelationshipExplorer />
    </main>
  )
}
