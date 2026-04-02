import { create } from 'zustand'
import type { JourneyMode } from '../types'

type Journey = 'pregnancy' | 'newborn' | 'toddler' | null

interface JourneyStore {
  journey: Journey
  mode: JourneyMode | null
  dueDate: string | null
  lmpDate: string | null
  weekNumber: number | null
  trackedActivities: string[]
  parentName: string | null
  babyName: string | null
  setJourney: (journey: Journey) => void
  setMode: (mode: JourneyMode) => void
  setDueDate: (date: string | null) => void
  setLmpDate: (date: string | null) => void
  setWeekNumber: (week: number | null) => void
  setTrackedActivities: (activities: string[]) => void
  setParentName: (name: string | null) => void
  setBabyName: (name: string | null) => void
  clearAll: () => void
}

export const useJourneyStore = create<JourneyStore>((set) => ({
  journey: null,
  mode: null,
  dueDate: null,
  lmpDate: null,
  weekNumber: null,
  trackedActivities: [],
  parentName: null,
  babyName: null,
  setJourney: (journey) => set({ journey }),
  setMode: (mode) => set({ mode }),
  setDueDate: (dueDate) => set({ dueDate }),
  setLmpDate: (lmpDate) => set({ lmpDate }),
  setWeekNumber: (weekNumber) => set({ weekNumber }),
  setTrackedActivities: (trackedActivities) => set({ trackedActivities }),
  setParentName: (parentName) => set({ parentName }),
  setBabyName: (babyName) => set({ babyName }),
  clearAll: () => set({
    journey: null,
    mode: null,
    dueDate: null,
    lmpDate: null,
    weekNumber: null,
    trackedActivities: [],
    parentName: null,
    babyName: null,
  }),
}))
