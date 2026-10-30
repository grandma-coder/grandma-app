import { setRequestLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'
import { Nav } from '@/components/site/nav'
import { Hero } from '@/components/site/hero'
import { Launch } from '@/components/site/launch'
import { Chapters } from '@/components/site/chapters'
import { Grandma } from '@/components/site/grandma'
import { Faq } from '@/components/site/faq'
import { Closing } from '@/components/site/closing'
import { Footer } from '@/components/site/footer'
import { ActionRule, UnderlineField } from '@/components/diffuse'
import { getDefaultCountry } from '@/lib/geo'

export default async function Home({ params }: { params: Promise<{ locale: 'en' | 'pt' }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const country = await getDefaultCountry(locale)
  const t = await getTranslations({ locale, namespace: 'hero' })
  // Placeholder until Task 14 swaps in <WaitlistForm defaultCountry={country} />.
  const form = (
    <div className="grid gap-6">
      <UnderlineField label="Email" type="email" placeholder="you@example.com" />
      <ActionRule href="#join">{t('status')}</ActionRule>
    </div>
  )
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1180px] px-[22px] md:px-14">
        <Hero locale={locale} country={country} form={form} />
        <div data-mode="pre"><Launch locale={locale} country={country} /></div>
        <Chapters locale={locale} />
        <Grandma locale={locale} />
        <Faq locale={locale} />
        <Closing locale={locale} />
        <Footer locale={locale} />
      </main>
    </>
  )
}
