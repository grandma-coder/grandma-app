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
  setWeekNumber: (week: number | null) => void
  setDueDate: (date: string | null) => void
  setDailyWeight: (weight: number | null) => void
  setMood: (mood: MoodType | null) => void
  setSymptoms: (symptoms: string[]) => void
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
      setWeekNumber: (weekNumber) => set({ weekNumber }),
      setDueDate: (dueDate) => set({ dueDate }),
      setDailyWeight: (dailyWeight) => set({ dailyWeight }),
      setMood: (mood) => set({ mood }),
      setSymptoms: (symptoms) => set({ symptoms }),
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
    }
  )
)
