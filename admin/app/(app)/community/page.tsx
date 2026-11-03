import { getTranslations } from "next-intl/server"
import { createContext } from "@/server/context"
import { CommunityDashboard } from "./CommunityDashboard"

/**
 * Community pillar — high-level channel/forum metrics. Aggregate, non-PII →
 * viewer+ (matches Metrics). Default posts window = last 90 days.
 */
export default async function CommunityPage() {
  const ctx = await createContext()
  const t = await getTranslations("community")
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">{t("noAccess")}</main>

  const until = new Date()
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 89)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  return (
    <main className="mx-auto max-w-6xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{t("eyebrow")}</p>
      <h1 className="display mb-6 text-3xl font-bold tracking-tight text-fg-primary">{t("title")}</h1>
      <CommunityDashboard defaultSince={fmt(since)} defaultUntil={fmt(until)} isAdmin={ctx.role === "admin"} />
    </main>
  )
}
