/**
 * Pillar ID → RewardSticker component mapping.
 *
 * Used by PillarCard and PillarGrid to render the correct sticker for each
 * of the 24 pillars (6 pre-preg + 9 pregnancy + 9 kids). Keeps the emoji
 * field in pillar data purely for fallback / search purposes.
 */

import type { ComponentType } from 'react'
import {
  // Pre-pregnancy (6)
  PillarFertility,
  PillarNutritionPrep,
  PillarEmotionalReadiness,
  PillarFinancial,
  PillarPartnerJourney,
  PillarHealthCheckups,
  // Pregnancy (9)
  PillarWeekByWeek,
  PillarSymptoms,
  PillarBirthPlanning,
  PillarBreastfeedingPrep,
  PillarBabyGear,
  PillarPartnerSupport,
  PillarPostpartumPrep,
  PillarPregNutrition,
  PillarEmotionalWellness,
  // Kids (9)
  PillarBreastfeeding,
  PillarFeeding,
  PillarKidsNutrition,
  PillarVaccines,
  PillarLayette,
  PillarRecipes,
  PillarNaturalCare,
  PillarMedicine,
  PillarMilestones,
} from '../components/stickers/RewardStickers'

type StickerComponent = ComponentType<{ size?: number; fill?: string; stroke?: string }>

const PILLAR_STICKERS: Record<string, StickerComponent> = {
  // Pre-pregnancy
  fertility: PillarFertility,
  'fertility-basics': PillarFertility,
  'nutrition-prep': PillarNutritionPrep,
  'emotional-readiness': PillarEmotionalReadiness,
  'financial-planning': PillarFinancial,
  'partner-journey': PillarPartnerJourney,
  'health-checkups': PillarHealthCheckups,

  // Pregnancy
  'week-by-week': PillarWeekByWeek,
  'symptoms-relief': PillarSymptoms,
  'birth-planning': PillarBirthPlanning,
  'breastfeeding-prep': PillarBreastfeedingPrep,
  'baby-gear': PillarBabyGear,
  'partner-support': PillarPartnerSupport,
  'postpartum-prep': PillarPostpartumPrep,
  'pregnancy-nutrition': PillarPregNutrition,
  'emotional-wellness': PillarEmotionalWellness,

  // Kids
  milk: PillarBreastfeeding,
  food: PillarFeeding,
  nutrition: PillarKidsNutrition,
  vaccines: PillarVaccines,
  clothes: PillarLayette,
  recipes: PillarRecipes,
  habits: PillarNaturalCare,
  medicine: PillarMedicine,
  milestones: PillarMilestones,
}

export function getPillarSticker(id: string): StickerComponent | null {
  return PILLAR_STICKERS[id] ?? null
}
