import type { AppLanguage } from '../../../store/useLanguageStore'
import type { DailyContentLocale } from './types'
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

export type { DailyContentLocale } from './types'

// English has no entry: the bundled banks ARE the English copy.
export const DAILY_CONTENT: Record<Exclude<AppLanguage, 'en'>, DailyContentLocale> = {
  'pt-BR': ptBR, es, fr, de, it, ja, ko, zh, hi, tr, ar,
}
