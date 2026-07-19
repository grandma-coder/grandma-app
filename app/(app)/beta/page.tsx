import { createContext } from "@/server/context"
import { BetaTesters } from "./BetaTesters"

/**
 * Beta testers — admin-only roster of people invited to test the mobile app.
 * Tracks signup status (matched against auth.users by email) and lets admins
 * grant premium. Does not distribute the app build (that's TestFlight / Play).
 */
export default async function BetaPage() {
  const ctx = await createContext()
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">No access.</main>

  if (ctx.role !== "admin") {
    return (
      <main className="mx-auto max-w-2xl px-8 py-16 text-center">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Beta</p>
        <h1 className="display text-2xl font-bold text-fg-primary">Admins only</h1>
        <p className="mt-2 text-sm text-fg-tertiary">Managing beta testers requires the admin role.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Beta</p>
      <h1 className="display text-3xl font-bold tracking-tight text-fg-primary">Beta testers</h1>
      <p className="mt-2 max-w-2xl text-sm text-fg-tertiary">
        Track who you&apos;ve invited to test the app, see when they sign up, and grant premium so they can
        try paid features.
      </p>
      <div className="mt-8">
        <BetaTesters />
      </div>
    </main>
  )
}
