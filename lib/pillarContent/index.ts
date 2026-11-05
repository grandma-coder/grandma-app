// Bundled translations for the cycle (pre-pregnancy) pillar screens — intro, tip titles,
// tip bodies and "ask Grandma" questions — so a non-English reader sees her language
// immediately, offline, with no runtime-translation round trip.
//
// Keyed by the same content keys as the runtime translator (`pillarContentKeys` in
// lib/pillarCopy.ts). Anything not bundled here (pregnancy / kids pillars) keeps using
// `useTranslatedContent`. English has no entry: lib/prePregPillars.ts IS the English copy.
import type { AppLanguage } from '../../store/useLanguageStore'
import type { PillarContentLocale } from './types'
import { ptBR } from './pt-BR'
import { es } from './es'
import { fr } from './fr'
import { de } from './de'
import { it } from './it'
import { ja } from './ja'
import { ko } from './ko'
import { zh } from './zh'
import { hi } from './hi'
import { tr } from './tr'
import { ar } from './ar'

export type { PillarContentLocale } from './types'

export const PILLAR_CONTENT: Record<Exclude<AppLanguage, 'en'>, PillarContentLocale> = {
  'pt-BR': ptBR, es, fr, de, it, ja, ko, zh, hi, tr, ar,
}

/** The bundled translation for `key` in `lang`, or undefined (English, or not bundled). */
export function bundledPillarText(key: string, lang: AppLanguage): string | undefined {
  if (lang === 'en' || !key) return undefined
  const text = PILLAR_CONTENT[lang]?.[key]
  return text && text.trim() ? text : undefined
}
