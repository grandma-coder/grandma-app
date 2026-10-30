import { getTranslations } from 'next-intl/server'
import { Nav } from './nav'
import { Footer } from './footer'

type Section = { id?: string; heading: string; paragraphs: string[] }

export async function LegalPage({ locale, ns }: { locale: 'en' | 'pt'; ns: 'privacy' | 'terms' }) {
  const t = await getTranslations({ locale, namespace: ns })
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1180px] px-[22px] md:px-14">
        <article className="mx-auto max-w-[720px] pt-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">{t('updated')}</p>
          <h1 className="mt-3 font-display text-[clamp(40px,5vw,64px)] font-bold leading-[1] tracking-[-0.035em]">{t('title')}</h1>
          <p className="mt-6 font-light leading-[1.7] text-ink-2">{t('intro')}</p>
          <p className="mt-4 text-[14px] text-ink-3">{t('note')}</p>
          {(t.raw('sections') as Section[]).map((s, i) => (
            <section key={i} id={s.id} className="mt-10 scroll-mt-28 border-t border-line pt-10">
              <h2 className="font-display text-[24px] font-bold tracking-[-0.02em]">{s.heading}</h2>
              {s.paragraphs.map((p, j) => (
                <p key={j} className="mt-4 font-light leading-[1.7] text-ink-2">{p}</p>
              ))}
            </section>
          ))}
        </article>
        <Footer locale={locale} />
      </main>
    </>
  )
}
