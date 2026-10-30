import { getTranslations } from 'next-intl/server'
import { AppVideo, Chip, SectionHead } from '@/components/diffuse'

export async function Grandma({ locale }: { locale: 'en' | 'pt' }) {
  const t = await getTranslations({ locale, namespace: 'grandma' })
  return (
    <section className="pt-[110px]">
      <SectionHead n="03">{t.rich('title', { em: (c) => <em>{c}</em> })}</SectionHead>
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <p className="m-0 max-w-[520px] font-display text-[clamp(24px,2.6vw,32px)] font-bold italic leading-[1.15] tracking-[-0.02em]">“{t('quote')}”</p>
          <p className="mt-6 max-w-[520px] text-[17px] font-light text-ink-2">{t('body')}</p>
          <div className="mt-7 flex flex-wrap gap-2.5">{(t.raw('traits') as string[]).map((x) => <Chip key={x} as="span">{x}</Chip>)}</div>
        </div>
        <div data-mode="kids" className="gfield soft rounded-d-xl py-10"><AppVideo shot="talk" lang={locale} alt={t('videoAlt')} /></div>
      </div>
    </section>
  )
}
