import { defineRouting } from 'next-intl/routing'

// PT is the launch default: `/` always lands on /pt, whatever the browser language or a NEXT_LOCALE cookie says
export const routing = defineRouting({ locales: ['en', 'pt'], defaultLocale: 'pt', localePrefix: 'always', localeDetection: false })
export type Locale = (typeof routing.locales)[number]
export const htmlLang = (l: Locale): 'en' | 'pt-BR' => (l === 'pt' ? 'pt-BR' : 'en')
