/** The pregnancy widget's fruit image (base64 PNG), captured once per week. Persisted on-device. */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface WidgetAssetState {
  fruitWeek: number | null
  fruitPng: string | null
  setFruit: (week: number, png: string) => void
  reset: () => void
}

export const useWidgetAssetStore = create<WidgetAssetState>()(
  persist(
    (set) => ({
      fruitWeek: null,
      fruitPng: null,
      setFruit: (fruitWeek, fruitPng) => set({ fruitWeek, fruitPng }),
      reset: () => set({ fruitWeek: null, fruitPng: null }),
    }),
    { name: 'grandma-widget-assets', storage: createJSONStorage(() => AsyncStorage) },
  ),
)

/** True when the stored fruit is missing or from another pregnancy week. */
export function needsFruitCapture(week: number, state: Pick<WidgetAssetState, 'fruitWeek' | 'fruitPng'>): boolean {
  return state.fruitWeek !== week || !state.fruitPng
}
