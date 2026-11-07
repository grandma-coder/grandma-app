import { getTranslations } from "next-intl/server"
import { createContext } from "@/server/context"
import { RevenueView } from "./RevenueView"

/**
 * Revenue pillar — real billing from RevenueCat. Viewer+ can see the overview;
 * the per-user drill-in (billing PII) is admin + audited at the router. This
 * page just gates access to the console.
 */
export default async function RevenuePage() {
  const ctx = await createContext()
  const t = await getTranslations("revenue")
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">{t("noAccess")}</main>

  return (
    <main className="mx-auto max-w-6xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{t("eyebrow")}</p>
      <h1 className="display mb-1 text-3xl font-bold tracking-tight text-fg-primary">{t("title")}</h1>
      <p className="mb-6 text-sm text-fg-tertiary">
        {t("intro")}
      </p>
      <RevenueView />
    </main>
  )
}
