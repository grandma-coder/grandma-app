/**
 * Onboarding Queue Store — manages multi-behavior onboarding.
 *
 * When multiple behaviors are selected on the Journey screen, this store
 * queues them in priority order and tracks progress. Persisted to
 * AsyncStorage so that if the user kills the app mid-queue (e.g. after
 * completing pregnancy onboarding but before starting kids), the queue
 * resumes from where they left off instead of dropping the remaining
 * behaviors silently.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Behavior } from './useBehaviorStore'

/** Priority order: pregnancy first, kids second, cycle last */
const PRIORITY: Record<Behavior, number> = {
  pregnancy: 0,
  kids: 1,
  'pre-pregnancy': 2,
}

interface OnboardingStore {
  queue: Behavior[]
  currentOnboarding: Behavior | null
  completedOnboarding: Behavior[]

  buildQueue: (selected: Behavior[]) => void
  completeCurrentFlow: () => void
  skipCurrentFlow: () => void
  reset: () => void
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      queue: [],
      currentOnboarding: null,
      completedOnboarding: [],

      buildQueue: (selected) => {
        const sorted = [...selected].sort((a, b) => PRIORITY[a] - PRIORITY[b])
        set({
          queue: sorted,
          currentOnboarding: sorted[0] ?? null,
          completedOnboarding: [],
        })
      },

      completeCurrentFlow: () => {
        const { queue, currentOnboarding, completedOnboarding } = get()
        if (!currentOnboarding) return

        const remaining = queue.filter((b) => b !== currentOnboarding)
        set({
          queue: remaining,
          completedOnboarding: [...completedOnboarding, currentOnboarding],
          currentOnboarding: remaining[0] ?? null,
        })
      },

      skipCurrentFlow: () => {
        const { queue, currentOnboarding } = get()
        if (!currentOnboarding) return

        const remaining = queue.filter((b) => b !== currentOnboarding)
        set({
          queue: remaining,
          currentOnboarding: remaining[0] ?? null,
        })
      },

      reset: () =>
        set({
          queue: [],
          currentOnboarding: null,
          completedOnboarding: [],
        }),
    }),
    {
      name: 'grandma-onboarding-queue',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)

/** Whether there are more flows after the current one */
export function useHasNextOnboarding(): boolean {
  return useOnboardingStore((s) => s.queue.length > 1)
}

/** The next behavior in the queue (after current) */
export function useNextBehavior(): Behavior | null {
  return useOnboardingStore((s) => s.queue[1] ?? null)
}
