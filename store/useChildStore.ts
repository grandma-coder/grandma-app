import { create } from 'zustand'
import type { Child } from '../types'

interface ChildStore {
  child: Child | null
  setChild: (child: Child) => void
  clearChild: () => void
}

export const useChildStore = create<ChildStore>((set) => ({
  child: null,
  setChild: (child) => set({ child }),
  clearChild: () => set({ child: null }),
}))