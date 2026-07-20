import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * App-level feature flags. Toggled from the Dev Panel; persisted so a flip
 * survives an app kill. Ships OFF so new surfaces land dark and get turned on
 * without a rebuild. No remote config exists yet — this store is the single
 * swap point if one is added later.
 */
interface FeatureFlagsState {
  /** Master gate for the granular caregiver access editor in Care Circle. */
  granularCaregiverAccess: boolean
  hydrated: boolean
  setGranularCaregiverAccess: (v: boolean) => void
  setHydrated: (v: boolean) => void
}

export const useFeatureFlags = create<FeatureFlagsState>()(
  persist(
    (set) => ({
      granularCaregiverAccess: false,
      hydrated: false,
      setGranularCaregiverAccess: (v) => set({ granularCaregiverAccess: v }),
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: 'grandma-feature-flags',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ granularCaregiverAccess: state.granularCaregiverAccess }),
      // Flip hydrated even when nothing was persisted (see useThemeStore).
      onRehydrateStorage: () => () => {
        useFeatureFlags.setState({ hydrated: true })
      },
    },
  ),
)
