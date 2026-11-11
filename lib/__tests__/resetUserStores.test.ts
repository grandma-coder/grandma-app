// Sign-out used to clear only AsyncStorage keys; the in-memory stores kept the previous user's
// journeys, due date, consent and PIN lock, and the next write put them straight back on disk —
// so the next account on the same phone skipped onboarding and saw the old data.
import { resetUserStores } from '../resetUserStores'
import { useBehaviorStore } from '../../store/useBehaviorStore'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { useAppLockStore } from '../../store/useAppLockStore'
import { useConsentStore } from '../../store/useConsentStore'
import { useThemeStore } from '../../store/useThemeStore'
import { useMenopauseOnboardingStore } from '../../store/useMenopauseOnboardingStore'

describe('resetUserStores', () => {
  it('returns user-data stores to their initial state', () => {
    useBehaviorStore.setState({ enrolledBehaviors: ['kids'] as never, hydrated: true } as never)
    usePregnancyStore.setState({ dueDate: '2026-12-01' } as never)
    useAppLockStore.setState({ enabled: true } as never)
    useConsentStore.setState({ consentedAt: '2026-11-01T00:00:00Z' } as never)

    resetUserStores()

    expect(useBehaviorStore.getState().enrolledBehaviors).toEqual([])
    expect(usePregnancyStore.getState().dueDate).toBeNull()
    expect(useAppLockStore.getState().enabled).toBe(false)
    expect(useConsentStore.getState().consentedAt).toBeNull()
  })

  it('clears an unfinished menopause onboarding (stage, symptoms, HRT) like the other journeys', () => {
    useMenopauseOnboardingStore.setState({ stage: 'peri', symptoms: ['hot_flashes'], onHrt: true } as never)
    resetUserStores()
    expect(useMenopauseOnboardingStore.getState().stage).toBeNull()
    expect(useMenopauseOnboardingStore.getState().symptoms).toEqual([])
    expect(useMenopauseOnboardingStore.getState().onHrt).toBe(false)
  })

  it('keeps hydration flags so the route guard does not wait forever', () => {
    useBehaviorStore.setState({ hydrated: true } as never)
    resetUserStores()
    expect(useBehaviorStore.getState().hydrated).toBe(true)
  })

  it('leaves device preferences alone', () => {
    useThemeStore.setState({ theme: 'dark' } as never)
    resetUserStores()
    expect(useThemeStore.getState().theme).toBe('dark')
  })
})
