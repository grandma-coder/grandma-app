import { createContext } from "@/server/context"
import { PushConsole } from "./PushConsole"

/**
 * Push pillar — compose + send notifications. Composing/sending is admin-only
 * (sendProcedure on the router); viewers can see campaign history but the
 * compose form is hidden for them.
 */
export default async function PushPage() {
  const ctx = await createContext()
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">No access.</main>
  const isAdmin = ctx.role === "admin"

  return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Push</p>
      <h1 className="display mb-6 text-3xl font-bold tracking-tight text-fg-primary">Notifications</h1>
      <PushConsole isAdmin={isAdmin} />
    </main>
  )
}
