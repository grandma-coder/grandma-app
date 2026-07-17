import Link from "next/link"
import { notFound } from "next/navigation"
import { createContext } from "@/server/context"
import { appRouter } from "@/server/routers"

/**
 * User detail — PII, admin-only, audit-logged. We call the tRPC router
 * server-side via a caller so the piiProcedure gate AND writeAudit both run
 * (the audit row records who viewed which user).
 */
export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await createContext()

  if (!ctx.allowed || ctx.role !== "admin") {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="font-display text-xl font-semibold text-fg-primary">Admin only</h1>
        <p className="mt-2 text-fg-secondary">User detail contains personal data and requires the admin role.</p>
        <Link href="/users" className="mt-4 inline-block text-sm text-accent-500 hover:text-accent-600">← back to users</Link>
      </main>
    )
  }

  const caller = appRouter.createCaller(ctx)
  const profile = (await caller.users.detail({ userId: id })) as Record<string, unknown> | null
  if (!profile) notFound()

  // Present a curated, readable subset. Raw JSONB (prefs/privacy) shown compact.
  const field = (k: string) => (profile[k] == null ? "—" : String(profile[k]))
  const rows: [string, string][] = [
    ["Email", field("email")],
    ["Name", field("name")],
    ["Journey mode", field("journey_mode")],
    ["Subscription", `${field("subscription_tier")} (${field("subscription_status")})`],
    ["Language", field("language")],
    ["Country", field("country_code")],
    ["DOB", field("dob")],
    ["Due date", field("due_date")],
    ["Children", field("children_count")],
    ["Devices", field("device_count")],
    ["Child logs", field("child_logs_count")],
    ["Cycle logs", field("cycle_logs_count")],
    ["Pregnancy logs", field("pregnancy_logs_count")],
    ["Last active", field("last_active")],
    ["Joined", field("created_at")],
  ]

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/users" className="text-sm text-fg-tertiary hover:text-fg-secondary">← back to users</Link>
      <h1 className="mt-2 font-display text-2xl font-semibold text-fg-primary">{field("name") !== "—" ? field("name") : field("email")}</h1>
      <p className="text-xs text-fg-muted">id: {id} · this view was audit-logged</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-t border-border-subtle first:border-t-0">
                <td className="w-40 bg-deep px-4 py-2 font-medium text-fg-tertiary">{k}</td>
                <td className="px-4 py-2 text-fg-primary">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="mt-4 rounded-xl border border-border-default bg-card p-4 text-sm">
        <summary className="cursor-pointer font-medium text-fg-secondary">Notification & privacy settings (JSON)</summary>
        <pre className="mt-2 overflow-x-auto text-xs text-fg-tertiary">
{JSON.stringify({ notification_prefs: profile.notification_prefs, privacy_settings: profile.privacy_settings }, null, 2)}
        </pre>
      </details>
    </main>
  )
}
