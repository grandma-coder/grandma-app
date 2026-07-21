import { createContext } from "@/server/context"
import { AiCostView } from "./AiCostView"

/**
 * AI cost pillar — Claude spend across the app's edge functions. Admin-only:
 * usage carries user_ids and is operationally sensitive. The router gate
 * enforces it; this page hides the view for non-admins.
 */
export default async function AiPage() {
  const ctx = await createContext()
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">No access.</main>
  if (ctx.role !== "admin") {
    return (
      <main className="mx-auto max-w-3xl px-8 py-10">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">AI cost</p>
        <h1 className="display text-2xl font-bold text-fg-primary">Admin only</h1>
        <p className="mt-2 text-fg-secondary">AI usage &amp; spend is restricted to the admin role.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">AI cost</p>
      <h1 className="display mb-1 text-3xl font-bold tracking-tight text-fg-primary">Claude spend</h1>
      <p className="mb-6 text-sm text-fg-tertiary">
        Token spend across every edge function that calls Claude — the app&apos;s biggest variable cost, per function, model, day, and user.
      </p>
      <AiCostView />
    </main>
  )
}
