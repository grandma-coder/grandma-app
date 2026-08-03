/**
 * useMenopauseQuickLogStore — which quick-log signals the user pins on the
 * Menopause home. Persisted on-device (AsyncStorage) so it survives an app kill;
 * per-device (not synced). Follows the canonical hydrated-flag pattern so the
 * card waits for rehydration before rendering the chosen set. Mirrors the
 * parallel useQuickLogStore / useCycleQuickLogStore.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { MenopauseSymptomId } from '../lib/menopauseSymptoms'

// A broad default spread across every symptom group. User-customizable via the
// Edit picker; any of the 13 symptoms can be pinned.
export const DEFAULT_MENOPAUSE_QUICK_LOG_KEYS: MenopauseSymptomId[] = [
  'hot_flash', 'night_sweat', 'sleep', 'fatigue', 'low_mood', 'brain_fog', 'joint_pain', 'vaginal_dryness',
]

interface MenopauseQuickLogState {
  /** Ordered list of enabled symptom ids (see ALL_MENOPAUSE_SYMPTOMS). */
  enabledKeys: string[]
  hydrated: boolean
  setEnabled: (keys: string[]) => void
  toggle: (key: string) => void
  setHydrated: (hydrated: boolean) => void
}

export const useMenopauseQuickLogStore = create<MenopauseQuickLogState>()(
  persist(
    (set) => ({
      enabledKeys: DEFAULT_MENOPAUSE_QUICK_LOG_KEYS,
      hydrated: false,
      setEnabled: (keys) => set({ enabledKeys: keys }),
      toggle: (key) =>
        set((s) => ({
          enabledKeys: s.enabledKeys.includes(key)
            ? s.enabledKeys.filter((k) => k !== key)
            : [...s.enabledKeys, key],
        })),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'grandma-quick-logs-menopause',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ enabledKeys: s.enabledKeys }),
      onRehydrateStorage: () => () => {
        useMenopauseQuickLogStore.setState({ hydrated: true })
      },
    },
  ),
)
