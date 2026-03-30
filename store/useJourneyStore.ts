import { create } from 'zustand'

type Journey = 'pregnancy' | 'newborn' | 'toddler' | null

interface JourneyStore {
  journey: Journey
  dueDate: string | null
  lmpDate: string | null
  weekNumber: number | null
  trackedActivities: string[]
  setJourney: (journey: Journey) => void
  setDueDate: (date: string | null) => void
  setLmpDate: (date: string | null) => void
  setWeekNumber: (week: number | null) => void
  setTrackedActivities: (activities: string[]) => void
  clearAll: () => void
}

export const useJourneyStore = create<JourneyStore>((set) => ({
  journey: null,
  dueDate: null,
  lmpDate: null,
  weekNumber: null,
  trackedActivities: [],
  setJourney: (journey) => set({ journey }),
  setDueDate: (dueDate) => set({ dueDate }),
  setLmpDate: (lmpDate) => set({ lmpDate }),
  setWeekNumber: (weekNumber) => set({ weekNumber }),
  setTrackedActivities: (trackedActivities) => set({ trackedActivities }),
  clearAll: () => set({
    journey: null,
    dueDate: null,
    lmpDate: null,
    weekNumber: null,
    trackedActivities: [],
  }),
}))
