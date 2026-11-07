import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { createContext } from "@/server/context"
import { appRouter } from "@/server/routers"
import { UserDetail } from "./UserDetail"
import { parseTab } from "./user360"

/**
 * User detail — PII, admin-only, audit-logged. We call the tRPC router
 * server-side via a caller so the piiProcedure gate AND writeAudit both run
 * (the audit row records who viewed which user). The rich profile UI + the
 * promote action live in the UserDetail client component. `?tab=` picks the
 * initial tab (the client keeps it in sync without re-running this page).
 */
export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string | string[] }>
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams])
  const ctx = await createContext()
  const t = await getTranslations("users.detail")

  if (!ctx.allowed || ctx.role !== "admin") {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="display text-xl font-semibold text-fg-primary">{t("adminOnly")}</h1>
        <p className="mt-2 text-fg-secondary">{t("adminOnlyBody")}</p>
        <Link href="/users" className="mt-4 inline-block text-sm text-accent-500 hover:text-accent-600">{t("back")}</Link>
      </main>
    )
  }

  const caller = appRouter.createCaller(ctx)
  const profile = (await caller.users.detail({ userId: id })) as Record<string, unknown> | null
  if (!profile) notFound()

  return (
    <main className="mx-auto max-w-5xl px-8 py-8">
      <Link href="/users" className="text-sm text-fg-tertiary hover:text-fg-secondary">{t("back")}</Link>
      <UserDetail userId={id} profile={profile} initialTab={parseTab(tab)} />
    </main>
  )
}
