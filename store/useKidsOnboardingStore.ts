/**
 * Kids Onboarding Store — holds answers from the kids onboarding flow.
 *
 * Ephemeral (not persisted) — data is saved to Supabase at the end of the flow,
 * then this store is cleared.
 */

import { create } from 'zustand'

export type CaregiverRole = 'partner' | 'nanny' | 'family' | 'doctor'

export interface ChildDraft {
  name: string
  birthDate: string | null
  photoUri: string | null
  allergies: string[]
  conditionsText: string | null
}

interface KidsOnboardingStore {
  childCount: number
  children: ChildDraft[]
  partnerName: string | null
  caregiverName: string | null
  caregiverRole: CaregiverRole | null

  setChildCount: (count: number) => void
  updateChild: (index: number, updates: Partial<ChildDraft>) => void
  toggleAllergy: (index: number, allergy: string) => void
  setPartnerName: (name: string | null) => void
  setCaregiverName: (name: string | null) => void
  setCaregiverRole: (role: CaregiverRole | null) => void
  clearAll: () => void
}

function emptyChild(): ChildDraft {
  return {
    name: '',
    birthDate: null,
    photoUri: null,
    allergies: [],
    conditionsText: null,
  }
}

const initialState = {
  childCount: 1,
  children: [emptyChild()] as ChildDraft[],
  partnerName: null as string | null,
  caregiverName: null as string | null,
  caregiverRole: null as CaregiverRole | null,
}

export const useKidsOnboardingStore = create<KidsOnboardingStore>((set, get) => ({
  ...initialState,

  setChildCount: (count) => {
    const clamped = Math.max(1, Math.min(6, count))
    const current = get().children
    const children: ChildDraft[] = []
    for (let i = 0; i < clamped; i++) {
      children.push(current[i] ?? emptyChild())
    }
    set({ childCount: clamped, children })
  },

  updateChild: (index, updates) => {
    const children = [...get().children]
    if (children[index]) {
      children[index] = { ...children[index], ...updates }
      set({ children })
    }
  },

  toggleAllergy: (index, allergy) => {
    const children = [...get().children]
    const child = children[index]
    if (!child) return
    const has = child.allergies.includes(allergy)
    children[index] = {
      ...child,
      allergies: has
        ? child.allergies.filter((a) => a !== allergy)
        : [...child.allergies, allergy],
    }
    set({ children })
  },

  setPartnerName: (partnerName) => set({ partnerName }),
  setCaregiverName: (caregiverName) => set({ caregiverName }),
  setCaregiverRole: (caregiverRole) => set({ caregiverRole }),
  clearAll: () => set({ ...initialState, children: [emptyChild()] }),
}))
