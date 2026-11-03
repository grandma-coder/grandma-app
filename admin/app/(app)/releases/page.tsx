import { getTranslations } from "next-intl/server"
import { createContext } from "@/server/context"
import { ReleasesView } from "./ReleasesView"

/**
 * Releases — App Store Connect builds + versions (live) with an editable
 * changelog per version. Reference: which build shipped what. Viewer+ reads;
 * editing changelogs is admin.
 */
export default async function ReleasesPage() {
  const ctx = await createContext()
  const t = await getTranslations("releases")
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">{t("noAccess")}</main>
  const isAdmin = ctx.role === "admin"

  return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{t("eyebrow")}</p>
      <h1 className="display text-3xl font-bold tracking-tight text-fg-primary">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-fg-tertiary">{t("intro")}</p>
      <div className="mt-8">
        <ReleasesView isAdmin={isAdmin} />
      </div>
    </main>
  )
}
