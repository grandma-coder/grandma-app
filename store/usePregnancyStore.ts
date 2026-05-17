import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type MoodType = 'radiant' | 'calm' | 'tired' | 'anxious' | 'nauseous' | 'energetic'

interface PregnancyStore {
  weekNumber: number | null
  dueDate: string | null
  dailyWeight: number | null
  mood: MoodType | null
  symptoms: string[]
  /**
   * True once AsyncStorage has finished rehydrating this store. Consumers
   * MUST gate any render that derives a "current week / day" off `dueDate`
   * on this flag — otherwise the first render returns `dueDate: null`,
   * falls back to week 1, then re-renders to week 40 once rehydration
   * lands. That's the visible flash on pregnancy home.
   */
  hydrated: boolean
  setWeekNumber: (week: number | null) => void
  setDueDate: (date: string | null) => void
  setDailyWeight: (weight: number | null) => void
  setMood: (mood: MoodType | null) => void
  setSymptoms: (symptoms: string[]) => void
  setHydrated: (hydrated: boolean) => void
  clearAll: () => void
}

export const usePregnancyStore = create<PregnancyStore>()(
  persist(
    (set) => ({
      weekNumber: null,
      dueDate: null,
      dailyWeight: null,
      mood: null,
      symptoms: [],
      hydrated: false,
      setWeekNumber: (weekNumber) => set({ weekNumber }),
      setDueDate: (dueDate) => set({ dueDate }),
      setDailyWeight: (dailyWeight) => set({ dailyWeight }),
      setMood: (mood) => set({ mood }),
      setSymptoms: (symptoms) => set({ symptoms }),
      setHydrated: (hydrated) => set({ hydrated }),
      clearAll: () => set({
        weekNumber: null,
        dueDate: null,
        dailyWeight: null,
        mood: null,
        symptoms: [],
      }),
    }),
    {
      name: 'grandma-pregnancy',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        weekNumber: state.weekNumber,
        dueDate: state.dueDate,
      }),
      // See useBehaviorStore for the rationale — must flip hydrated even
      // when there's nothing persisted to rehydrate from (fresh install).
      onRehydrateStorage: () => () => {
        usePregnancyStore.setState({ hydrated: true })
      },
    }
  )
)
