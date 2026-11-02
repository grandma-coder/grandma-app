import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * App-level feature flags. Local ones are toggled from the Dev Panel and persisted.
 * Remote ones (`grandmaChat`, `dailyRewards`) come from public.feature_flags via lib/remoteFlags.ts,
 * are never persisted, and start OFF — the app fails closed until the server says on.
 */
interface FeatureFlagsState {
  /** Master gate for the granular caregiver access editor in Care Circle. */
  granularCaregiverAccess: boolean
  /** Remote: "Talk to Grandma" AI chat. Off = every entry point hidden. */
  grandmaChat: boolean
  /** Remote: Daily Rewards (points, streaks, badges, leaderboard). Off = every entry point hidden. */
  dailyRewards: boolean
  hydrated: boolean
  setGranularCaregiverAccess: (v: boolean) => void
  setRemoteFlags: (flags: { grandmaChat: boolean; dailyRewards: boolean }) => void
  setHydrated: (v: boolean) => void
}

export const useFeatureFlags = create<FeatureFlagsState>()(
  persist(
    (set) => ({
      granularCaregiverAccess: false,
      grandmaChat: false,
      dailyRewards: false,
      hydrated: false,
      setGranularCaregiverAccess: (v) => set({ granularCaregiverAccess: v }),
      setRemoteFlags: (flags) => set(flags),
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

/** True only when the server has switched the Grandma chat on. */
export const useGrandmaChatEnabled = () => useFeatureFlags((s) => s.grandmaChat)

/** True only when the server has switched Daily Rewards on. */
export const useDailyRewardsEnabled = () => useFeatureFlags((s) => s.dailyRewards)
