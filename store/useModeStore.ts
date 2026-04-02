import { create } from 'zustand'
import type { JourneyMode } from '../types'

interface ModeStore {
  mode: JourneyMode
  setMode: (mode: JourneyMode) => void
}

export const useModeStore = create<ModeStore>((set) => ({
  mode: 'kids',
  setMode: (mode) => set({ mode }),
}))
