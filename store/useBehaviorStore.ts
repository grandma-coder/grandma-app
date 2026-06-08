/**
 * Behavior Store — simple multi-enrollment, single active mode.
 *
 * One active behavior at a time. All enrolled behavior data persists.
 * Switch behaviors from Profile in one tap — like switching Instagram accounts.
 * Grandma Talk always has access to all enrolled behavior data.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type Behavior = 'pre-pregnancy' | 'pregnancy' | 'kids'

/**
 * The `behaviors` table CHECK constraint stores pre-pregnancy as `'cycle'`,
 * while the whole app uses the `'pre-pregnancy'` Behavior literal. This single
 * constant couples the write (onboarding/cycle) and the read-remap (_layout)
 * so the two can never silently drift. If you change one, TypeScript points you
 * at the other. Long-term: migrate the DB constraint to `'pre-pregnancy'`.
 */
export const PRE_PREG_DB_TYPE = 'cycle' as const

/** Map a raw `behaviors.type` row value to the app Behavior literal. */
export function behaviorFromDbType(dbType: string): Behavior {
  return dbType === PRE_PREG_DB_TYPE ? 'pre-pregnancy' : (dbType as Behavior)
}

interface BehaviorStore {
  /** All behaviors the user has set up. Data always persists. */
  enrolledBehaviors: Behavior[]
  /** The one active behavior the app is currently showing. */
  currentBehavior: Behavior | null
  hydrated: boolean

  enroll: (b: Behavior) => void
  unenroll: (b: Behavior) => void
  switchTo: (b: Behavior) => void
  isEnrolled: (b: Behavior) => boolean
  /** Legacy compat for journey onboarding toggle */
  toggleBehavior: (b: Behavior) => void
  setBehaviors: (behaviors: Behavior[]) => void
  setHydrated: (hydrated: boolean) => void
}

export const useBehaviorStore = create<BehaviorStore>()(
  persist(
    (set, get) => ({
      enrolledBehaviors: [],
      currentBehavior: null,
      hydrated: false,

      enroll: (b) => {
        const current = get().enrolledBehaviors
        if (current.includes(b)) return
        set({
          enrolledBehaviors: [...current, b],
          currentBehavior: get().currentBehavior ?? b,
        })
      },

      unenroll: (b) => {
        const updated = get().enrolledBehaviors.filter((x) => x !== b)
        const cur = get().currentBehavior
        set({
          enrolledBehaviors: updated,
          currentBehavior: cur === b ? (updated[0] ?? null) : cur,
        })
      },

      switchTo: (b) => {
        if (get().enrolledBehaviors.includes(b)) {
          set({ currentBehavior: b })
        }
      },

      isEnrolled: (b) => get().enrolledBehaviors.includes(b),

      // Legacy compat — used by journey onboarding screen
      toggleBehavior: (b) => {
        const current = get().enrolledBehaviors
        const exists = current.includes(b)
        set({
          enrolledBehaviors: exists
            ? current.filter((x) => x !== b)
            : [...current, b],
        })
      },

      setBehaviors: (behaviors) => set({
        enrolledBehaviors: behaviors,
        currentBehavior: get().currentBehavior ?? behaviors[0] ?? null,
      }),

      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'grandma-behaviors',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        enrolledBehaviors: state.enrolledBehaviors,
        currentBehavior: state.currentBehavior,
      }),
      // The rehydration callback runs after AsyncStorage finishes reading.
      // `state` is undefined when there's nothing persisted yet (fresh
      // install or cleared storage). Using `state?.setHydrated(true)` in
      // that case silently no-ops and the app hangs on the loading screen
      // forever. Flip the flag via setState so it always fires, even when
      // there was no state to rehydrate from.
      onRehydrateStorage: () => () => {
        useBehaviorStore.setState({ hydrated: true })
      },
    }
  )
)
