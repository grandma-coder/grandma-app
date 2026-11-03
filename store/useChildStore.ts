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
    // Take the fresh object for the same id — keeping the old one left an edited name/birth date
    // stale on every screen that reads activeChild until a restart.
    activeChild: (state.activeChild && children.find((c) => c.id === state.activeChild!.id))
      ?? (children[0] ?? null),
  })),
  setActiveChild: (activeChild) => set({ activeChild }),
  clearChildren: () => set({ children: [], activeChild: null }),
}))
