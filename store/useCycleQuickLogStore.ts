/**
 * useCycleQuickLogStore — which quick-log chips the user wants on the cycle
 * (pre-pregnancy) home "Log something" card. Persisted on-device (AsyncStorage)
 * so it survives an app kill; per-device (not synced). Follows the canonical
 * hydrated-flag pattern so the card waits for rehydration before rendering the
 * chosen set. Kept separate from the pregnancy useQuickLogStore because the
 * chip catalogs differ.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DEFAULT_CYCLE_QUICK_LOG_KEYS } from '../lib/cycleQuickLogs'

interface CycleQuickLogState {
  /** Ordered list of enabled chip keys (see CYCLE_QUICK_LOGS). */
  enabledKeys: string[]
  hydrated: boolean
  setEnabled: (keys: string[]) => void
  toggle: (key: string) => void
  setHydrated: (hydrated: boolean) => void
}

export const useCycleQuickLogStore = create<CycleQuickLogState>()(
  persist(
    (set) => ({
      enabledKeys: DEFAULT_CYCLE_QUICK_LOG_KEYS,
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
      name: 'grandma-cycle-quick-logs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ enabledKeys: s.enabledKeys }),
      onRehydrateStorage: () => () => {
        useCycleQuickLogStore.setState({ hydrated: true })
      },
    },
  ),
)
