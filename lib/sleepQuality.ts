import { translations, t } from './i18n'

/**
 * Kids sleep quality. Logs used to store the TRANSLATED chip label ("Ótimo", "Excelente"), while
 * every reader matched English ids — so for non-English users every night read as unknown, the
 * quality chart stayed empty and edits reset the slider. New logs store the stable id; readers
 * normalise either form, from any of the 12 locales.
 */
export type SleepQuality = 'great' | 'good' | 'restless' | 'poor'

const KEYS = {
  great: 'kids_logForm_sleepQualityGreat',
  good: 'kids_logForm_sleepQualityGood',
  restless: 'kids_logForm_sleepQualityRestless',
  poor: 'kids_logForm_sleepQualityPoor',
} as const

const BY_LABEL: Record<string, SleepQuality> = {}
for (const lang of Object.values(translations)) {
  for (const [id, key] of Object.entries(KEYS) as [SleepQuality, (typeof KEYS)[SleepQuality]][]) {
    const label = lang[key]
    if (label) BY_LABEL[label.trim().toLowerCase()] = id
  }
}

export function normalizeSleepQuality(raw: unknown): SleepQuality | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim().toLowerCase()
  if (s === 'great' || s === 'good' || s === 'restless' || s === 'poor') return s
  return BY_LABEL[s] ?? null
}

/** Label in the current app language; unknown values pass through unchanged. */
export function sleepQualityLabel(raw: unknown): string {
  const id = normalizeSleepQuality(raw)
  return id ? t(KEYS[id]) : typeof raw === 'string' ? raw : ''
}
