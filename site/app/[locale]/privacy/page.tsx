import { getTranslations, setRequestLocale } from 'next-intl/server'
import { LegalPage } from '@/components/site/legal-page'

export async function generateMetadata({ params }: { params: Promise<{ locale: 'en' | 'pt' }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'privacy' })
  return { title: t('metaTitle'), alternates: { canonical: `/${locale}/privacy`, languages: { en: '/en/privacy', 'pt-BR': '/pt/privacy' } } }
}

export default async function Page({ params }: { params: Promise<{ locale: 'en' | 'pt' }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <LegalPage locale={locale} ns="privacy" />
}
