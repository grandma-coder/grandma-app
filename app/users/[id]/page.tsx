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
        <h1 className="text-xl font-semibold">Admin only</h1>
        <p className="mt-2 text-zinc-600">User detail contains personal data and requires the admin role.</p>
        <Link href="/users" className="mt-4 inline-block text-sm text-blue-600 hover:underline">← back to users</Link>
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
      <Link href="/users" className="text-sm text-zinc-500 hover:underline">← back to users</Link>
      <h1 className="mt-2 text-2xl font-semibold">{field("name") !== "—" ? field("name") : field("email")}</h1>
      <p className="text-xs text-zinc-400">id: {id} · this view was audit-logged</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-t border-zinc-100 first:border-t-0 dark:border-zinc-800">
                <td className="w-40 bg-zinc-50 px-4 py-2 font-medium text-zinc-500 dark:bg-zinc-900">{k}</td>
                <td className="px-4 py-2">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="mt-4 rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <summary className="cursor-pointer font-medium">Notification & privacy settings (JSON)</summary>
        <pre className="mt-2 overflow-x-auto text-xs text-zinc-600 dark:text-zinc-400">
{JSON.stringify({ notification_prefs: profile.notification_prefs, privacy_settings: profile.privacy_settings }, null, 2)}
        </pre>
      </details>
    </main>
  )
}
