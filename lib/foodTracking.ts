import { supabase } from './supabase'

export interface FoodLogInput {
  childId: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  photoUrl?: string
  description?: string
  rating?: number
  foods?: string[]
  notes?: string
}

export async function logMeal(input: FoodLogInput) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('food_logs')
    .insert({
      child_id: input.childId,
      logged_by: user.id,
      meal_type: input.mealType,
      photo_url: input.photoUrl ?? null,
      description: input.description ?? null,
      rating: input.rating ?? null,
      foods: input.foods ?? [],
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getFoodLogs(childId: string, date: string) {
  const startOfDay = `${date}T00:00:00.000Z`
  const endOfDay = `${date}T23:59:59.999Z`

  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('child_id', childId)
    .gte('logged_at', startOfDay)
    .lte('logged_at', endOfDay)
    .order('logged_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getWeeklyFoodSummary(childId: string) {
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data, error } = await supabase
    .from('food_logs')
    .select('meal_type, rating, foods')
    .eq('child_id', childId)
    .gte('logged_at', weekAgo.toISOString())
    .order('logged_at', { ascending: false })

  if (error) throw error
  return data ?? []
}
