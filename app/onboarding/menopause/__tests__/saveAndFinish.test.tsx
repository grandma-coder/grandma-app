/**
 * Menopause onboarding — finish-handler (`saveAndFinish`) regression tests.
 *
 * Drives the real flow to its completion screen and presses the finish CTA,
 * mocking only the external boundaries (expo-router + lib/supabase) — the same
 * shape as components/home/__tests__/HomeJourneySwitcher.test.tsx. Guards the
 * U6 review fixes:
 *   • P0  — profiles write is an UPSERT (never .update(), which loses data for
 *           a menopause-first user with no profiles row yet).
 *   • P1-1 — completion goes through the shared useOnboardingComplete contract
 *           (advances the persisted queue) rather than a hardcoded replace.
 *   • P1-2 — dev-mode short-circuits BEFORE any DB write / durable-store write.
 */

import { render, fireEvent, waitFor, act } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import MenopauseOnboarding from '../index'
import { useMenopauseOnboardingStore } from '../../../../store/useMenopauseOnboardingStore'
import { useMenopauseStore } from '../../../../store/useMenopauseStore'
import { useBehaviorStore } from '../../../../store/useBehaviorStore'
import { useModeStore } from '../../../../store/useModeStore'
import { useOnboardingStore } from '../../../../store/useOnboardingStore'
import { useThemeStore } from '../../../../store/useThemeStore'
import { useDevStore } from '../../../../store/useDevStore'
import { useMenopauseQuickLogStore, DEFAULT_MENOPAUSE_QUICK_LOG_KEYS } from '../../../../store/useMenopauseQuickLogStore'
import { supabase } from '../../../../lib/supabase'
import { router } from 'expo-router'

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({}),
}))

jest.mock('../../../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    from: jest.fn(),
  },
}))

const mockedSupabase = supabase as unknown as {
  auth: { getSession: jest.Mock }
  from: jest.Mock
}
const mockedRouter = router as unknown as { push: jest.Mock; replace: jest.Mock; back: jest.Mock }

// Synchronous safe-area metrics so useSafeAreaInsets() resolves under the test
// renderer (no async SafeAreaView measurement).
const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
}

// Per-table query-builder spies, re-created each test so call assertions are clean.
let profilesUpsert: jest.Mock
let profilesUpdate: jest.Mock
let behaviorsUpsert: jest.Mock

function seedSupabaseSession() {
  mockedSupabase.auth.getSession.mockResolvedValue({
    data: { session: { user: { id: 'user-1' } } },
  })
  profilesUpsert = jest.fn().mockResolvedValue({ error: null })
  profilesUpdate = jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) }))
  behaviorsUpsert = jest.fn().mockResolvedValue({ error: null })
  mockedSupabase.from.mockImplementation((table: string) => {
    if (table === 'profiles') return { upsert: profilesUpsert, update: profilesUpdate }
    if (table === 'behaviors') return { upsert: behaviorsUpsert }
    return { upsert: jest.fn().mockResolvedValue({ error: null }) }
  })
}

/** Renders the flow and advances it to the completion screen, returning the RTL api. */
async function renderToComplete() {
  // 'post' stage → the flow skips the last-period step (and its DatePickerField),
  // leaving intro → stage → symptoms → hrt → complete.
  useMenopauseOnboardingStore.setState({ stage: 'post', symptoms: ['hot_flash'], onHrt: true, lastPeriodDate: null })
  const api = render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <MenopauseOnboarding />
    </SafeAreaProvider>,
  )
  // intro CTA, then Continue for stage / symptoms / hrt.
  await act(async () => { fireEvent.press(api.getByText('Begin')) })
  await act(async () => { fireEvent.press(api.getByText('Continue')) })
  await act(async () => { fireEvent.press(api.getByText('Continue')) })
  await act(async () => { fireEvent.press(api.getByText('Continue')) })
  return api
}

beforeEach(() => {
  jest.clearAllMocks()
  // Force the simpler current (cream) variant so OnboardingStep renders the
  // filled PillButton CTA whose label we query by text.
  useThemeStore.setState({ variant: 'current', theme: 'light', hydrated: true })
  useDevStore.setState({ active: false, snapshot: null })
  useMenopauseOnboardingStore.getState().reset()
  useMenopauseStore.setState({ stage: null, lastPeriodDate: null, onHrt: null, hydrated: true })
  useMenopauseQuickLogStore.setState({ enabledKeys: DEFAULT_MENOPAUSE_QUICK_LOG_KEYS, hydrated: true })
  useBehaviorStore.setState({ enrolledBehaviors: [], currentBehavior: null })
  useModeStore.setState({ mode: 'kids' as never })
  useOnboardingStore.getState().buildQueue(['menopause'])
  seedSupabaseSession()
})

describe('menopause saveAndFinish', () => {
  it('P0: upserts the profiles row (never .update) with stage + last period', async () => {
    const { getByText } = await renderToComplete()

    await act(async () => { fireEvent.press(getByText('Enter my space')) })
    await waitFor(() => expect(profilesUpsert).toHaveBeenCalled())

    // Upsert, not update — the whole point of the P0 fix.
    expect(profilesUpdate).not.toHaveBeenCalled()
    const [payload, opts] = profilesUpsert.mock.calls[0]
    expect(payload).toMatchObject({
      id: 'user-1',
      journey_mode: 'menopause',
      menopause_stage: 'post',
      last_period_date: null,
    })
    expect(opts).toEqual({ onConflict: 'id' })
    expect(behaviorsUpsert).toHaveBeenCalled()
  })

  it('P1-1: enrolls + advances via the shared onboarding-complete contract', async () => {
    const { getByText } = await renderToComplete()

    await act(async () => { fireEvent.press(getByText('Enter my space')) })
    await waitFor(() => expect(mockedRouter.replace).toHaveBeenCalledWith('/(tabs)'))

    // Durable state written, ephemeral buffer reset, queue drained by the hook.
    expect(useBehaviorStore.getState().enrolledBehaviors).toContain('menopause')
    expect(useMenopauseStore.getState().stage).toBe('post')
    expect(useModeStore.getState().mode).toBe('menopause')
    expect(useOnboardingStore.getState().currentOnboarding).toBeNull()
    expect(useMenopauseOnboardingStore.getState().stage).toBeNull()
  })

  it('P1-2: dev mode short-circuits before any DB write or durable-store write', async () => {
    useDevStore.setState({ active: true })
    const { getByText } = await renderToComplete()

    await act(async () => { fireEvent.press(getByText('Enter my space')) })
    await waitFor(() => expect(mockedRouter.replace).toHaveBeenCalledWith('/(tabs)'))

    // No Supabase touched, durable menopause store + enrollment untouched.
    expect(mockedSupabase.from).not.toHaveBeenCalled()
    expect(useMenopauseStore.getState().stage).toBeNull()
    expect(useBehaviorStore.getState().enrolledBehaviors).not.toContain('menopause')
    // Ephemeral buffer still cleared + queue still advanced.
    expect(useMenopauseOnboardingStore.getState().stage).toBeNull()
    expect(useOnboardingStore.getState().currentOnboarding).toBeNull()
  })

  it('picked symptoms seed the home quick-log pins; the HRT answer is kept', async () => {
    const { getByText } = await renderToComplete()

    await act(async () => { fireEvent.press(getByText('Enter my space')) })
    await waitFor(() => expect(mockedRouter.replace).toHaveBeenCalledWith('/(tabs)'))

    expect(useMenopauseQuickLogStore.getState().enabledKeys).toEqual(['hot_flash'])
    expect(useMenopauseStore.getState().onHrt).toBe(true)
  })
})
