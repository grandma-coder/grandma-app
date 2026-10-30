import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { AppVideo } from '@/components/diffuse'
import type { Country } from '@/lib/countries'

export async function Hero({ locale, form }: { locale: 'en' | 'pt'; country: Country; form: ReactNode }) {
  const t = await getTranslations({ locale, namespace: 'hero' })
  return (
    <section className="pt-10">
      <p className="mb-8 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
        <span className="text-ink"><span aria-hidden="true" className="mr-2 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-[#3DAA6E] align-middle" />{t('status')}</span>
        <span aria-hidden="true">·</span><span>{t('first')}</span><span aria-hidden="true">·</span><span>{t('then')}</span>
      </p>
      <div className="grid items-start gap-14 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <h1 className="m-0 font-display text-[clamp(56px,8vw,118px)] font-light leading-[0.92] tracking-[-0.015em] [&_em]:italic [&_em]:text-ink-2">
            {t.rich('title', { em: (c) => <em>{c}</em> })}
          </h1>
          <p className="mt-6 max-w-[540px] text-[17px] font-light leading-[1.6] text-ink-2">{t('lede')}</p>
          <div id="join" className="mt-10 max-w-[520px] scroll-mt-28">{form}</div>
        </div>
        <div className="lg:sticky lg:top-28">
          <AppVideo shot="onboarding-picker" lang={locale} alt={t('videoAlt')} priority />
        </div>
      </div>
    </section>
  )
}
