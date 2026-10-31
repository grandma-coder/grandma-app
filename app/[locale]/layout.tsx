import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { Architects_Daughter, Hanken_Grotesk, Space_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing, htmlLang, type Locale } from '@/i18n/routing'
import { StickerFilters } from '@/components/stickers/filters'
import '../globals.css'

const hanken = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-hanken', display: 'swap', weight: ['300', '400', '500', '600', '700'], style: ['normal', 'italic'] })
const spaceMono = Space_Mono({ subsets: ['latin'], variable: '--font-space-mono', display: 'swap', weight: ['400', '700'] })
const hand = Architects_Daughter({ subsets: ['latin'], variable: '--font-hand', display: 'swap', weight: '400' })

export const viewport: Viewport = { themeColor: '#F3F0E8', viewportFit: 'cover' }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://grandma.app'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: 'meta' })
  return {
    metadataBase: new URL(SITE_URL),
    title: t('title'),
    description: t('description'),
    alternates: { canonical: `/${locale}`, languages: { en: '/en', 'pt-BR': '/pt', 'x-default': '/en' } },
    openGraph: { title: t('ogTitle'), description: t('description'), type: 'website', locale: locale === 'pt' ? 'pt_BR' : 'en_US' },
    twitter: { card: 'summary_large_image' },
    other: { 'apple-mobile-web-app-capable': 'yes' },
    icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/favicon.ico', sizes: '48x48' }], apple: '/icons/apple-touch-icon.png' },
    appleWebApp: { capable: true, title: 'grandma', statusBarStyle: 'default' },
  }
}

export default async function LocaleLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  return (
    <html lang={htmlLang(locale as Locale)} className={`${hanken.variable} ${spaceMono.variable} ${hand.variable}`}>
      <body>
        <StickerFilters />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
