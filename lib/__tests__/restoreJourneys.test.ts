import { restoreJourneys } from '../restoreJourneys'
import { useBehaviorStore } from '../../store/useBehaviorStore'
import { useModeStore } from '../../store/useModeStore'

// After signing in on a fresh install (or after sign-out), the home screen reads
// useModeStore.mode and the journey switcher reads useBehaviorStore.currentBehavior.
// They must name the same journey — the demo account landed on Kids home with the
// switcher ticking Pregnancy.
beforeEach(() => {
  useBehaviorStore.setState({ enrolledBehaviors: [], currentBehavior: null } as never)
  useModeStore.setState({ mode: 'kids' } as never)
})

test('fresh sign-in with several journeys: home and switcher agree', () => {
  restoreJourneys(['pregnancy', 'kids', 'pre-pregnancy', 'menopause'])
  expect(useBehaviorStore.getState().currentBehavior).toBe(useModeStore.getState().mode)
})

test('mode not enrolled is coerced, and the switcher follows', () => {
  restoreJourneys(['menopause'])
  expect(useModeStore.getState().mode).toBe('menopause')
  expect(useBehaviorStore.getState().currentBehavior).toBe('menopause')
})

test('local enrollment wins over the server list', () => {
  useBehaviorStore.setState({ enrolledBehaviors: ['pregnancy'], currentBehavior: 'pregnancy' } as never)
  useModeStore.setState({ mode: 'pregnancy' } as never)
  restoreJourneys(['kids'])
  expect(useBehaviorStore.getState().enrolledBehaviors).toEqual(['pregnancy'])
  expect(useModeStore.getState().mode).toBe('pregnancy')
  expect(useBehaviorStore.getState().currentBehavior).toBe('pregnancy')
})
