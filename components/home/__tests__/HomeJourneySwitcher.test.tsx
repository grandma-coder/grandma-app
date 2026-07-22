import { render, fireEvent } from '@testing-library/react-native'
import { HomeJourneySwitcher } from '../HomeJourneySwitcher'
import { useBehaviorStore } from '../../../store/useBehaviorStore'
import { useModeStore } from '../../../store/useModeStore'
import { useChildStore } from '../../../store/useChildStore'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }))

function seed({
  enrolled = ['pre-pregnancy', 'pregnancy'],
  current = 'pre-pregnancy',
  caregiverRole,
  cycleIntent = 'tracking',
}: { enrolled?: string[]; current?: string | null; caregiverRole?: string; cycleIntent?: string } = {}) {
  useBehaviorStore.setState({ enrolledBehaviors: enrolled as never, currentBehavior: current as never })
  useModeStore.setState({ mode: (current ?? 'kids') as never, cycleIntent: cycleIntent as never })
  useChildStore.setState({ activeChild: caregiverRole ? ({ id: 'c1', caregiverRole } as never) : null })
}

afterEach(() => {
  mockPush.mockClear()
  useBehaviorStore.setState({ enrolledBehaviors: [], currentBehavior: null })
  useModeStore.setState({ mode: 'kids', cycleIntent: 'tracking' })
  useChildStore.setState({ activeChild: null, children: [] })
})

describe('HomeJourneySwitcher', () => {
  it('renders a trigger labelled with the active journey', () => {
    seed({ current: 'pre-pregnancy' })
    const { queryByLabelText } = render(<HomeJourneySwitcher />)
    expect(queryByLabelText(/Switch journey, currently Cycle/)).toBeTruthy()
  })

  it('labels the pre-pregnancy journey "Dreaming" when cycleIntent is ttc', () => {
    seed({ current: 'pre-pregnancy', cycleIntent: 'ttc' })
    const { queryByLabelText } = render(<HomeJourneySwitcher />)
    expect(queryByLabelText(/Switch journey, currently Dreaming/)).toBeTruthy()
  })

  it('renders null in a caregiver context', () => {
    seed({ caregiverRole: 'nanny' })
    const { queryByLabelText } = render(<HomeJourneySwitcher />)
    expect(queryByLabelText(/Switch journey/)).toBeNull()
  })

  it('opens a dropdown listing all three journeys', () => {
    seed()
    const { getByLabelText, queryByText } = render(<HomeJourneySwitcher />)
    fireEvent.press(getByLabelText(/Switch journey/))
    expect(queryByText('Cycle')).toBeTruthy()
    expect(queryByText('Expecting')).toBeTruthy()
    expect(queryByText('Raising')).toBeTruthy()
  })

  it('switches behavior + mode when tapping an enrolled journey', () => {
    seed({ enrolled: ['pre-pregnancy', 'pregnancy'], current: 'pre-pregnancy' })
    const { getByLabelText } = render(<HomeJourneySwitcher />)
    fireEvent.press(getByLabelText(/Switch journey/))
    fireEvent.press(getByLabelText('Switch to Expecting'))
    expect(useBehaviorStore.getState().currentBehavior).toBe('pregnancy')
    expect(useModeStore.getState().mode).toBe('pregnancy')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('routes to onboarding when tapping a not-enrolled journey', () => {
    seed({ enrolled: ['pre-pregnancy'], current: 'pre-pregnancy' })
    const { getByLabelText } = render(<HomeJourneySwitcher />)
    fireEvent.press(getByLabelText(/Switch journey/))
    fireEvent.press(getByLabelText('Start Raising journey'))
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/onboarding/journey',
      params: { addMode: 'true', preselect: 'kids' },
    })
    expect(useBehaviorStore.getState().currentBehavior).toBe('pre-pregnancy')
  })
})
