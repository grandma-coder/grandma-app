/**
 * Behavior Store — simple multi-enrollment, single active mode.
 *
 * One active behavior at a time. All enrolled behavior data persists.
 * Switch behaviors from Profile in one tap — like switching Instagram accounts.
 * Grandma Talk always has access to all enrolled behavior data.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type Behavior = 'pre-pregnancy' | 'pregnancy' | 'kids'

interface BehaviorStore {
  /** All behaviors the user has set up. Data always persists. */
  enrolledBehaviors: Behavior[]
  /** The one active behavior the app is currently showing. */
  currentBehavior: Behavior | null
  /** Onboarding queue for sequential setup */
  onboardingQueue: Behavior[]
  hydrated: boolean

  enroll: (b: Behavior) => void
  unenroll: (b: Behavior) => void
  switchTo: (b: Behavior) => void
  isEnrolled: (b: Behavior) => boolean
  /** Legacy compat for journey onboarding toggle */
  toggleBehavior: (b: Behavior) => void
  setBehaviors: (behaviors: Behavior[]) => void
  setOnboardingQueue: (queue: Behavior[]) => void
  nextOnboarding: () => Behavior | null
  setHydrated: (hydrated: boolean) => void
}

export const useBehaviorStore = create<BehaviorStore>()(
  persist(
    (set, get) => ({
      enrolledBehaviors: [],
      currentBehavior: null,
      onboardingQueue: [],
      hydrated: false,

      enroll: (b) => {
        const current = get().enrolledBehaviors
        if (current.includes(b)) return
        set({
          enrolledBehaviors: [...current, b],
          currentBehavior: get().currentBehavior ?? b,
        })
      },

      unenroll: (b) => {
        const updated = get().enrolledBehaviors.filter((x) => x !== b)
        const cur = get().currentBehavior
        set({
          enrolledBehaviors: updated,
          currentBehavior: cur === b ? (updated[0] ?? null) : cur,
        })
      },

      switchTo: (b) => {
        if (get().enrolledBehaviors.includes(b)) {
          set({ currentBehavior: b })
        }
      },

      isEnrolled: (b) => get().enrolledBehaviors.includes(b),

      // Legacy compat — used by journey onboarding screen
      toggleBehavior: (b) => {
        const current = get().enrolledBehaviors
        const exists = current.includes(b)
        set({
          enrolledBehaviors: exists
            ? current.filter((x) => x !== b)
            : [...current, b],
        })
      },

      setBehaviors: (behaviors) => set({
        enrolledBehaviors: behaviors,
        currentBehavior: get().currentBehavior ?? behaviors[0] ?? null,
      }),

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
      partialize: (state) => ({
        enrolledBehaviors: state.enrolledBehaviors,
        currentBehavior: state.currentBehavior,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    }
  )
)
