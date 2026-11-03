import { createContext } from "@/server/context"
import { getTranslations } from "next-intl/server"
import { OverviewDashboard } from "./OverviewDashboard"

/**
 * Home / overview. Behind the Clerk gate; rendered inside the Central app shell
 * (sidebar provides brand + profile), so this is just the page body: a title
 * row + the pillar grid. A signed-in-but-not-allowlisted user sees "no access".
 */
export default async function Home() {
  const ctx = await createContext()
  const t = await getTranslations("home")

  if (!ctx.allowed) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="display text-2xl font-semibold text-fg-primary">{t("noAccess.title")}</h1>
        <p className="max-w-md text-fg-secondary">
          {t.rich("noAccess.body", {
            email: ctx.userEmail ?? t("noAccess.unknown"),
            b: (c) => <span className="font-medium text-fg-primary">{c}</span>,
          })}
        </p>
      </main>
    )
  }

  const pillar = (key: string, href: string) => ({ name: t(`pillars.${key}.name`), href, blurb: t(`pillars.${key}.blurb`) })
  const pillars = [
    pillar("users", "/users"),
    pillar("map", "/map"),
    pillar("metrics", "/metrics"),
    pillar("community", "/community"),
    pillar("push", "/push"),
    pillar("content", "/content"),
    pillar("releases", "/releases"),
    pillar("tokens", "/tokens"),
    pillar("sentry", "/sentry"),
    ...(ctx.role === "admin" ? [pillar("beta", "/beta"), pillar("admin", "/admin")] : []),
  ]

  return (
    <main className="mx-auto max-w-6xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{t("eyebrow")}</p>
      <h1 className="display text-3xl font-bold tracking-tight text-fg-primary">Grandma</h1>
      <p className="mt-2 max-w-2xl text-sm text-fg-tertiary">
        {t("intro")}{" "}
        {t.rich("signedInAs", {
          email: ctx.userEmail ?? "",
          role: ctx.role ?? "",
          r: (c) => <span className="text-accent-500">{c}</span>,
        })}
      </p>

      <OverviewDashboard pillars={pillars} />
    </main>
  )
}
