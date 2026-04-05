/**
 * Behavior Store — tracks which journey modes a user has selected.
 *
 * Users can select multiple behaviors (e.g., pre-pregnancy + pregnancy).
 * The primary mode (first selected) drives tab layout via useModeStore.
 * Persisted to AsyncStorage so selections survive restarts.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { JourneyMode } from '../types'

export type Behavior = 'pre-pregnancy' | 'pregnancy' | 'kids'

interface BehaviorStore {
  /** Selected behaviors (user can pick multiple) */
  behaviors: Behavior[]
  /** Which behavior is currently being onboarded */
  onboardingQueue: Behavior[]
  hydrated: boolean

  setBehaviors: (behaviors: Behavior[]) => void
  toggleBehavior: (behavior: Behavior) => void
  setOnboardingQueue: (queue: Behavior[]) => void
  /** Shift next behavior from queue; returns it or null */
  nextOnboarding: () => Behavior | null
  setHydrated: (hydrated: boolean) => void
}

export const useBehaviorStore = create<BehaviorStore>()(
  persist(
    (set, get) => ({
      behaviors: [],
      onboardingQueue: [],
      hydrated: false,

      setBehaviors: (behaviors) => set({ behaviors }),

      toggleBehavior: (behavior) => {
        const current = get().behaviors
        const exists = current.includes(behavior)
        set({
          behaviors: exists
            ? current.filter((b) => b !== behavior)
            : [...current, behavior],
        })
      },

      setOnboardingQueue: (queue) => set({ onboardingQueue: queue }),

      nextOnboarding: () => {
        const queue = get().onboardingQueue
        if (queue.length === 0) return null
        const [next, ...rest] = queue
        set({ onboardingQueue: rest })
        return next
      },

      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'grandma-behaviors',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ behaviors: state.behaviors }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    }
  )
)
