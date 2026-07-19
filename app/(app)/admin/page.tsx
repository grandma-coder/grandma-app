import { createContext } from "@/server/context"
import { AdminPanel } from "./AdminPanel"

/**
 * Admin panel — invite teammates and manage roles. Admin-only surface: viewers
 * and non-admins get a clear "admins only" wall instead of the controls.
 */
export default async function AdminPage() {
  const ctx = await createContext()

  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">No access.</main>

  if (ctx.role !== "admin") {
    return (
      <main className="mx-auto max-w-2xl px-8 py-16 text-center">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Admin</p>
        <h1 className="display text-2xl font-bold text-fg-primary">Admins only</h1>
        <p className="mt-2 text-sm text-fg-tertiary">
          Managing the team is restricted to admins. You&apos;re signed in as{" "}
          <span className="font-medium text-fg-primary">{ctx.userEmail}</span> ·{" "}
          <span className="text-accent-500">{ctx.role}</span>. Ask an admin to grant you access.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Admin</p>
      <h1 className="display text-3xl font-bold tracking-tight text-fg-primary">Team</h1>
      <p className="mt-2 max-w-2xl text-sm text-fg-tertiary">
        Invite people to the command center and manage their access. Members sign in with Clerk;
        the role you assign controls what they can see and do.
      </p>
      <div className="mt-8">
        <AdminPanel />
      </div>
    </main>
  )
}
