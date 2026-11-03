import { createContext } from "@/server/context"
import { NotificationsWorkspace } from "./NotificationsWorkspace"

/**
 * Push pillar — a 3-tab notifications workspace: Notifications (campaign
 * history + composer), App Templates (event-driven {{var}} copy), and AI
 * Settings (the suggest-copy system prompt). Composing/sending + editing is
 * admin-only (enforced on the routers); viewers get read-only views.
 */
export default async function PushPage() {
  const ctx = await createContext()
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">No access.</main>
  const isAdmin = ctx.role === "admin"

  return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Push</p>
      <h1 className="display mb-6 text-3xl font-bold tracking-tight text-fg-primary">Notifications</h1>
      <NotificationsWorkspace isAdmin={isAdmin} />
    </main>
  )
}
