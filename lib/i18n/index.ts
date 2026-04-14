/**
 * grandma.app — Internationalization Engine
 *
 * Usage:
 *   const { t } = useTranslation()
 *   <Text>{t('tab_home')}</Text>
 *
 * All keys are typed via TranslationKeys — TypeScript will catch missing translations.
 */

import { useLanguageStore, type AppLanguage } from '../../store/useLanguageStore'
import type { TranslationKeys } from './keys'

import { en } from './en'
import { ptBR } from './pt-BR'
import { es } from './es'
import { fr } from './fr'
import { de } from './de'
import { it } from './it'
import { ja } from './ja'
import { ko } from './ko'
import { zh } from './zh'
import { ar } from './ar'
import { hi } from './hi'
import { tr } from './tr'

// ─── Translation Map ─────────────────────────────────────────────────────────

const translations: Record<AppLanguage, TranslationKeys> = {
  'en': en,
  'pt-BR': ptBR,
  'es': es,
  'fr': fr,
  'de': de,
  'it': it,
  'ja': ja,
  'ko': ko,
  'zh': zh,
  'ar': ar,
  'hi': hi,
  'tr': tr,
}

// ─── Translation Function ────────────────────────────────────────────────────

type TranslationKey = keyof TranslationKeys

/**
 * Get a translated string for the given language.
 * Falls back to English if the key is missing in the target language.
 */
function translate(language: AppLanguage, key: TranslationKey): string {
  const langStrings = translations[language]
  if (langStrings && langStrings[key]) return langStrings[key]
  // Fallback to English
  return en[key] || key
}

// ─── useTranslation Hook ─────────────────────────────────────────────────────

interface UseTranslationReturn {
  /** Translate a key to the current language */
  t: (key: TranslationKey) => string
  /** Current language code */
  language: AppLanguage
  /** Whether the current language is RTL */
  isRTL: boolean
}

export function useTranslation(): UseTranslationReturn {
  const language = useLanguageStore((s) => s.language)

  function t(key: TranslationKey): string {
    return translate(language, key)
  }

  const isRTL = language === 'ar'

  return { t, language, isRTL }
}

// ─── Non-hook translation (for edge cases outside components) ────────────────

/**
 * Translate outside of React components. Reads the current store state directly.
 * Prefer useTranslation() inside components for reactivity.
 */
export function t(key: TranslationKey): string {
  const language = useLanguageStore.getState().language
  return translate(language, key)
}

// ─── Re-exports ──────────────────────────────────────────────────────────────

export type { TranslationKeys, TranslationKey }
export { translations }
