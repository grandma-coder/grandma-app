// Bundled translations of the pregnancy week-by-week content (development bullets, symptom
// chips, "what to prepare" rows and their detail guides). English lives in lib/weekContent.ts and
// lib/prepGuide.ts; every other language is a file in this folder, keyed by ./english.ts.
// Offline, instant, no runtime translator. When English changes, update every locale file.
import type { AppLanguage } from '../../store/useLanguageStore'
import type { PregnancyContentLocale } from './types'
import { getWeekContent, type WeekContent, type PrepItemDef } from '../weekContent'
import { getPrepGuide, prepGuideId, type PrepGuide } from '../prepGuide'
import { birthTypes, hospitalBagChecklist, type BirthType, type HospitalBagSection } from '../birthData'
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

export type { PregnancyContentLocale } from './types'

export const PREGNANCY_CONTENT: Record<Exclude<AppLanguage, 'en'>, PregnancyContentLocale> = {
  'pt-BR': ptBR, es, fr, de, it, ja, ko, zh, hi, tr, ar,
}

function pick(lang: AppLanguage, key: string, english: string): string {
  if (lang === 'en') return english
  const text = PREGNANCY_CONTENT[lang]?.[key]
  return text && text.trim() ? text : english
}

/** The week's development / symptoms / prep rows in `lang` (English when not bundled). */
export function localizedWeekContent(week: number, lang: AppLanguage): WeekContent {
  const w = Math.max(1, Math.min(42, week))
  const c = getWeekContent(w)
  if (lang === 'en') return c
  return {
    ...c,
    dev: c.dev.map((s, i) => pick(lang, `w${w}_dev${i}`, s)),
    sym: c.sym.map((s, i) => pick(lang, `w${w}_sym${i}`, s)),
    prep: c.prep.map((p, i) => ({
      ...p,
      t: pick(lang, `w${w}_prep${i}_t`, p.t),
      d: pick(lang, `w${w}_prep${i}_d`, p.d),
    })),
  }
}

/**
 * The detail guide for a prep row in `lang`. `englishItem` is the ENGLISH row (its title picks the
 * guide through the regex overrides), so pass the item from getWeekContent, not a localized one.
 */
export function localizedPrepGuide(englishItem: PrepItemDef, lang: AppLanguage): PrepGuide {
  const g = getPrepGuide(englishItem)
  if (lang === 'en') return g
  const id = prepGuideId(englishItem)
  return {
    why: pick(lang, `pg_${id}_why`, g.why),
    how: g.how.map((s, i) => pick(lang, `pg_${id}_how${i}`, s)),
    watch: g.watch ? pick(lang, `pg_${id}_watch`, g.watch) : undefined,
  }
}

/** Birth types (title + description) in `lang`. */
export function localizedBirthTypes(lang: AppLanguage): BirthType[] {
  if (lang === 'en') return birthTypes
  return birthTypes.map((b) => ({
    ...b,
    title: pick(lang, `birth_${b.id}_title`, b.title),
    description: pick(lang, `birth_${b.id}_desc`, b.description),
  }))
}

/** Hospital-bag checklist (section names + items, same ids) in `lang`. */
export function localizedHospitalBag(lang: AppLanguage): HospitalBagSection[] {
  if (lang === 'en') return hospitalBagChecklist
  return hospitalBagChecklist.map((s) => ({
    ...s,
    category: pick(lang, `birth_bag_cat_${s.id}`, s.category),
    items: s.items.map((it) => ({ ...it, text: pick(lang, `birth_bag_${it.id}`, it.text) })),
  }))
}
