/**
 * Client helper for the `food-ai` Supabase Edge Function.
 *
 * Two entry points:
 *  - estimateFromText   → identifies foods from free text (covers ANY food,
 *                          not just the local FOOD_DB), returns calories.
 *  - estimateFromImage  → sends a plate photo, Claude Vision identifies each
 *                          item and estimates a child-sized portion.
 *
 * Kept separate from lib/foodCalories.ts: that file is the instant local
 * fallback used while the user types. This one is the authoritative backend.
 */
import { supabase } from './supabase'

export interface AiFoodItem {
  name: string
  cals: number
  category: 'fruit' | 'vegetable' | 'grain' | 'protein' | 'dairy' | 'drink' | 'snack' | 'mixed'
  portionG?: number
  confidence: 'high' | 'medium' | 'low'
}

export interface AiFoodResult {
  foods: AiFoodItem[]
  totalCals: number
  notes?: string
}

type Meal = 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'night_snack'

interface TextArgs {
  text: string
  childAgeMonths?: number
  meal?: Meal
}

interface ImageArgs {
  imageBase64: string
  mediaType?: 'image/jpeg' | 'image/png' | 'image/webp'
  childAgeMonths?: number
  meal?: Meal
}

async function invoke(body: Record<string, unknown>): Promise<AiFoodResult> {
  const { data, error } = await supabase.functions.invoke('food-ai', { body })
  if (error) throw new Error(error.message ?? 'food-ai invocation failed')
  // Edge function always returns { foods, totalCals, notes? }, even on error (foods=[])
  const result = (data ?? {}) as Partial<AiFoodResult>
  return {
    foods: Array.isArray(result.foods) ? result.foods : [],
    totalCals: typeof result.totalCals === 'number' ? result.totalCals : 0,
    notes: typeof result.notes === 'string' ? result.notes : undefined,
  }
}

export function estimateFromText(args: TextArgs): Promise<AiFoodResult> {
  return invoke({ mode: 'text', ...args })
}

export function estimateFromImage(args: ImageArgs): Promise<AiFoodResult> {
  return invoke({ mode: 'image', mediaType: 'image/jpeg', ...args })
}
