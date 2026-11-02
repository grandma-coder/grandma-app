// lib/reports/testing.ts — helpers for the doctor-report builder tests.
import { en } from '../i18n/en'
import { hasBannedWords } from '../grandmaNotes/shared'
import { tEn } from '../grandmaNotes/testing'
import type { ReportContext, ReportPeriod } from './reportKit'

// 2 Nov 2026, midday — fixed "today" for every builder test.
export const TODAY = new Date(2026, 10, 2, 12, 0, 0)

// Report-chrome keys come back as the key itself so tests assert structure, not copy;
// shared labels (symptoms, phases) still resolve to English.
const tTest: ReportContext['t'] = ((key: string, params?: Record<string, string | number>) =>
  key.startsWith('report_') ? key : tEn(key as never, params)) as ReportContext['t']

export function ctx(period: ReportPeriod): ReportContext {
  return { t: tTest, locale: 'en', period, today: TODAY }
}

/**
 * Banned-word check over the rendered PDF. The medical disclaimer footer itself
 * says "does not diagnose", so it's removed before checking the rest.
 */
export function htmlHasBannedWords(html: string): boolean {
  return hasBannedWords(html.replace(en.disclaimer_medical, ''))
}

export { en }
