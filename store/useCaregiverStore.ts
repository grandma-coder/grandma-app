/**
 * Caregiver Store — coarse account-level persona.
 *
 * Holds the account's `user_role` (from profiles.user_role), promoted out of
 * the dead local state in app/_layout.tsx so the tab router can branch on it.
 * Per-child role lives in useChildStore.activeChild.caregiverRole — this store
 * carries only the account-level persona, not per-child data.
 *
 * Persisted + hydration-gated: the caregiver surface must wait on `hydrated`
 * before rendering, or it flashes the wrong persona on cold start (the
 * useModeStore "week 1 → week 40 flash" class). Follows the canonical
 * useBehaviorStore pattern, including the setState-form onRehydrateStorage
 * (state?.setHydrated() silently no-ops on a fresh install — the useBadgeStore bug).
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type AccountRole = string

interface CaregiverStore {
  /** profiles.user_role — 'parent' by default, 'nanny'/'family' for caregivers. */
  accountRole: AccountRole
  hydrated: boolean

  setAccountRole: (role: AccountRole) => void
  /** Reset to defaults — used on the sign-out path. */
  clear: () => void
}

const DEFAULT_ACCOUNT_ROLE: AccountRole = 'parent'

export const useCaregiverStore = create<CaregiverStore>()(
  persist(
    (set) => ({
      accountRole: DEFAULT_ACCOUNT_ROLE,
      hydrated: false,

      setAccountRole: (role) => set({ accountRole: role || DEFAULT_ACCOUNT_ROLE }),
      clear: () => set({ accountRole: DEFAULT_ACCOUNT_ROLE }),
    }),
    {
      name: 'grandma-caregiver',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ accountRole: state.accountRole }),
      // Flip via setState, not state?.setHydrated() — the latter no-ops when
      // there's nothing persisted (fresh install) and hangs the surface.
      onRehydrateStorage: () => () => {
        useCaregiverStore.setState({ hydrated: true })
      },
    }
  )
)
