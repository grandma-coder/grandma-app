/**
 * Cycle Onboarding Store — holds answers from the pre-pregnancy onboarding flow.
 *
 * Ephemeral (not persisted) — data is saved to Supabase at the end of the flow,
 * then this store is cleared.
 */

import { create } from 'zustand'

export type ConditionChip = 'pcos' | 'endometriosis' | 'other' | 'prefer_not_to_say'
export type TryingDuration = 'just_starting' | 'few_months' | 'over_a_year'
export type TempUnit = 'celsius' | 'fahrenheit'

interface CycleOnboardingStore {
  // Base steps
  lastPeriodDate: string | null
  cycleLength: number | null
  cycleLengthUnknown: boolean
  periodDuration: number | null
  conditions: ConditionChip[]
  tempUnit: TempUnit

  // TTC extras
  tryingToConceive: boolean
  tryingDuration: TryingDuration | null
  trackingTemperature: boolean | null
  supplements: string | null

  // Actions
  setLastPeriodDate: (date: string | null) => void
  setCycleLength: (length: number | null) => void
  setCycleLengthUnknown: (unknown: boolean) => void
  setPeriodDuration: (duration: number | null) => void
  toggleCondition: (condition: ConditionChip) => void
  setTempUnit: (unit: TempUnit) => void
  setTryingToConceive: (ttc: boolean) => void
  setTryingDuration: (duration: TryingDuration | null) => void
  setTrackingTemperature: (tracking: boolean | null) => void
  setSupplements: (supplements: string | null) => void
  clearAll: () => void
}

const initialState = {
  lastPeriodDate: null,
  cycleLength: 28,
  cycleLengthUnknown: false,
  periodDuration: 5,
  conditions: [] as ConditionChip[],
  tempUnit: 'celsius' as TempUnit,
  tryingToConceive: false,
  tryingDuration: null as TryingDuration | null,
  trackingTemperature: null as boolean | null,
  supplements: null as string | null,
}

export const useCycleOnboardingStore = create<CycleOnboardingStore>((set, get) => ({
  ...initialState,

  setLastPeriodDate: (date) => set({ lastPeriodDate: date }),
  setCycleLength: (length) => set({ cycleLength: length }),
  setCycleLengthUnknown: (unknown) =>
    set({ cycleLengthUnknown: unknown, cycleLength: unknown ? null : 28 }),
  setPeriodDuration: (duration) => set({ periodDuration: duration }),

  toggleCondition: (condition) => {
    const current = get().conditions
    if (condition === 'prefer_not_to_say') {
      set({ conditions: current.includes(condition) ? [] : ['prefer_not_to_say'] })
      return
    }
    const without = current.filter((c) => c !== 'prefer_not_to_say')
    set({
      conditions: without.includes(condition)
        ? without.filter((c) => c !== condition)
        : [...without, condition],
    })
  },

  setTempUnit: (unit) => set({ tempUnit: unit }),
  setTryingToConceive: (ttc) => set({ tryingToConceive: ttc }),
  setTryingDuration: (duration) => set({ tryingDuration: duration }),
  setTrackingTemperature: (tracking) => set({ trackingTemperature: tracking }),
  setSupplements: (supplements) => set({ supplements }),
  clearAll: () => set(initialState),
}))
