import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { MenopauseStage } from '../lib/menopauseStage'

interface MenopauseStore {
  stage: MenopauseStage | null
  lastPeriodDate: string | null // ISO YYYY-MM-DD
  hydrated: boolean
  setStage: (s: MenopauseStage) => void
  setLastPeriodDate: (iso: string | null) => void
  setHydrated: (v: boolean) => void
}

export const useMenopauseStore = create<MenopauseStore>()(
  persist(
    (set) => ({
      stage: null,
      lastPeriodDate: null,
      hydrated: false,
      setStage: (stage) => set({ stage }),
      setLastPeriodDate: (lastPeriodDate) => set({ lastPeriodDate }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'grandma-menopause',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ stage: s.stage, lastPeriodDate: s.lastPeriodDate }),
      // Must flip hydrated even when nothing is persisted (fresh install) —
      // see useBehaviorStore for the rationale.
      onRehydrateStorage: () => () => {
        useMenopauseStore.setState({ hydrated: true })
      },
    },
  ),
)
