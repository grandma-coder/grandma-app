import { createContext } from "@/server/context"
import { WaitlistStats } from "./WaitlistStats"
import { WaitlistTable } from "./WaitlistTable"

/** Waitlist — marketing-site signups. Launch order: Brazil, then the US. Viewers see aggregates; admins also see the audited list. */
export default async function WaitlistPage() {
  const ctx = await createContext()
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">No access.</main>
  return (
    <main className="mx-auto max-w-6xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Audience</p>
      <h1 className="display text-3xl font-bold tracking-tight text-fg-primary">Waitlist</h1>
      <p className="mt-2 max-w-2xl text-sm text-fg-tertiary">
        People who joined from grandma.app. Brazil opens first, then the US. Within a country it&apos;s first come, first
        served — promote people to the beta roster when it&apos;s their turn.
      </p>
      <div className="mt-8 space-y-8">
        <WaitlistStats />
        {ctx.role === "admin" ? <WaitlistTable /> : <p className="text-sm text-fg-tertiary">The list of emails is visible to admins only.</p>}
      </div>
    </main>
  )
}
