/**
 * useMenopauseOnboardingStore — ephemeral (NON-persisted) answer buffer for the
 * direct Menopause onboarding flow. Mirrors useCycleOnboardingStore: it holds
 * the user's picks while they step through onboarding, is written to Supabase +
 * useMenopauseStore on finish, then `reset()` clears it. Nothing persists to
 * AsyncStorage — the durable state lives in useMenopauseStore + Supabase.
 */

import { create } from 'zustand'
import type { MenopauseStage } from '../lib/menopauseStage'
import type { MenopauseSymptomId } from '../lib/menopauseSymptoms'

interface MenopauseOnboardingStore {
  stage: MenopauseStage | null
  lastPeriodDate: string | null // ISO YYYY-MM-DD
  symptoms: MenopauseSymptomId[]
  onHrt: boolean
  setStage: (s: MenopauseStage) => void
  setLastPeriodDate: (iso: string | null) => void
  setSymptoms: (ids: MenopauseSymptomId[]) => void
  setOnHrt: (v: boolean) => void
  reset: () => void
}

export const useMenopauseOnboardingStore = create<MenopauseOnboardingStore>((set) => ({
  stage: null,
  lastPeriodDate: null,
  symptoms: [],
  onHrt: false,
  setStage: (stage) => set({ stage }),
  setLastPeriodDate: (lastPeriodDate) => set({ lastPeriodDate }),
  setSymptoms: (symptoms) => set({ symptoms }),
  setOnHrt: (onHrt) => set({ onHrt }),
  reset: () => set({ stage: null, lastPeriodDate: null, symptoms: [], onHrt: false }),
}))
