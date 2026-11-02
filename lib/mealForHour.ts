/** Meal moment id (matches MealMoment in KidsLogForms) implied by an hour of the day (0–23). */
export function mealForHour(h: number): 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'night_snack' {
  if (h >= 5 && h < 10) return 'breakfast'
  if (h >= 10 && h < 12) return 'morning_snack'
  if (h >= 12 && h < 15) return 'lunch'
  if (h >= 15 && h < 18) return 'afternoon_snack'
  if (h >= 18 && h < 21) return 'dinner'
  return 'night_snack'
}
