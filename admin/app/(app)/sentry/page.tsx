import { createContext } from "@/server/context"
import { getTranslations } from "next-intl/server"
import { SentryConsole } from "./SentryConsole"

/**
 * Sentry pillar — read-only crash triage. Admin-only (crash payloads can carry
 * sensitive context); the router gate enforces it, and this page hides the view
 * for non-admins.
 */
export default async function SentryPage() {
  const ctx = await createContext()
  const t = await getTranslations("sentry")
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">{t("noAccess")}</main>
  if (ctx.role !== "admin") {
    return (
      <main className="mx-auto max-w-3xl px-8 py-10">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{t("eyebrow")}</p>
        <h1 className="display text-2xl font-bold text-fg-primary">{t("adminOnly.title")}</h1>
        <p className="mt-2 text-fg-secondary">{t("adminOnly.body")}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{t("eyebrow")}</p>
      <h1 className="display mb-6 text-3xl font-bold tracking-tight text-fg-primary">{t("title")}</h1>
      <SentryConsole />
    </main>
  )
}
