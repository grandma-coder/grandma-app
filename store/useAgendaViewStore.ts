import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * How the Calendar-tab agenda shows days, shared by every journey
 * (cycle, pregnancy, kids, menopause): one week strip or a full month grid.
 * Default is Week — the calmer view.
 */
export type AgendaView = 'week' | 'month'

interface AgendaViewStore {
  view: AgendaView
  setView: (view: AgendaView) => void
}

export const useAgendaViewStore = create<AgendaViewStore>()(
  persist(
    (set) => ({
      view: 'week',
      setView: (view) => set({ view }),
    }),
    {
      name: 'grandma-agenda-view',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ view: state.view }),
    }
  )
)
