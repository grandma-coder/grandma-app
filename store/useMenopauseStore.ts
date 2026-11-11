import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { MenopauseStage } from '../lib/menopauseStage'

interface MenopauseStore {
  stage: MenopauseStage | null
  lastPeriodDate: string | null // ISO YYYY-MM-DD
  /**
   * The onboarding "Are you on hormone therapy?" answer; null = not asked yet. Device-only:
   * profiles has no column for it, and the existing JSON columns (birth_preferences,
   * privacy_settings, notification_prefs) belong to other features.
   */
  onHrt: boolean | null
  hydrated: boolean
  setStage: (s: MenopauseStage) => void
  setLastPeriodDate: (iso: string | null) => void
  setOnHrt: (v: boolean) => void
  setHydrated: (v: boolean) => void
}

export const useMenopauseStore = create<MenopauseStore>()(
  persist(
    (set) => ({
      stage: null,
      lastPeriodDate: null,
      onHrt: null,
      hydrated: false,
      setStage: (stage) => set({ stage }),
      setLastPeriodDate: (lastPeriodDate) => set({ lastPeriodDate }),
      setOnHrt: (onHrt) => set({ onHrt }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'grandma-menopause',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ stage: s.stage, lastPeriodDate: s.lastPeriodDate, onHrt: s.onHrt }),
      // Must flip hydrated even when nothing is persisted (fresh install) —
      // see useBehaviorStore for the rationale.
      onRehydrateStorage: () => () => {
        useMenopauseStore.setState({ hydrated: true })
      },
    },
  ),
)
