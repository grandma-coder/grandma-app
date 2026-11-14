import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Nav } from '@/components/site/nav'
import { Footer } from '@/components/site/footer'
import s from '@/components/site/site.module.css'

// Fallback for caregiver invite Universal Links (https://www.thegrandma.app/accept-invite?token=…).
// With the app installed, iOS/Android open the app directly and this page never loads.
// The token is never stored here — it only rides along in the "open in app" link.

type Params = Promise<{ locale: 'en' | 'pt' }>
type Search = Promise<{ token?: string | string[] }>

export async function generateMetadata({ params }: { params: Params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'invite' })
  return { title: t('metaTitle'), robots: { index: false, follow: false } }
}

export default async function Page({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'invite' })
  const raw = (await searchParams).token
  const token = typeof raw === 'string' && /^[A-Za-z0-9-]{8,128}$/.test(raw) ? raw : null

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1180px] px-[22px] md:px-14">
        <article className="mx-auto max-w-[620px] pt-16 pb-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">{t('eyebrow')}</p>
          <h1 className="mt-3 font-display text-[clamp(34px,4.5vw,52px)] font-bold leading-[1.05] tracking-[-0.035em]">{t('title')}</h1>
          {token ? (
            <>
              <p className="mt-6 font-light leading-[1.7] text-ink-2">{t('body')}</p>
              <p className="mt-8">
                <a className={`${s.pill} ${s.dark}`} href={`grandma-app://accept-invite?token=${encodeURIComponent(token)}`}>
                  {t('open')}
                </a>
              </p>
              <p className="mt-8 text-[14px] leading-[1.6] text-ink-3">{t('noApp')}</p>
            </>
          ) : (
            <p className="mt-6 font-light leading-[1.7] text-ink-2">{t('missing')}</p>
          )}
        </article>
      </main>
      <Footer />
    </>
  )
}
