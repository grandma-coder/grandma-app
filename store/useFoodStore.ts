import { create } from 'zustand'

export interface FoodEntry {
  id: string
  childId: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  photoUri?: string
  description?: string
  rating: number
  foods: string[]
  loggedAt: string
}

interface FoodStore {
  entries: FoodEntry[]
  setEntries: (entries: FoodEntry[]) => void
  addEntry: (entry: FoodEntry) => void
  clearEntries: () => void
}

export const useFoodStore = create<FoodStore>((set) => ({
  entries: [],
  setEntries: (entries) => set({ entries }),
  addEntry: (entry) => set((state) => ({ entries: [...state.entries, entry] })),
  clearEntries: () => set({ entries: [] }),
}))
