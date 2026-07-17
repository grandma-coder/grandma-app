import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Records the user's explicit consent to health-data processing + privacy
// policy (Phase 1 / trust & safety). Persisted locally so the onboarding gate
// isn't re-shown after an app kill; the acceptance timestamp is ALSO written to
// profiles.consented_at at onboarding save for a server-side record.
interface ConsentStore {
  consentedAt: string | null // ISO timestamp of acceptance, null = not yet
  hydrated: boolean
  accept: () => void
  clear: () => void
  setHydrated: (v: boolean) => void
}

export const useConsentStore = create<ConsentStore>()(
  persist(
    (set) => ({
      consentedAt: null,
      hydrated: false,
      accept: () => set({ consentedAt: new Date().toISOString() }),
      clear: () => set({ consentedAt: null }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'grandma-consent',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ consentedAt: state.consentedAt }),
      // See useBehaviorStore — flip hydrated even with nothing persisted so the
      // gate reads real state on first render, not a flash.
      onRehydrateStorage: () => () => {
        useConsentStore.setState({ hydrated: true })
      },
    }
  )
)
