import type { Locale } from '@/i18n/routing'
import { dataEn } from './data.en'
import { dataPt } from './data.pt'
import type { DemoData } from './types'

export * from './types'

export const getDemoData = (locale: Locale): DemoData => (locale === 'pt' ? dataPt : dataEn)

/** Substitute `{token}` placeholders; unknown tokens stay as written. */
export const fmt = (template: string, vars: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
