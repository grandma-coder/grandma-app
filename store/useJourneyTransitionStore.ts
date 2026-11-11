/**
 * Journey transition prompts — what the JourneyTransitionHost should show next.
 *
 *   • pendingPositiveTest — a positive pregnancy test was just saved in Cycle
 *     ("want to start tracking your pregnancy?"). Transient.
 *   • promptedTests — test logs already asked about (user:date). Persisted, so
 *     the same test never asks twice.
 *   • askKeepCycle — she started pregnancy from a positive test; once the
 *     pregnancy onboarding finishes, ask whether to keep cycle tracking. Persisted.
 *   • celebrateBaby — the baby-arrived transition just landed on Kids. Transient.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface JourneyTransitionStore {
  pendingPositiveTest: { key: string; date: string } | null
  promptedTests: string[]
  askKeepCycle: boolean
  celebrateBaby: { name: string } | null

  offerPositiveTest: (key: string, date: string) => void
  /** Close the positive-test prompt and remember it was asked. */
  resolvePositiveTest: () => void
  setAskKeepCycle: (v: boolean) => void
  setCelebrateBaby: (v: { name: string } | null) => void
}

export const useJourneyTransitionStore = create<JourneyTransitionStore>()(
  persist(
    (set, get) => ({
      pendingPositiveTest: null,
      promptedTests: [],
      askKeepCycle: false,
      celebrateBaby: null,

      offerPositiveTest: (key, date) => set({ pendingPositiveTest: { key, date } }),
      resolvePositiveTest: () => {
        const pending = get().pendingPositiveTest
        if (!pending) return
        const prompted = get().promptedTests
        set({
          pendingPositiveTest: null,
          // Bounded: only recent keys matter (one per test day).
          promptedTests: prompted.includes(pending.key) ? prompted : [...prompted, pending.key].slice(-50),
        })
      },
      setAskKeepCycle: (askKeepCycle) => set({ askKeepCycle }),
      setCelebrateBaby: (celebrateBaby) => set({ celebrateBaby }),
    }),
    {
      name: 'grandma-journey-transitions',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ promptedTests: s.promptedTests, askKeepCycle: s.askKeepCycle }),
    },
  ),
)
