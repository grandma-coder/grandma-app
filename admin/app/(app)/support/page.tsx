import { getTranslations } from "next-intl/server"
import { createContext } from "@/server/context"
import { SupportInbox } from "./SupportInbox"

/**
 * Support pillar — triage user feedback, bug reports, questions, and reviews.
 * Viewer+ can read and triage; ticket mutations are admin + audited at the
 * router. This page gates access to the inbox.
 */
export default async function SupportPage() {
  const ctx = await createContext()
  const t = await getTranslations("support")
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">{t("noAccess")}</main>

  return (
    <main className="mx-auto max-w-6xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{t("eyebrow")}</p>
      <h1 className="display mb-1 text-3xl font-bold tracking-tight text-fg-primary">{t("title")}</h1>
      <p className="mb-6 text-sm text-fg-tertiary">
        {t("intro")}
      </p>
      <SupportInbox isAdmin={ctx.role === "admin"} />
    </main>
  )
}
