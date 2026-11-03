import { createContext } from "@/server/context"
import { getTranslations } from "next-intl/server"
import { TokensView } from "./TokensView"

/**
 * Design tokens — the canonical brand values (colors, type, radius, spacing)
 * mirrored from grandma-app/constants/theme.ts, plus live email previews and
 * copyable exports. A reference, not PII → viewer+.
 */
export default async function TokensPage() {
  const ctx = await createContext()
  const t = await getTranslations("tokens")
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">{t("noAccess")}</main>

  return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{t("eyebrow")}</p>
      <h1 className="display text-3xl font-bold tracking-tight text-fg-primary">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-fg-tertiary">
        {t.rich("intro", {
          b: (c) => <span className="font-medium text-fg-secondary">{c}</span>,
          code: (c) => <span className="font-mono text-xs">{c}</span>,
        })}
      </p>
      <div className="mt-8">
        <TokensView />
      </div>
    </main>
  )
}
