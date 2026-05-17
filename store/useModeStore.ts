import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { JourneyMode } from '../types'
import { useBehaviorStore } from './useBehaviorStore'

export type CycleIntent = 'ttc' | 'tracking'

interface ModeStore {
  mode: JourneyMode
  cycleIntent: CycleIntent
  hydrated: boolean
  /**
   * Switch active mode. Rejected if the user isn't enrolled in the target
   * mode — call sites should route to the add-journey onboarding flow
   * instead. Use `setModeUnsafe` only from boot / onboarding paths where
   * enrollment is guaranteed to land moments later.
   */
  setMode: (mode: JourneyMode) => boolean
  setModeUnsafe: (mode: JourneyMode) => void
  setCycleIntent: (intent: CycleIntent) => void
  setHydrated: (hydrated: boolean) => void
}

export const useModeStore = create<ModeStore>()(
  persist(
    (set) => ({
      mode: 'kids',
      cycleIntent: 'tracking',
      hydrated: false,
      setMode: (mode) => {
        const enrolled = useBehaviorStore.getState().enrolledBehaviors
        // Empty enrollment is the cold-boot / fresh-install case — let it
        // pass so onboarding can stage a mode before enroll() lands.
        if (enrolled.length > 0 && !enrolled.includes(mode)) {
          return false
        }
        set({ mode })
        return true
      },
      setModeUnsafe: (mode) => set({ mode }),
      setCycleIntent: (cycleIntent) => set({ cycleIntent }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'grandma-mode',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ mode: state.mode, cycleIntent: state.cycleIntent }),
      // See useBehaviorStore for the rationale — must flip hydrated
      // even when there's nothing persisted to rehydrate from.
      onRehydrateStorage: () => () => {
        useModeStore.setState({ hydrated: true })
      },
    }
  )
)
