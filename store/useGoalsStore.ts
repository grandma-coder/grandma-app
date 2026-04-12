import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'

// ─── Age Helpers ────────────────────────────────────────────────────────────

/** Get age in months from birth date */
export function getAgeMonths(birthDate: string): number {
  if (!birthDate) return 24 // default to toddler if unknown
  const now = new Date()
  const birth = new Date(birthDate)
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

/**
 * Feeding stage determines what the "nutrition" pillar tracks:
 * - 'liquid'   (0-5mo): breast/bottle only → track feeding count + volume (ml)
 * - 'mixed'    (6-11mo): breast/bottle + early solids → track feedings + meals
 * - 'solids'   (12mo+): mostly solid food → track calories
 */
export type FeedingStage = 'liquid' | 'mixed' | 'solids'

export function getFeedingStage(birthDate: string): FeedingStage {
  const months = getAgeMonths(birthDate)
  if (months < 6)  return 'liquid'
  if (months < 12) return 'mixed'
  return 'solids'
}

// ─── Age-Based Suggested Goals ──────────────────────────────────────────────

export interface MetricGoals {
  sleep: number      // daily hours
  calories: number   // daily kcal (solids stage)
  feedings: number   // daily feeding count (liquid/mixed stage)
  feedingMl: number  // daily total volume ml (liquid/mixed stage)
  activity: number   // daily logged activities count
}

/** CDC / WHO based suggestions by age in months */
export function getSuggestedGoals(birthDate: string): MetricGoals {
  const months = getAgeMonths(birthDate)

  // Liquid stage: exclusive breast/bottle
  if (months < 1)  return { sleep: 16, calories: 0, feedings: 10, feedingMl: 600,  activity: 3 }
  if (months < 3)  return { sleep: 15, calories: 0, feedings: 8,  feedingMl: 750,  activity: 3 }
  if (months < 6)  return { sleep: 14, calories: 0, feedings: 7,  feedingMl: 850,  activity: 4 }

  // Mixed stage: breast/bottle + intro to solids
  if (months < 9)  return { sleep: 13, calories: 300,  feedings: 5, feedingMl: 700, activity: 5 }
  if (months < 12) return { sleep: 13, calories: 500,  feedings: 4, feedingMl: 600, activity: 5 }

  // Solids stage: primarily solid food + milk bottles
  if (months < 18) return { sleep: 12, calories: 950,  feedings: 3, feedingMl: 450, activity: 6 }
  if (months < 24) return { sleep: 12, calories: 1050, feedings: 2, feedingMl: 400, activity: 6 }
  if (months < 36) return { sleep: 12, calories: 1150, feedings: 2, feedingMl: 350, activity: 7 }
  if (months < 48) return { sleep: 11, calories: 1300, feedings: 1, feedingMl: 250, activity: 7 }
  return                    { sleep: 10, calories: 1500, feedings: 0, feedingMl: 0,   activity: 8 }
}

/** Nutrition pillar label based on feeding stage */
export function getNutritionLabel(stage: FeedingStage): string {
  if (stage === 'liquid') return 'Feedings'
  return 'Nutrition'
}

// ─── Store ──────────────────────────────────────────────────────────────────

const DEFAULT_GOALS: MetricGoals = {
  sleep: 12, calories: 1000, feedings: 6, feedingMl: 750, activity: 5,
}

interface GoalsState {
  goals: Record<string, MetricGoals>
  hydrated: boolean
  setHydrated: (h: boolean) => void
  setGoal: (childId: string, metric: keyof MetricGoals, value: number) => void
  setAllGoals: (childId: string, goals: MetricGoals) => void
  getGoals: (childId: string, birthDate: string) => MetricGoals
  syncFromSupabase: (childId: string) => Promise<void>
  saveToSupabase: (childId: string, userId: string) => Promise<void>
}

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set, get) => ({
      goals: {},
      hydrated: false,
      setHydrated: (h) => set({ hydrated: h }),

      setGoal: (childId, metric, value) => {
        const current = get().goals[childId] || { ...DEFAULT_GOALS }
        set({
          goals: {
            ...get().goals,
            [childId]: { ...current, [metric]: value },
          },
        })
      },

      setAllGoals: (childId, goals) => {
        set({
          goals: { ...get().goals, [childId]: goals },
        })
      },

      getGoals: (childId, birthDate) => {
        const stored = get().goals[childId]
        if (stored) {
          // Backfill new fields for stores saved before feedings existed
          return {
            ...DEFAULT_GOALS,
            ...getSuggestedGoals(birthDate),
            ...stored,
          }
        }
        return getSuggestedGoals(birthDate)
      },

      syncFromSupabase: async (childId) => {
        const { data } = await supabase
          .from('child_goals')
          .select('metric, daily_target')
          .eq('child_id', childId)

        if (data && data.length > 0) {
          const current = get().goals[childId] || { ...DEFAULT_GOALS }
          const goals = { ...current }
          for (const row of data) {
            const key = row.metric as keyof MetricGoals
            if (key in goals) (goals as any)[key] = Number(row.daily_target)
          }
          set({ goals: { ...get().goals, [childId]: goals } })
        }
      },

      saveToSupabase: async (childId, userId) => {
        const goals = get().goals[childId]
        if (!goals) return

        const now = new Date().toISOString()
        const rows = [
          { child_id: childId, user_id: userId, metric: 'sleep',     daily_target: goals.sleep,     unit: 'hours',   updated_at: now },
          { child_id: childId, user_id: userId, metric: 'calories',  daily_target: goals.calories,  unit: 'kcal',    updated_at: now },
          { child_id: childId, user_id: userId, metric: 'feedings',  daily_target: goals.feedings,  unit: 'count',   updated_at: now },
          { child_id: childId, user_id: userId, metric: 'feedingMl', daily_target: goals.feedingMl, unit: 'ml',      updated_at: now },
          { child_id: childId, user_id: userId, metric: 'activity',  daily_target: goals.activity,  unit: 'count',   updated_at: now },
        ]

        await supabase
          .from('child_goals')
          .upsert(rows, { onConflict: 'child_id,metric' })
      },
    }),
    {
      name: 'grandma-goals',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ goals: state.goals }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    }
  )
)
