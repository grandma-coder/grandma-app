import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Cormorant_Garamond, Hanken_Grotesk, Space_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing, htmlLang, type Locale } from '@/i18n/routing'
import '../globals.css'

const cormorant = Cormorant_Garamond({ subsets: ['latin'], variable: '--font-cormorant', display: 'swap', weight: ['300', '400', '500'], style: ['normal', 'italic'] })
const hanken = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-hanken', display: 'swap', weight: ['300', '400', '500', '600'] })
const spaceMono = Space_Mono({ subsets: ['latin'], variable: '--font-space-mono', display: 'swap', weight: ['400', '700'] })

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
    icons: { icon: '/favicon.svg' },
  }
}

export default async function LocaleLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  return (
    <html lang={htmlLang(locale as Locale)} className={`${cormorant.variable} ${hanken.variable} ${spaceMono.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
