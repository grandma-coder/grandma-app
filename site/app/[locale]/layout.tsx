import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing, htmlLang, type Locale } from '@/i18n/routing'
import { StickerFilters } from '@/components/stickers/filters'
import '../globals.css'

// Self-hosted (latin subset, OFL — assets/fonts): next/font/google fails under Vercel's Turbopack build adapter.
const hanken = localFont({
  variable: '--font-hanken', display: 'swap',
  src: [
    { path: '../../assets/fonts/HankenGrotesk-latin.woff2', weight: '300 700', style: 'normal' },
    { path: '../../assets/fonts/HankenGrotesk-Italic-latin.woff2', weight: '300 700', style: 'italic' },
  ],
})
const spaceMono = localFont({
  variable: '--font-space-mono', display: 'swap',
  src: [
    { path: '../../assets/fonts/SpaceMono-Regular-latin.woff2', weight: '400', style: 'normal' },
    { path: '../../assets/fonts/SpaceMono-Bold-latin.woff2', weight: '700', style: 'normal' },
  ],
})
const hand = localFont({ variable: '--font-hand', display: 'swap', src: '../../assets/fonts/ArchitectsDaughter-Regular.ttf', weight: '400' })

export const viewport: Viewport = { themeColor: '#F3F0E8', viewportFit: 'cover' }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thegrandma.app'

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
    alternates: { canonical: `/${locale}`, languages: { en: '/en', 'pt-BR': '/pt', 'x-default': '/pt' } },
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
