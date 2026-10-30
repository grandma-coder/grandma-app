import { setRequestLocale } from 'next-intl/server'
import { Nav } from '@/components/site/nav'
import { Hero } from '@/components/site/hero'
import { Launch } from '@/components/site/launch'
import { Chapters } from '@/components/site/chapters'
import { Faq } from '@/components/site/faq'
import { Closing } from '@/components/site/closing'
import { Footer } from '@/components/site/footer'
import { WaitlistForm } from '@/components/waitlist-form'
import { getDefaultCountry } from '@/lib/geo'

export default async function Home({ params }: { params: Promise<{ locale: 'en' | 'pt' }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const country = await getDefaultCountry(locale)
  const form = <WaitlistForm defaultCountry={country} />
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1180px] px-[22px] md:px-14">
        <Hero locale={locale} country={country} form={form} />
        <div data-mode="pre"><Launch locale={locale} country={country} /></div>
        <Chapters locale={locale} />
        <Faq locale={locale} />
        <Closing locale={locale} />
        <Footer locale={locale} />
      </main>
    </>
  )
}
