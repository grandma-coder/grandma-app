import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({ locales: ['en', 'pt'], defaultLocale: 'en', localePrefix: 'always' })
export type Locale = (typeof routing.locales)[number]
export const htmlLang = (l: Locale): 'en' | 'pt-BR' => (l === 'pt' ? 'pt-BR' : 'en')
