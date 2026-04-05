/**
 * Pregnancy Onboarding Store — holds answers from the pregnancy onboarding flow.
 *
 * Ephemeral (not persisted) — data is saved to Supabase at the end of the flow,
 * then this store is cleared.
 */

import { create } from 'zustand'

export type BirthPlace = 'hospital' | 'birth_center' | 'home_birth' | 'undecided'
export type PregnancyMood = 'excited' | 'calm' | 'anxious' | 'tired' | 'nauseous' | 'happy'

interface PregnancyOnboardingStore {
  dueDate: string | null
  firstPregnancy: boolean | null
  mood: PregnancyMood | null
  birthPlace: BirthPlace | null
  careProvider: string | null
  conditionsText: string | null
  partnerName: string | null

  setDueDate: (date: string | null) => void
  setFirstPregnancy: (first: boolean | null) => void
  setMood: (mood: PregnancyMood | null) => void
  setBirthPlace: (place: BirthPlace | null) => void
  setCareProvider: (name: string | null) => void
  setConditionsText: (text: string | null) => void
  setPartnerName: (name: string | null) => void
  clearAll: () => void
}

const initialState = {
  dueDate: null as string | null,
  firstPregnancy: null as boolean | null,
  mood: null as PregnancyMood | null,
  birthPlace: null as BirthPlace | null,
  careProvider: null as string | null,
  conditionsText: null as string | null,
  partnerName: null as string | null,
}

export const usePregnancyOnboardingStore = create<PregnancyOnboardingStore>((set) => ({
  ...initialState,

  setDueDate: (dueDate) => set({ dueDate }),
  setFirstPregnancy: (firstPregnancy) => set({ firstPregnancy }),
  setMood: (mood) => set({ mood }),
  setBirthPlace: (birthPlace) => set({ birthPlace }),
  setCareProvider: (careProvider) => set({ careProvider }),
  setConditionsText: (conditionsText) => set({ conditionsText }),
  setPartnerName: (partnerName) => set({ partnerName }),
  clearAll: () => set(initialState),
}))
