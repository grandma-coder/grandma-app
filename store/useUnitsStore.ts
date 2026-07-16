import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// User's measurement-unit preferences (Phase 0 / B4). Canonical values are
// ALWAYS stored in metric in the DB (kg, °C, mL); these only control display +
// input. See lib/units.ts for conversion helpers.
export type WeightUnit = 'kg' | 'lb'
export type TempUnit = 'c' | 'f'
export type VolumeUnit = 'ml' | 'floz'

interface UnitsStore {
  weightUnit: WeightUnit
  tempUnit: TempUnit
  volumeUnit: VolumeUnit
  hydrated: boolean
  setWeightUnit: (u: WeightUnit) => void
  setTempUnit: (u: TempUnit) => void
  setVolumeUnit: (u: VolumeUnit) => void
  setHydrated: (hydrated: boolean) => void
}

export const useUnitsStore = create<UnitsStore>()(
  persist(
    (set) => ({
      // Metric defaults (matches how data is stored + prior hardcoded behavior).
      weightUnit: 'kg',
      tempUnit: 'c',
      volumeUnit: 'ml',
      hydrated: false,
      setWeightUnit: (weightUnit) => set({ weightUnit }),
      setTempUnit: (tempUnit) => set({ tempUnit }),
      setVolumeUnit: (volumeUnit) => set({ volumeUnit }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'grandma-units',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        weightUnit: state.weightUnit,
        tempUnit: state.tempUnit,
        volumeUnit: state.volumeUnit,
      }),
      // See useBehaviorStore for the rationale — must flip hydrated even when
      // there's nothing persisted to rehydrate from, so the first render past
      // the gate reads the real (or default) preference, not a flash.
      onRehydrateStorage: () => () => {
        useUnitsStore.setState({ hydrated: true })
      },
    }
  )
)
