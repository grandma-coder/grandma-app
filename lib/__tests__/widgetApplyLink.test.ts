import { applyWidgetLink } from '../widgets/applyLink'
import { useWidgetIntentStore } from '../../store/useWidgetIntentStore'
import { useBehaviorStore } from '../../store/useBehaviorStore'
import { useModeStore } from '../../store/useModeStore'
import { useChildStore } from '../../store/useChildStore'

const kid = (id: string) => ({ id }) as never

beforeEach(() => {
  useWidgetIntentStore.setState({ pending: null })
  useChildStore.setState({ children: [], activeChild: null })
})

describe('applyWidgetLink', () => {
  it('switches mode, behavior and child, and leaves the intent', () => {
    useBehaviorStore.setState({ enrolledBehaviors: ['kids', 'pregnancy'], currentBehavior: 'pregnancy' })
    useModeStore.setState({ mode: 'pregnancy' })
    useChildStore.setState({ children: [kid('c1'), kid('c2')], activeChild: kid('c1') })
    expect(applyWidgetLink({ journey: 'kids', mode: 'kids', type: 'feeding', childId: 'c2' })).toBe('journey')
    expect(useModeStore.getState().mode).toBe('kids')
    expect(useBehaviorStore.getState().currentBehavior).toBe('kids')
    expect(useChildStore.getState().activeChild?.id).toBe('c2')
    expect(useWidgetIntentStore.getState().take('kids')).toBe('feeding')
    expect(useWidgetIntentStore.getState().take('kids')).toBeNull()
  })
  it('journey not enrolled → home, nothing changed', () => {
    useBehaviorStore.setState({ enrolledBehaviors: ['kids'], currentBehavior: 'kids' })
    useModeStore.setState({ mode: 'kids' })
    expect(applyWidgetLink({ journey: 'menopause', mode: 'menopause', type: 'hot_flash', childId: null })).toBe('home')
    expect(useModeStore.getState().mode).toBe('kids')
    expect(useWidgetIntentStore.getState().pending).toBeNull()
  })
  it('unknown child keeps the current child, opens kids, but no sheet (would log on the wrong child)', () => {
    useBehaviorStore.setState({ enrolledBehaviors: ['kids'], currentBehavior: 'kids' })
    useChildStore.setState({ children: [kid('c1')], activeChild: kid('c1') })
    expect(applyWidgetLink({ journey: 'kids', mode: 'kids', type: 'feeding', childId: 'gone' })).toBe('journey')
    expect(useChildStore.getState().activeChild?.id).toBe('c1')
    expect(useWidgetIntentStore.getState().pending).toBeNull()
  })
  it('view-only caregiver child: switches to the child but opens no log sheet', () => {
    useBehaviorStore.setState({ enrolledBehaviors: ['kids'], currentBehavior: 'kids' })
    const viewer = { id: 'c3', caregiverRole: 'family', permissions: { view: true, log_activity: false } } as never
    useChildStore.setState({ children: [kid('c1'), viewer], activeChild: kid('c1') })
    expect(applyWidgetLink({ journey: 'kids', mode: 'kids', type: 'feeding', childId: 'c3' })).toBe('journey')
    expect(useChildStore.getState().activeChild?.id).toBe('c3')
    expect(useWidgetIntentStore.getState().pending).toBeNull()
  })
  it('caregiver child with log_activity still opens the sheet', () => {
    useBehaviorStore.setState({ enrolledBehaviors: ['kids'], currentBehavior: 'kids' })
    const nanny = { id: 'c4', caregiverRole: 'nanny', permissions: { view: true, log_activity: true } } as never
    useChildStore.setState({ children: [nanny], activeChild: nanny })
    applyWidgetLink({ journey: 'kids', mode: 'kids', type: 'sleep', childId: 'c4' })
    expect(useWidgetIntentStore.getState().take('kids')).toBe('sleep')
  })
  it('home link sets no intent', () => {
    useBehaviorStore.setState({ enrolledBehaviors: ['pregnancy'], currentBehavior: 'pregnancy' })
    applyWidgetLink({ journey: 'pregnancy', mode: 'pregnancy', type: null, childId: null })
    expect(useWidgetIntentStore.getState().pending).toBeNull()
  })
  it('take() ignores another journey', () => {
    useWidgetIntentStore.getState().set({ journey: 'cycle', type: 'mood' })
    expect(useWidgetIntentStore.getState().take('kids')).toBeNull()
    expect(useWidgetIntentStore.getState().take('cycle')).toBe('mood')
  })
})

describe('widget intent store', () => {
  it('clear(id) only clears the matching request', () => {
    useWidgetIntentStore.getState().set({ journey: 'kids', type: 'sleep' })
    const id = useWidgetIntentStore.getState().pending!.id
    useWidgetIntentStore.getState().clear(id + 1)
    expect(useWidgetIntentStore.getState().pending?.type).toBe('sleep')
    useWidgetIntentStore.getState().clear(id)
    expect(useWidgetIntentStore.getState().pending).toBeNull()
  })
  it('each request gets a new id', () => {
    useWidgetIntentStore.getState().set({ journey: 'kids', type: 'sleep' })
    const a = useWidgetIntentStore.getState().pending!.id
    useWidgetIntentStore.getState().set({ journey: 'kids', type: 'sleep' })
    expect(useWidgetIntentStore.getState().pending!.id).not.toBe(a)
  })
})
