import { getTranslations } from "next-intl/server"
import { createContext } from "@/server/context"
import { WaitlistStats } from "./WaitlistStats"
import { WaitlistTable } from "./WaitlistTable"

/** Waitlist — marketing-site signups. Worldwide launch. Viewers see aggregates; admins also see the audited list. */
export default async function WaitlistPage() {
  const ctx = await createContext()
  const t = await getTranslations("waitlist")
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">{t("noAccess")}</main>
  return (
    <main className="mx-auto max-w-6xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{t("eyebrow")}</p>
      <h1 className="display text-3xl font-bold tracking-tight text-fg-primary">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-fg-tertiary">
        {t("intro")}
      </p>
      <div className="mt-8 space-y-8">
        <WaitlistStats />
        {ctx.role === "admin" ? <WaitlistTable /> : <p className="text-sm text-fg-tertiary">{t("adminsOnly")}</p>}
      </div>
    </main>
  )
}
