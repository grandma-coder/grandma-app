import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// App-lock config (Phase 1 / WS2d). Only NON-SECRET config lives here — the PIN
// hash + salt live in expo-secure-store (see lib/appLock.ts), never in this
// persisted store. `locked` is ephemeral session state (true = the lock screen
// should be showing); it is not persisted.
interface AppLockStore {
  enabled: boolean          // is app-lock turned on?
  biometricEnabled: boolean // use Face ID / fingerprint when available?
  locked: boolean           // ephemeral — is the app currently gated?
  hydrated: boolean

  setEnabled: (v: boolean) => void
  setBiometricEnabled: (v: boolean) => void
  lock: () => void
  unlock: () => void
  setHydrated: (v: boolean) => void
}

export const useAppLockStore = create<AppLockStore>()(
  persist(
    (set) => ({
      enabled: false,
      biometricEnabled: true,
      locked: false,
      hydrated: false,

      setEnabled: (enabled) => set({ enabled }),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
      lock: () => set({ locked: true }),
      unlock: () => set({ locked: false }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'grandma-app-lock',
      storage: createJSONStorage(() => AsyncStorage),
      // `locked` is session-only; never persist it or the app would open locked
      // with no way to know if the PIN even exists yet.
      partialize: (s) => ({ enabled: s.enabled, biometricEnabled: s.biometricEnabled }),
      onRehydrateStorage: () => (state) => {
        // If lock is enabled, start the session locked so foreground → PIN.
        useAppLockStore.setState({ hydrated: true, locked: state?.enabled ?? false })
      },
    }
  )
)
