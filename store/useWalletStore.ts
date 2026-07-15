/**
 * useWalletStore — which cards each behavior's home wallet shows, and in what
 * order. Persisted on-device (AsyncStorage), per-device (not synced), following
 * the canonical hydrated-flag pattern so the wallet waits for rehydration before
 * rendering the chosen set.
 *
 * One store per behavior (pregnancy / cycle / kids), mirroring the per-behavior
 * quick-log stores — a user's pregnancy wallet picks must not bleed into kids
 * mode. `enabledKeys: null` means "not customized yet" → the wallet falls back to
 * its builder's default card set. Once the user edits, it becomes an explicit
 * ordered list of card ids (both contextual cards + shortcut ids from
 * lib/walletCatalog). Fully user-controlled: any card can be toggled.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface WalletState {
  /** Ordered enabled card ids, or null when the user hasn't customized yet. */
  enabledKeys: string[] | null
  hydrated: boolean
  setEnabled: (keys: string[]) => void
  toggle: (key: string) => void
  /** Clear customization → revert to the builder's default card set. */
  reset: () => void
  setHydrated: (hydrated: boolean) => void
}

function createWalletStore(persistKey: string) {
  return create<WalletState>()(
    persist(
      (set) => ({
        enabledKeys: null,
        hydrated: false,
        setEnabled: (keys) => set({ enabledKeys: keys }),
        toggle: (key) =>
          set((s) => {
            const base = s.enabledKeys ?? []
            return {
              enabledKeys: base.includes(key)
                ? base.filter((k) => k !== key)
                : [...base, key],
            }
          }),
        reset: () => set({ enabledKeys: null }),
        setHydrated: (hydrated) => set({ hydrated }),
      }),
      {
        name: persistKey,
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (s) => ({ enabledKeys: s.enabledKeys }),
        onRehydrateStorage: () => (state) => {
          state?.setHydrated(true)
        },
      },
    ),
  )
}

export const usePregnancyWalletStore = createWalletStore('grandma-wallet-pregnancy')
export const useCycleWalletStore = createWalletStore('grandma-wallet-cycle')
export const useKidsWalletStore = createWalletStore('grandma-wallet-kids')
