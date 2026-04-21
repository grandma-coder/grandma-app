/**
 * Dev Mode — transient flag set when the hidden dev panel launches a flow.
 *
 * When active, a banner is shown across all screens. On exit, the onboarding
 * stores are restored to the snapshot taken at enter() time — this lets you
 * run through onboarding and other flows without polluting real state.
 *
 * NOTE: snapshot/restore only applies to Zustand onboarding stores.
 * Supabase DB writes during the tested flow are NOT rolled back — the
 * banner copy makes this clear.
 */

import { create } from 'zustand'
import { useJourneyStore } from './useJourneyStore'
import { useOnboardingStore } from './useOnboardingStore'
import { useCycleOnboardingStore } from './useCycleOnboardingStore'
import { usePregnancyOnboardingStore } from './usePregnancyOnboardingStore'
import { useKidsOnboardingStore } from './useKidsOnboardingStore'

type Snapshot = {
  journey: ReturnType<typeof useJourneyStore.getState>
  onboarding: ReturnType<typeof useOnboardingStore.getState>
  cycle: ReturnType<typeof useCycleOnboardingStore.getState>
  pregnancy: ReturnType<typeof usePregnancyOnboardingStore.getState>
  kids: ReturnType<typeof useKidsOnboardingStore.getState>
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
      journey:    { ...useJourneyStore.getState() },
      onboarding: { ...useOnboardingStore.getState() },
      cycle:      { ...useCycleOnboardingStore.getState() },
      pregnancy:  { ...usePregnancyOnboardingStore.getState() },
      kids:       { ...useKidsOnboardingStore.getState() },
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
    }
    set({ active: false, snapshot: null })
  },
}))
