/**
 * grandma.app — Internationalization Engine
 *
 * Usage:
 *   const { t } = useTranslation()
 *   <Text>{t('tab_home')}</Text>
 *   <Text>{t('time_minutesAgo', { count: 5 })}</Text>  // → "5 min ago" (if key = "{{count}} min ago")
 *
 * All keys are typed via TranslationKeys — TypeScript will catch missing translations.
 * Interpolation: use {{variableName}} in translation strings; pass values as the second argument.
 */

import { useCallback } from 'react'
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
type InterpolationParams = Record<string, string | number>

/**
 * Get a translated string for the given language, with optional interpolation.
 * Falls back to English if the key is missing in the target language.
 * Replaces {{variableName}} placeholders with values from params.
 */
function translate(language: AppLanguage, key: TranslationKey, params?: InterpolationParams): string {
  const langStrings = translations[language]
  const raw = (langStrings && key in langStrings && langStrings[key] !== undefined)
    ? langStrings[key]
    : (key in en && en[key] !== undefined ? en[key] : key)

  if (!params) return raw

  return raw.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{{${name}}}`
  )
}

// ─── useTranslation Hook ─────────────────────────────────────────────────────

interface UseTranslationReturn {
  /** Translate a key to the current language, with optional {{variable}} interpolation */
  t: (key: TranslationKey, params?: InterpolationParams) => string
  /** Current language code */
  language: AppLanguage
  /** Whether the current language is RTL */
  isRTL: boolean
}

export function useTranslation(): UseTranslationReturn {
  const language = useLanguageStore((s) => s.language)

  const t = useCallback((key: TranslationKey, params?: InterpolationParams): string => {
    return translate(language, key, params)
  }, [language])

  const isRTL = language === 'ar'

  return { t, language, isRTL }
}

// ─── Non-hook translation (for edge cases outside components) ────────────────

/**
 * Translate outside of React components. Reads the current store state directly.
 * Prefer useTranslation() inside components for reactivity.
 */
export function t(key: TranslationKey, params?: InterpolationParams): string {
  const language = useLanguageStore.getState().language
  return translate(language, key, params)
}

// ─── Re-exports ──────────────────────────────────────────────────────────────

export type { TranslationKeys, TranslationKey }
export { translations }
