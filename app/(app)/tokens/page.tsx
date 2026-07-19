import { createContext } from "@/server/context"
import { TokensView } from "./TokensView"

/**
 * Design tokens — the canonical brand values (colors, type, radius, spacing)
 * mirrored from grandma-app/constants/theme.ts, plus live email previews and
 * copyable exports. A reference, not PII → viewer+.
 */
export default async function TokensPage() {
  const ctx = await createContext()
  if (!ctx.allowed) return <main className="p-8 text-fg-secondary">No access.</main>

  return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Design</p>
      <h1 className="display text-3xl font-bold tracking-tight text-fg-primary">Design tokens</h1>
      <p className="mt-2 max-w-2xl text-sm text-fg-tertiary">
        The brand&apos;s single source of truth — colors, type, radius, spacing — mirrored from{" "}
        <span className="font-mono text-xs">grandma-app/constants/theme.ts</span>. Plus the branded email visuals.
        Click any swatch or export to copy.
      </p>
      <div className="mt-8">
        <TokensView />
      </div>
    </main>
  )
}
