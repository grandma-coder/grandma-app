import { getTranslations } from "next-intl/server"
import { createContext } from "@/server/context"
import { BetaTesters } from "./BetaTesters"

/**
 * Beta testers — admin-only roster of people invited to test the mobile app.
 * Tracks signup status (matched against auth.users by email) and lets admins
 * grant premium. Does not distribute the app build (that's TestFlight / Play).
 */
export default async function BetaPage() {
  const ctx = await createContext()
  const t = await getTranslations("beta")
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">{t("noAccess")}</main>

  if (ctx.role !== "admin") {
    return (
      <main className="mx-auto max-w-2xl px-8 py-16 text-center">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{t("eyebrow")}</p>
        <h1 className="display text-2xl font-bold text-fg-primary">{t("adminsOnly.title")}</h1>
        <p className="mt-2 text-sm text-fg-tertiary">{t("adminsOnly.body")}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{t("eyebrow")}</p>
      <h1 className="display text-3xl font-bold tracking-tight text-fg-primary">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-fg-tertiary">{t("intro")}</p>
      <div className="mt-8">
        <BetaTesters />
      </div>
    </main>
  )
}
