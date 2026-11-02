import { isModeReady, otherReadyMode } from '../modeReadiness'
import { useChildStore } from '../../store/useChildStore'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { useMenopauseStore } from '../../store/useMenopauseStore'
import { useBehaviorStore } from '../../store/useBehaviorStore'

beforeEach(() => {
  useChildStore.setState({ children: [], activeChild: null })
  usePregnancyStore.setState({ dueDate: null })
  useMenopauseStore.setState({ stage: null })
  useBehaviorStore.setState({ enrolledBehaviors: [] })
})

describe('mode readiness — a journey never opens without its onboarding data', () => {
  it('kids needs at least one child', () => {
    expect(isModeReady('kids')).toBe(false)
    useChildStore.setState({ children: [{ id: 'c1' } as never] })
    expect(isModeReady('kids')).toBe(true)
  })

  it('pregnancy needs a due date, menopause needs a stage', () => {
    expect(isModeReady('pregnancy')).toBe(false)
    expect(isModeReady('menopause')).toBe(false)
    usePregnancyStore.setState({ dueDate: '2027-01-01' })
    useMenopauseStore.setState({ stage: 'peri' as never })
    expect(isModeReady('pregnancy')).toBe(true)
    expect(isModeReady('menopause')).toBe(true)
  })

  it('cycle is always ready (all its onboarding steps are optional)', () => {
    expect(isModeReady('pre-pregnancy')).toBe(true)
  })

  it('a required onboarding can only escape to another ready journey', () => {
    useBehaviorStore.setState({ enrolledBehaviors: ['kids', 'pregnancy'] })
    expect(otherReadyMode('kids')).toBeNull()
    usePregnancyStore.setState({ dueDate: '2027-01-01' })
    expect(otherReadyMode('kids')).toBe('pregnancy')
  })
})
