/**
 * useQuickLogStore — which quick-log chips the user wants on the pregnancy home
 * "Log something" card. Persisted on-device (AsyncStorage) so it survives an app
 * kill; per-device (not synced). Follows the canonical hydrated-flag pattern so
 * the card waits for rehydration before rendering the chosen set.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DEFAULT_QUICK_LOG_KEYS } from '../lib/pregnancyQuickLogs'

interface QuickLogState {
  /** Ordered list of enabled chip keys (see PREG_QUICK_LOGS). */
  enabledKeys: string[]
  hydrated: boolean
  setEnabled: (keys: string[]) => void
  toggle: (key: string) => void
  setHydrated: (hydrated: boolean) => void
}

export const useQuickLogStore = create<QuickLogState>()(
  persist(
    (set) => ({
      enabledKeys: DEFAULT_QUICK_LOG_KEYS,
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
      name: 'grandma-quick-logs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ enabledKeys: s.enabledKeys }),
      onRehydrateStorage: () => () => {
        useQuickLogStore.setState({ hydrated: true })
      },
    },
  ),
)
