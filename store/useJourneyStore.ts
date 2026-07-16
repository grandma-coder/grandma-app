import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface JourneyStore {
  dueDate: string | null
  weekNumber: number | null
  parentName: string | null
  /** User's date of birth (YYYY-MM-DD). Captured in the shared "About you"
   *  onboarding step; persisted to profiles.dob. Calibrates predictions. */
  parentDob: string | null
  babyName: string | null
  /** Flipped true once AsyncStorage rehydration completes. Gate data-derived
   *  UI on this to avoid the "week 1 → week 40 flash" — see code-style.md. */
  hydrated: boolean
  setDueDate: (date: string | null) => void
  setWeekNumber: (week: number | null) => void
  setParentName: (name: string | null) => void
  setParentDob: (dob: string | null) => void
  setBabyName: (name: string | null) => void
  setHydrated: (v: boolean) => void
  clearAll: () => void
}

export const useJourneyStore = create<JourneyStore>()(
  persist(
    (set) => ({
      dueDate: null,
      weekNumber: null,
      parentName: null,
      parentDob: null,
      babyName: null,
      hydrated: false,
      setDueDate: (dueDate) => set({ dueDate }),
      setWeekNumber: (weekNumber) => set({ weekNumber }),
      setParentName: (parentName) => set({ parentName }),
      setParentDob: (parentDob) => set({ parentDob }),
      setBabyName: (babyName) => set({ babyName }),
      setHydrated: (hydrated) => set({ hydrated }),
      clearAll: () => set({
        dueDate: null,
        weekNumber: null,
        parentName: null,
        parentDob: null,
        babyName: null,
      }),
    }),
    {
      name: 'grandma-journey',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        dueDate: state.dueDate,
        weekNumber: state.weekNumber,
        parentName: state.parentName,
        parentDob: state.parentDob,
        babyName: state.babyName,
      }),
      // setState (not state?.setHydrated) so it still flips on a fresh install
      // where there's nothing to rehydrate — see useBehaviorStore for the why.
      onRehydrateStorage: () => () => {
        useJourneyStore.setState({ hydrated: true })
      },
    }
  )
)
