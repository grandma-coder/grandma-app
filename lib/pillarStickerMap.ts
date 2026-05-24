/**
 * Pillar ID → sticker component mapping.
 *
 * Used by PillarCard and PillarGrid to render the correct sticker for each
 * of the 24 pillars (6 pre-preg + 9 pregnancy + 9 kids).
 *
 * Stickers come from `components/stickers/Stickers.tsx` (PillarStickers) —
 * the purpose-built pillar pack from the cream-paper redesign. Older generic
 * Pillar* shapes still live in RewardStickers.tsx for backward compatibility
 * but are no longer used here.
 *
 * The new pillar stickers have a baked-in palette and accept only a `size`
 * prop. The legacy callsites that passed `fill`/`stroke` will simply ignore
 * those props — TS is satisfied via the loose StickerComponent type below.
 */

import type { ComponentType } from 'react'
import { PillarStickers } from '../components/stickers/Stickers'

type StickerComponent = ComponentType<{ size?: number; fill?: string; stroke?: string }>

const PILLAR_STICKERS: Record<string, StickerComponent> = {
  // Pre-pregnancy (6)
  fertility: PillarStickers.PillarFertility,
  'fertility-basics': PillarStickers.PillarFertility,
  'nutrition-prep': PillarStickers.PillarNutritionPrep,
  'emotional-readiness': PillarStickers.PillarEmotionalReadiness,
  'financial-planning': PillarStickers.PillarFinancialPlanning,
  'partner-journey': PillarStickers.PillarPartnerAlignment,
  'health-checkups': PillarStickers.PillarHealthCheckup,

  // Pregnancy (9)
  'week-by-week': PillarStickers.PillarWeekByWeek,
  'symptoms-relief': PillarStickers.PillarSymptomsRelief,
  'birth-planning': PillarStickers.PillarBirthPlanning,
  'breastfeeding-prep': PillarStickers.PillarBreastfeedingPrep,
  'baby-gear': PillarStickers.PillarBabyGear,
  'partner-support': PillarStickers.PillarPartnerSupport,
  'postpartum-prep': PillarStickers.PillarPostpartumPrep,
  'pregnancy-nutrition': PillarStickers.PillarNutrition,
  'emotional-wellness': PillarStickers.PillarEmotionalWellness,

  // Kids (9)
  milk: PillarStickers.PillarMilk,
  food: PillarStickers.PillarFood,
  nutrition: PillarStickers.PillarNutritionKids,
  vaccines: PillarStickers.PillarVaccines,
  clothes: PillarStickers.PillarClothes,
  recipes: PillarStickers.PillarRecipes,
  habits: PillarStickers.PillarHabits,
  medicine: PillarStickers.PillarMedicine,
  milestones: PillarStickers.PillarMilestones,
}

export function getPillarSticker(id: string): StickerComponent | null {
  return PILLAR_STICKERS[id] ?? null
}

/**
 * Pillar ID → sticker-soft tint key. Use with `useTheme().stickers[key]`
 * to color the small icon circle on each TipCard. Pick was tuned so each
 * pillar sits in a different family from its mode neighbors.
 */
type StickerTintKey =
  | 'yellowSoft'
  | 'blueSoft'
  | 'pinkSoft'
  | 'greenSoft'
  | 'lilacSoft'
  | 'peachSoft'

const PILLAR_TINTS: Record<string, StickerTintKey> = {
  // Pre-pregnancy
  fertility: 'pinkSoft',
  'fertility-basics': 'pinkSoft',
  'nutrition-prep': 'greenSoft',
  'emotional-readiness': 'yellowSoft',
  'financial-planning': 'peachSoft',
  'partner-journey': 'lilacSoft',
  'health-checkups': 'blueSoft',

  // Pregnancy
  'week-by-week': 'lilacSoft',
  'symptoms-relief': 'peachSoft',
  'birth-planning': 'pinkSoft',
  'breastfeeding-prep': 'pinkSoft',
  'baby-gear': 'blueSoft',
  'partner-support': 'lilacSoft',
  'postpartum-prep': 'greenSoft',
  'pregnancy-nutrition': 'greenSoft',
  'emotional-wellness': 'yellowSoft',

  // Kids
  milk: 'pinkSoft',
  food: 'greenSoft',
  nutrition: 'yellowSoft',
  vaccines: 'blueSoft',
  clothes: 'peachSoft',
  recipes: 'peachSoft',
  habits: 'greenSoft',
  medicine: 'pinkSoft',
  milestones: 'lilacSoft',
}

export function getPillarTintKey(id: string): StickerTintKey {
  return PILLAR_TINTS[id] ?? 'peachSoft'
}
