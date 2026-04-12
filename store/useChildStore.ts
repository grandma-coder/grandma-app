import { create } from 'zustand'
import type { ChildWithRole } from '../types'

interface ChildStore {
  children: ChildWithRole[]
  activeChild: ChildWithRole | null
  setChildren: (children: ChildWithRole[]) => void
  setActiveChild: (child: ChildWithRole) => void
  clearChildren: () => void
}

export const useChildStore = create<ChildStore>((set) => ({
  children: [],
  activeChild: null,
  setChildren: (children) => set((state) => ({
    children,
    activeChild: state.activeChild && children.find((c) => c.id === state.activeChild!.id)
      ? state.activeChild
      : (children[0] ?? null),
  })),
  setActiveChild: (activeChild) => set({ activeChild }),
  clearChildren: () => set({ children: [], activeChild: null }),
}))
