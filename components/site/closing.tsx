import { getTranslations } from 'next-intl/server'

export async function Closing({ locale }: { locale: 'en' | 'pt' }) {
  const t = await getTranslations({ locale, namespace: 'closing' })
  return (
    <section data-mode="kids" className="gfield mt-[110px] rounded-d-xl px-6 py-24 text-center shadow-card">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[rgba(26,25,22,.62)]">{t('eyebrow')}</p>
      <h2 className="mt-3.5 font-display text-[clamp(46px,6.4vw,92px)] font-light leading-[0.95] [&_em]:italic [&_em]:text-ink-2">{t.rich('title', { em: (c) => <em>{c}</em> })}</h2>
      <a href="#join" className="gradpill mx-auto mt-10 inline-flex items-center justify-center rounded-full px-9 py-4 text-[15px] font-semibold">{t('cta')}</a>
    </section>
  )
}
