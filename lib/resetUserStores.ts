import { useAppLockStore } from '../store/useAppLockStore'
import { useAppointmentQuestionsStore } from '../store/useAppointmentQuestionsStore'
import { useBadgeStore } from '../store/useBadgeStore'
import { useBehaviorStore } from '../store/useBehaviorStore'
import { useCaregiverStore } from '../store/useCaregiverStore'
import { useChannelsStore } from '../store/useChannelsStore'
import { useChatStore } from '../store/useChatStore'
import { useChildStore } from '../store/useChildStore'
import { useConsentStore } from '../store/useConsentStore'
import { useCycleOnboardingStore } from '../store/useCycleOnboardingStore'
import { useCycleQuickLogStore } from '../store/useCycleQuickLogStore'
import { useCycleSettingsStore } from '../store/useCycleSettingsStore'
import { useEmergencyInsuranceStore } from '../store/useEmergencyInsuranceStore'
import { useFoodStore } from '../store/useFoodStore'
import { useGoalsStore } from '../store/useGoalsStore'
import { useGrandmaHistoryStore } from '../store/useGrandmaHistoryStore'
import { useJourneyStore } from '../store/useJourneyStore'
import { useJourneyTransitionStore } from '../store/useJourneyTransitionStore'
import { useKidsOnboardingStore } from '../store/useKidsOnboardingStore'
import { useKidsQuickLogStore } from '../store/useKidsQuickLogStore'
import { useMenopauseOnboardingStore } from '../store/useMenopauseOnboardingStore'
import { useMenopauseQuickLogStore } from '../store/useMenopauseQuickLogStore'
import { useMenopauseStore } from '../store/useMenopauseStore'
import { useModeStore } from '../store/useModeStore'
import { useOnboardingStore } from '../store/useOnboardingStore'
import { usePregnancyOnboardingStore } from '../store/usePregnancyOnboardingStore'
import { usePregnancyStore } from '../store/usePregnancyStore'
import { useQuickLogStore } from '../store/useQuickLogStore'
import { useRemindersStore } from '../store/useRemindersStore'
import { useUnlockStore } from '../store/useUnlockStore'
import { useVaultStore } from '../store/useVaultStore'
import { usePregnancyWalletStore, useCycleWalletStore, useKidsWalletStore, useMenopauseWalletStore } from '../store/useWalletStore'

/**
 * Every store that holds the signed-in user's data. Device preferences (theme, language, units,
 * agenda view, feature flags) are deliberately absent: they belong to the phone, not the account.
 * Add new user-data stores here, or they leak into the next account on the same device.
 */
const USER_STORES = [
  useAppLockStore, useAppointmentQuestionsStore, useBadgeStore, useBehaviorStore, useCaregiverStore,
  useChannelsStore, useChatStore, useChildStore, useConsentStore, useCycleOnboardingStore,
  useCycleQuickLogStore, useCycleSettingsStore, useEmergencyInsuranceStore, useFoodStore, useGoalsStore,
  useGrandmaHistoryStore, useJourneyStore, useJourneyTransitionStore, useKidsOnboardingStore, useKidsQuickLogStore,
  useMenopauseOnboardingStore, useMenopauseQuickLogStore, useMenopauseStore, useModeStore, useOnboardingStore,
  usePregnancyOnboardingStore, usePregnancyStore, useQuickLogStore, useRemindersStore, useUnlockStore, useVaultStore,
  usePregnancyWalletStore, useCycleWalletStore, useKidsWalletStore, useMenopauseWalletStore,
]

/** Same list, for callers that also need to wipe the persisted copies. */
export const USER_STORE_PERSIST: readonly unknown[] = USER_STORES

type ResettableStore = {
  getState: () => Record<string, unknown>
  getInitialState?: () => Record<string, unknown>
  setState: (s: Record<string, unknown>, replace: true) => void
}

/**
 * Put every user-data store back to its initial state IN MEMORY. Clearing only the persisted key
 * is not enough: the live state survives and the next write puts it straight back on disk. The
 * `hydrated` flag is kept — persisted stores only rehydrate once, and the route guard waits on it.
 */
export function resetUserStores(): void {
  for (const store of USER_STORES as unknown as ResettableStore[]) {
    const initial = store.getInitialState?.()
    if (!initial) continue
    const current = store.getState()
    const next = { ...initial }
    if ('hydrated' in current) next.hydrated = current.hydrated
    store.setState(next, true)
  }
}
