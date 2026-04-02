import { create } from 'zustand'

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

export const usePregnancyStore = create<PregnancyStore>((set) => ({
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
}))
