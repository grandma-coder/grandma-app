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
