import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { JourneyMode } from '../types'

export type CycleIntent = 'ttc' | 'tracking'

interface ModeStore {
  mode: JourneyMode
  cycleIntent: CycleIntent
  hydrated: boolean
  setMode: (mode: JourneyMode) => void
  setCycleIntent: (intent: CycleIntent) => void
  setHydrated: (hydrated: boolean) => void
}

export const useModeStore = create<ModeStore>()(
  persist(
    (set) => ({
      mode: 'kids',
      cycleIntent: 'tracking',
      hydrated: false,
      setMode: (mode) => set({ mode }),
      setCycleIntent: (cycleIntent) => set({ cycleIntent }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'grandma-mode',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ mode: state.mode, cycleIntent: state.cycleIntent }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    }
  )
)
