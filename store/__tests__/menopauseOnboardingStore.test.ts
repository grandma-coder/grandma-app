import { useMenopauseOnboardingStore } from '../useMenopauseOnboardingStore'

describe('useMenopauseOnboardingStore', () => {
  beforeEach(() => useMenopauseOnboardingStore.getState().reset())
  it('collects onboarding answers and resets clean', () => {
    const s = useMenopauseOnboardingStore.getState()
    s.setStage('peri'); s.setLastPeriodDate('2026-06-01'); s.setSymptoms(['hot_flash', 'sleep']); s.setOnHrt(true)
    const after = useMenopauseOnboardingStore.getState()
    expect(after.stage).toBe('peri')
    expect(after.symptoms).toEqual(['hot_flash', 'sleep'])
    expect(after.onHrt).toBe(true)
    after.reset()
    expect(useMenopauseOnboardingStore.getState().stage).toBeNull()
  })
})
