import { getTranslations } from "next-intl/server"
import { createContext } from "@/server/context"
import { PeopleMap } from "./PeopleMap"

/**
 * Pessoas › Mapa — where the waitlist and the app's accounts are, by country, then by
 * region and city (waitlist signups from migration 0019 on). Counts are viewer+; the
 * people behind a place are admin-only and audited at the router.
 */
export default async function MapPage() {
  const ctx = await createContext()
  const t = await getTranslations("map")
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">{t("noAccess")}</main>

  return (
    <main className="mx-auto max-w-6xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{t("eyebrow")}</p>
      <h1 className="display mb-1 text-3xl font-bold tracking-tight text-fg-primary">{t("title")}</h1>
      <p className="mb-6 max-w-2xl text-sm text-fg-tertiary">{t("intro")}</p>
      <PeopleMap isAdmin={ctx.role === "admin"} />
    </main>
  )
}
