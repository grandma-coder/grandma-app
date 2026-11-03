"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { LOCALES } from "@/i18n/config"
import { setLocale } from "@/app/actions/locale"

/** PT · EN toggle in the sidebar footer. */
export function LocaleSwitcher() {
  const current = useLocale()
  const t = useTranslations("nav")
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em]" role="group" aria-label={t("language")}>
      {LOCALES.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-fg-muted">·</span>}
          <button
            type="button"
            disabled={pending || l === current}
            aria-pressed={l === current}
            onClick={() => start(async () => { await setLocale(l); router.refresh() })}
            className={l === current ? "font-semibold text-fg-primary" : "text-fg-muted hover:text-fg-primary"}
          >
            {l}
          </button>
        </span>
      ))}
    </div>
  )
}
