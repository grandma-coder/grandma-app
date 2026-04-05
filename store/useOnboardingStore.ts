/**
 * Onboarding Queue Store — session-only, manages multi-behavior onboarding.
 *
 * When multiple behaviors are selected on the Journey screen,
 * this store queues them in priority order and tracks progress.
 * NOT persisted — resets on app restart.
 */

import { create } from 'zustand'
import type { Behavior } from './useBehaviorStore'

/** Priority order: pregnancy first, kids second, cycle last */
const PRIORITY: Record<Behavior, number> = {
  pregnancy: 0,
  kids: 1,
  'pre-pregnancy': 2,
}

interface OnboardingStore {
  /** Ordered queue of behaviors waiting to be onboarded */
  queue: Behavior[]
  /** Which onboarding flow is currently running */
  currentOnboarding: Behavior | null
  /** Flows completed this session */
  completedOnboarding: Behavior[]

  /** Sort selected behaviors by priority and start the queue */
  buildQueue: (selected: Behavior[]) => void
  /** Complete current flow — move to next in queue */
  completeCurrentFlow: () => void
  /** Skip current flow — move to next without enrolling */
  skipCurrentFlow: () => void
  /** Reset the entire queue */
  reset: () => void
}

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
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
      // Skipped — NOT added to completedOnboarding
      currentOnboarding: remaining[0] ?? null,
    })
  },

  reset: () => set({
    queue: [],
    currentOnboarding: null,
    completedOnboarding: [],
  }),
}))

/** Whether there are more flows after the current one */
export function useHasNextOnboarding(): boolean {
  return useOnboardingStore((s) => s.queue.length > 1)
}

/** The next behavior in the queue (after current) */
export function useNextBehavior(): Behavior | null {
  return useOnboardingStore((s) => s.queue[1] ?? null)
}
