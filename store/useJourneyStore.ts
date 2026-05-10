import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

type Journey = 'pregnancy' | 'newborn' | 'toddler' | null

interface JourneyStore {
  journey: Journey
  dueDate: string | null
  lmpDate: string | null
  weekNumber: number | null
  trackedActivities: string[]
  parentName: string | null
  babyName: string | null
  setJourney: (journey: Journey) => void
  setDueDate: (date: string | null) => void
  setLmpDate: (date: string | null) => void
  setWeekNumber: (week: number | null) => void
  setTrackedActivities: (activities: string[]) => void
  setParentName: (name: string | null) => void
  setBabyName: (name: string | null) => void
  clearAll: () => void
}

export const useJourneyStore = create<JourneyStore>()(
  persist(
    (set) => ({
      journey: null,
      dueDate: null,
      lmpDate: null,
      weekNumber: null,
      trackedActivities: [],
      parentName: null,
      babyName: null,
      setJourney: (journey) => set({ journey }),
      setDueDate: (dueDate) => set({ dueDate }),
      setLmpDate: (lmpDate) => set({ lmpDate }),
      setWeekNumber: (weekNumber) => set({ weekNumber }),
      setTrackedActivities: (trackedActivities) => set({ trackedActivities }),
      setParentName: (parentName) => set({ parentName }),
      setBabyName: (babyName) => set({ babyName }),
      clearAll: () => set({
        journey: null,
        dueDate: null,
        lmpDate: null,
        weekNumber: null,
        trackedActivities: [],
        parentName: null,
        babyName: null,
      }),
    }),
    {
      name: 'grandma-journey',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        journey: state.journey,
        dueDate: state.dueDate,
        lmpDate: state.lmpDate,
        weekNumber: state.weekNumber,
        parentName: state.parentName,
        babyName: state.babyName,
      }),
    }
  )
)
