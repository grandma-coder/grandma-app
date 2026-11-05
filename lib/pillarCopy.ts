/**
 * pillarCopy — everything a pillar screen needs to *say* a pillar in the user's language,
 * plus its site-look sticker and tone.
 *
 * Two layers, on purpose:
 *  - Short, fixed copy (pillar name + one-line description) lives in the i18n catalogs
 *    (`pillar_name_<id>` / `pillar_desc_<id>`), so lists and headers never flash English.
 *  - Long editorial copy (intro, tip titles, tip bodies, "ask Grandma" questions) is bundled for
 *    the cycle pillars (lib/pillarContent/<lang>.ts) and otherwise goes through the runtime
 *    translator (`useTranslatedContent`, cached per key + locale). This module owns the stable
 *    keys for both, so every screen asks for the same translation.
 */

import type { TranslationKey } from './i18n'
import type { SiteStickerName } from '../components/stickers/SiteSticker'
import { prePregPillars } from './prePregPillars'
import { pregnancyPillars } from './pregnancyPillars'
import { pillars as kidsPillars } from './pillars'
import type { Pillar } from '../types'

export type PillarJourney = 'pre-pregnancy' | 'pregnancy' | 'kids'

/** Look a pillar up across every journey. Unknown / malformed ids → undefined (never throws). */
export function findPillar(id: unknown): { pillar: Pillar; journey: PillarJourney } | undefined {
  if (typeof id !== 'string' || !id) return undefined
  const pre = prePregPillars.find((p) => p.id === id)
  if (pre) return { pillar: pre, journey: 'pre-pregnancy' }
  const preg = pregnancyPillars.find((p) => p.id === id)
  if (preg) return { pillar: preg, journey: 'pregnancy' }
  const kids = kidsPillars.find((p) => p.id === id)
  if (kids) return { pillar: kids, journey: 'kids' }
  return undefined
}

function slug(id: string): string {
  return id.replace(/-/g, '_')
}

export function pillarNameKey(id: string): TranslationKey {
  return `pillar_name_${slug(id)}` as TranslationKey
}

export function pillarDescKey(id: string): TranslationKey {
  return `pillar_desc_${slug(id)}` as TranslationKey
}

/** Tips have no stable id — slugify the English label (unique per pillar). */
export function slugifyLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

/** Runtime-translation cache keys. The body key predates this module — keep it as is so
 *  translations already cached server-side keep hitting. */
export const pillarContentKeys = {
  intro: (id: string) => `pillar_${id}_intro`,
  tipBody: (id: string, label: string) => `pillar_${id}_tip_${slugifyLabel(label)}`,
  tipLabel: (id: string, label: string) => `pillar_${id}_tip_${slugifyLabel(label)}_label`,
  suggestion: (id: string, index: number) => `pillar_${id}_ask_${index}`,
}

type Tone = 'greenSoft' | 'lilacSoft' | 'peachSoft' | 'blueSoft' | 'yellowSoft' | 'pinkSoft'

const LOOK: Record<string, { sticker: SiteStickerName; tone: Tone }> = {
  // pre-pregnancy (cycle)
  fertility: { sticker: 'flower', tone: 'pinkSoft' },
  'nutrition-prep': { sticker: 'leaf', tone: 'greenSoft' },
  'emotional-readiness': { sticker: 'heart', tone: 'peachSoft' },
  'financial-planning': { sticker: 'bars', tone: 'yellowSoft' },
  'partner-journey': { sticker: 'house', tone: 'lilacSoft' },
  'health-checkups': { sticker: 'thermo', tone: 'blueSoft' },
  // pregnancy
  'week-by-week': { sticker: 'cal', tone: 'lilacSoft' },
  'symptoms-relief': { sticker: 'headache', tone: 'peachSoft' },
  'birth-planning': { sticker: 'notebook', tone: 'yellowSoft' },
  'breastfeeding-prep': { sticker: 'drop', tone: 'blueSoft' },
  'baby-gear': { sticker: 'stroller', tone: 'pinkSoft' },
  'partner-support': { sticker: 'heart', tone: 'peachSoft' },
  'postpartum-prep': { sticker: 'moon', tone: 'lilacSoft' },
  'pregnancy-nutrition': { sticker: 'avocado', tone: 'greenSoft' },
  'emotional-wellness': { sticker: 'sun', tone: 'yellowSoft' },
  // kids
  milk: { sticker: 'bottle', tone: 'blueSoft' },
  food: { sticker: 'banana', tone: 'yellowSoft' },
  nutrition: { sticker: 'egg', tone: 'greenSoft' },
  vaccines: { sticker: 'syringe', tone: 'lilacSoft' },
  clothes: { sticker: 'bodysuit', tone: 'pinkSoft' },
  recipes: { sticker: 'pumpkin', tone: 'peachSoft' },
  habits: { sticker: 'leaf', tone: 'greenSoft' },
  medicine: { sticker: 'pill', tone: 'blueSoft' },
  milestones: { sticker: 'star', tone: 'yellowSoft' },
}

export function pillarLook(id: string): { sticker: SiteStickerName; tone: Tone } {
  return LOOK[id] ?? { sticker: 'star', tone: 'yellowSoft' }
}
