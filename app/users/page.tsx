import { createContext } from "@/server/context"
import { UsersTable } from "./UsersTable"
import Link from "next/link"

/**
 * Users pillar — the first real data screen. Server component resolves the
 * caller's role, then hands it to the client table so PII columns (email) mask
 * for viewers and show for admins. The row detail link is admin-only.
 */
export default async function UsersPage() {
  const ctx = await createContext()
  if (!ctx.allowed) {
    return <main className="p-8">No access.</main>
  }
  const isAdmin = ctx.role === "admin"

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-fg-tertiary hover:text-fg-secondary">
            ← command center
          </Link>
          <h1 className="font-display text-2xl font-semibold text-fg-primary">Users</h1>
        </div>
        <span className="text-sm text-fg-tertiary">role: <span className="text-accent-500">{ctx.role}</span></span>
      </div>
      <UsersTable isAdmin={isAdmin} />
    </main>
  )
}
