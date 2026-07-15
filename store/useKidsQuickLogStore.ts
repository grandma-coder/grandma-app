/**
 * useKidsQuickLogStore — which quick-log chips the user wants on the kids home
 * "Today at a glance" card. Persisted on-device (AsyncStorage) so it survives an
 * app kill; per-device (not synced). Follows the canonical hydrated-flag pattern
 * so the card waits for rehydration before rendering the chosen set. Kept
 * separate from the pregnancy/cycle quick-log stores because the chip catalogs
 * differ (see the parallel useQuickLogStore / useCycleQuickLogStore).
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DEFAULT_KIDS_QUICK_LOG_KEYS } from '../lib/kidsQuickLogs'

interface KidsQuickLogState {
  /** Ordered list of enabled chip keys (see KIDS_QUICK_LOGS). */
  enabledKeys: string[]
  hydrated: boolean
  setEnabled: (keys: string[]) => void
  toggle: (key: string) => void
  setHydrated: (hydrated: boolean) => void
}

export const useKidsQuickLogStore = create<KidsQuickLogState>()(
  persist(
    (set) => ({
      enabledKeys: DEFAULT_KIDS_QUICK_LOG_KEYS,
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
      name: 'grandma-kids-quick-logs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ enabledKeys: s.enabledKeys }),
      onRehydrateStorage: () => () => {
        useKidsQuickLogStore.setState({ hydrated: true })
      },
    },
  ),
)
