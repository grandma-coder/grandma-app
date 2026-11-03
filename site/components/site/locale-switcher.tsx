'use client'

import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'

export function LocaleSwitcher({ className = '' }: { className?: string }) {
  const t = useTranslations('locale')
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const router = useRouter()
  return (
    <div role="group" aria-label={t('label')} className={`flex items-center gap-1.5 font-mono text-[11px] tracking-[0.14em] text-ink-4 ${className}`}>
      {routing.locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden="true">·</span>}
          <button
            type="button"
            lang={l === 'pt' ? 'pt-BR' : 'en'}
            aria-pressed={l === locale}
            onClick={() => l !== locale && router.replace(pathname, { locale: l, scroll: false })}
            className={l === locale ? 'font-bold text-ink underline underline-offset-4' : 'text-ink-3 hover:text-ink'}
          >
            {t(l)}
          </button>
        </span>
      ))}
    </div>
  )
}
