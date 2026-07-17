import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// User-configurable cycle parameters (Phase 2 / cycle completeness).
//
// Before this, cycleLength was measured from period history but periodLength (5)
// and lutealPhase (14) were hardcoded in ~6 places. This store is the single
// override source: when a value is set, it wins over the measured/default.
//
//   cycleLength  — null = use the measured average (from logged periods); a
//                  number = the user's declared average cycle length.
//   periodLength — days of bleeding (default 5).
//   lutealPhase  — luteal-phase length in days (default 14); ovulation =
//                  cycleLength − lutealPhase.
//
// Persisted locally (device preference, like units) — no server column needed.
interface CycleSettingsStore {
  cycleLength: number | null
  periodLength: number
  lutealPhase: number
  hydrated: boolean

  setCycleLength: (v: number | null) => void
  setPeriodLength: (v: number) => void
  setLutealPhase: (v: number) => void
  setHydrated: (v: boolean) => void
}

// Clamp ranges match the cycle engine's own guards (cycleLogic clamps 21–60).
export const CYCLE_LENGTH_RANGE = { min: 21, max: 45 }
export const PERIOD_LENGTH_RANGE = { min: 1, max: 10 }
export const LUTEAL_RANGE = { min: 9, max: 18 }

export const useCycleSettingsStore = create<CycleSettingsStore>()(
  persist(
    (set) => ({
      cycleLength: null,
      periodLength: 5,
      lutealPhase: 14,
      hydrated: false,

      setCycleLength: (cycleLength) => set({ cycleLength }),
      setPeriodLength: (periodLength) => set({ periodLength }),
      setLutealPhase: (lutealPhase) => set({ lutealPhase }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'grandma-cycle-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ cycleLength: s.cycleLength, periodLength: s.periodLength, lutealPhase: s.lutealPhase }),
      onRehydrateStorage: () => () => {
        useCycleSettingsStore.setState({ hydrated: true })
      },
    }
  )
)
