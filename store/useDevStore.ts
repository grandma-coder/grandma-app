/**
 * Dev Mode — transient flag set when the hidden dev panel launches a flow.
 *
 * When active:
 *   1. A banner is shown across all screens.
 *   2. Every onboarding `saveAndFinish()` short-circuits BEFORE any
 *      Supabase write (insert / upsert / storage upload). Use
 *      `isDevModeActive()` at the top of any side-effecting save path.
 *   3. On `exit()`, every store mutated during onboarding is restored to
 *      the snapshot taken at `enter()` time. This covers the ephemeral
 *      onboarding stores AND the persisted stores that onboarding writes
 *      to as a side effect (behavior, mode, child, pregnancy).
 *
 * Net effect: dev mode is a true dry-run. The user can click through
 * every onboarding flow and exit with zero state changes anywhere — DB
 * untouched, persisted stores untouched.
 */

import { create } from 'zustand'
import { useJourneyStore } from './useJourneyStore'
import { useOnboardingStore } from './useOnboardingStore'
import { useCycleOnboardingStore } from './useCycleOnboardingStore'
import { usePregnancyOnboardingStore } from './usePregnancyOnboardingStore'
import { useKidsOnboardingStore } from './useKidsOnboardingStore'
import { useBehaviorStore } from './useBehaviorStore'
import { useModeStore } from './useModeStore'
import { useChildStore } from './useChildStore'
import { usePregnancyStore } from './usePregnancyStore'

type Snapshot = {
  journey:    ReturnType<typeof useJourneyStore.getState>
  onboarding: ReturnType<typeof useOnboardingStore.getState>
  cycle:      ReturnType<typeof useCycleOnboardingStore.getState>
  pregnancy:  ReturnType<typeof usePregnancyOnboardingStore.getState>
  kids:       ReturnType<typeof useKidsOnboardingStore.getState>
  // Side-effect stores that onboarding flows write to on save.
  behavior:   ReturnType<typeof useBehaviorStore.getState>
  mode:       ReturnType<typeof useModeStore.getState>
  child:      ReturnType<typeof useChildStore.getState>
  pregnancyStore: ReturnType<typeof usePregnancyStore.getState>
}

interface DevStore {
  active: boolean
  snapshot: Snapshot | null
  enter: () => void
  exit: () => void
}

export const useDevStore = create<DevStore>((set, get) => ({
  active: false,
  snapshot: null,
  enter: () => {
    if (get().active) return
    const snapshot: Snapshot = {
      journey:        { ...useJourneyStore.getState() },
      onboarding:     { ...useOnboardingStore.getState() },
      cycle:          { ...useCycleOnboardingStore.getState() },
      pregnancy:      { ...usePregnancyOnboardingStore.getState() },
      kids:           { ...useKidsOnboardingStore.getState() },
      behavior:       { ...useBehaviorStore.getState() },
      mode:           { ...useModeStore.getState() },
      child:          { ...useChildStore.getState() },
      pregnancyStore: { ...usePregnancyStore.getState() },
    }
    set({ active: true, snapshot })
  },
  exit: () => {
    const snap = get().snapshot
    if (snap) {
      useJourneyStore.setState(snap.journey)
      useOnboardingStore.setState(snap.onboarding)
      useCycleOnboardingStore.setState(snap.cycle)
      usePregnancyOnboardingStore.setState(snap.pregnancy)
      useKidsOnboardingStore.setState(snap.kids)
      useBehaviorStore.setState(snap.behavior)
      useModeStore.setState(snap.mode)
      useChildStore.setState(snap.child)
      usePregnancyStore.setState(snap.pregnancyStore)
    }
    set({ active: false, snapshot: null })
  },
}))

/**
 * Read-only check usable in non-React code (saveAndFinish, etc).
 * Returns true when the dev-mode flag is currently set — callers should
 * skip any side-effecting write (Supabase, storage) when this is true.
 */
export function isDevModeActive(): boolean {
  return useDevStore.getState().active
}
