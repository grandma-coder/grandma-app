/**
 * usePushPromptStore — the end-of-onboarding "turn on notifications?" sheet.
 *
 *   pending      — set when a journey onboarding finishes; the sheet (mounted in the tab layout)
 *                  picks it up on the home and clears it. In memory only.
 *   snoozedUntil — "Not now" keeps the sheet away until this time (ms). Persisted on the device
 *                  (a phone preference, like units — not reset with the account's stores).
 *
 * See lib/pushPrePrompt for when the sheet may show.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { pushPrePromptSnoozedUntil } from '../lib/pushPrePrompt'

interface PushPromptState {
  pending: boolean
  snoozedUntil: number | null
  request: () => void
  clear: () => void
  snooze: (now?: number) => void
}

export const usePushPromptStore = create<PushPromptState>()(
  persist(
    (set) => ({
      pending: false,
      snoozedUntil: null,
      request: () => set({ pending: true }),
      clear: () => set({ pending: false }),
      snooze: (now = Date.now()) => set({ pending: false, snoozedUntil: pushPrePromptSnoozedUntil(now) }),
    }),
    {
      name: 'grandma-push-preprompt',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ snoozedUntil: s.snoozedUntil }),
    },
  ),
)
