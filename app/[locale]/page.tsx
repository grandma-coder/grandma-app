import { setRequestLocale } from 'next-intl/server'
import { Nav } from '@/components/site/nav'
import { SiteShell } from '@/components/site/site-shell'
import { Hero } from '@/components/site/hero'
import { StickerSheet } from '@/components/site/sticker-sheet'
import { WaitlistSection } from '@/components/site/waitlist-section'
import { MobileBar } from '@/components/site/mobile-bar'
import { Footer } from '@/components/site/footer'

export default async function Home({ params }: { params: Promise<{ locale: 'en' | 'pt' }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <>
      <Nav />
      <SiteShell>
        <main id="top">
          <Hero />
          <StickerSheet />
          <WaitlistSection />
        </main>
        <MobileBar />
      </SiteShell>
      <Footer />
    </>
  )
}
