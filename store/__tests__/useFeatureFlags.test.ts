import { useFeatureFlags } from '../useFeatureFlags'

describe('useFeatureFlags', () => {
  beforeEach(() => {
    useFeatureFlags.setState({ granularCaregiverAccess: false })
  })

  it('defaults granularCaregiverAccess to false', () => {
    expect(useFeatureFlags.getState().granularCaregiverAccess).toBe(false)
  })

  it('setGranularCaregiverAccess flips the flag', () => {
    useFeatureFlags.getState().setGranularCaregiverAccess(true)
    expect(useFeatureFlags.getState().granularCaregiverAccess).toBe(true)
  })
})
