/**
 * Unlock Celebration Store — tracks which metric-unlocks have been CELEBRATED
 * (so a one-time "Unlocked" toast fires once per metric).
 *
 * Keys are metric unlock identifiers like "cycle:regularity", "kids:sleep", etc.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface UnlockState {
  celebrated: string[]          // keys like "cycle:regularity"
  hydrated: boolean
  hasCelebrated: (key: string) => boolean
  markCelebrated: (key: string) => void
  markManyCelebrated: (keys: string[]) => void   // idempotent, dedupes
  setHydrated: (h: boolean) => void
}

export const useUnlockStore = create<UnlockState>()(
  persist(
    (set, get) => ({
      celebrated: [],
      hydrated: false,

      setHydrated: (h) => set({ hydrated: h }),

      hasCelebrated: (key) => {
        return get().celebrated.includes(key)
      },

      markCelebrated: (key) => {
        const state = get()
        if (!state.celebrated.includes(key)) {
          set((s) => ({
            celebrated: [...s.celebrated, key],
          }))
        }
      },

      markManyCelebrated: (keys) => {
        const state = get()
        const newKeys = Array.from(new Set(keys)).filter((k) => !state.celebrated.includes(k))
        if (newKeys.length > 0) {
          set((s) => ({
            celebrated: [...s.celebrated, ...newKeys],
          }))
        }
      },
    }),
    {
      name: 'unlock-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        celebrated: state.celebrated,
      }),
      onRehydrateStorage: () => (state) => {
        // On a fresh install there's no persisted state, so `state` is undefined
        // and `state?.setHydrated(true)` no-ops — the gate would never flip.
        // Set it on the store directly so hydration completes either way.
        useUnlockStore.setState({ hydrated: true })
      },
    },
  ),
)
