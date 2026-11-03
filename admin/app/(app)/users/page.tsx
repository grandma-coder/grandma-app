import { getTranslations } from "next-intl/server"
import { createContext } from "@/server/context"
import { UsersTable } from "./UsersTable"

/**
 * Users pillar — rendered inside the Central shell. Server component resolves
 * the caller's role, then hands it to the client table so PII columns (email)
 * mask for viewers and show for admins. The row detail link is admin-only.
 */
export default async function UsersPage() {
  const ctx = await createContext()
  const t = await getTranslations("users")
  if (!ctx.allowed) {
    return <main className="p-8 text-fg-secondary">{t("noAccess")}</main>
  }
  const isAdmin = ctx.role === "admin"

  return (
    <main className="mx-auto max-w-6xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{t("eyebrow")}</p>
      <h1 className="display mb-6 text-3xl font-bold tracking-tight text-fg-primary">{t("title")}</h1>
      <UsersTable isAdmin={isAdmin} />
    </main>
  )
}
