// Notification permission is never asked at launch: the push token registers silently when
// permission is already granted, and the OS prompt only follows a user action. The end-of-
// onboarding pre-prompt sheet shows only while the OS hasn't been asked yet, and "Not now"
// keeps it away for 14 days.
const mockNotifs = {
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[abc]' })),
}
const mockUpsert = jest.fn(async () => ({ error: null }))

jest.mock('expo-modules-core', () => ({ requireOptionalNativeModule: () => ({}) }))
jest.mock('expo-notifications', () => mockNotifs)
jest.mock('expo-device', () => ({ isDevice: true, deviceName: 'Test phone' }))
jest.mock('expo-constants', () => ({ expoConfig: { extra: { eas: { projectId: 'p1' } } } }))
jest.mock('../supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn(async () => ({ data: { session: { user: { id: 'u1' } } } })) },
    from: jest.fn(() => ({ upsert: mockUpsert })),
  },
}))
jest.mock('../i18n', () => ({ t: (k: string) => k }))

import { registerPushToken, requestNotificationPermission } from '../pushNotifications'
import { PUSH_PRE_PROMPT_SNOOZE_DAYS, pushPrePromptSnoozedUntil, shouldShowPushPrePrompt } from '../pushPrePrompt'

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('registerPushToken (launch)', () => {
  it('never prompts when permission has not been asked yet', async () => {
    mockNotifs.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' })
    expect(await registerPushToken()).toBeNull()
    expect(mockNotifs.requestPermissionsAsync).not.toHaveBeenCalled()
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('registers silently when permission is already granted', async () => {
    mockNotifs.getPermissionsAsync.mockResolvedValue({ status: 'granted' })
    expect(await registerPushToken()).toBe('ExponentPushToken[abc]')
    expect(mockNotifs.requestPermissionsAsync).not.toHaveBeenCalled()
    expect(mockUpsert).toHaveBeenCalledTimes(1)
  })
})

describe('requestNotificationPermission (user action)', () => {
  it('prompts, and registers the push token once granted', async () => {
    mockNotifs.getPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' }).mockResolvedValue({ status: 'granted' })
    mockNotifs.requestPermissionsAsync.mockResolvedValue({ status: 'granted' })
    expect(await requestNotificationPermission()).toBe(true)
    expect(mockNotifs.requestPermissionsAsync).toHaveBeenCalledTimes(1)
    await flush()
    expect(mockUpsert).toHaveBeenCalledTimes(1)
  })

  it('no token when the user declines', async () => {
    mockNotifs.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' })
    mockNotifs.requestPermissionsAsync.mockResolvedValue({ status: 'denied' })
    expect(await requestNotificationPermission()).toBe(false)
    await flush()
    expect(mockUpsert).not.toHaveBeenCalled()
  })
})

describe('pre-prompt sheet', () => {
  const now = new Date('2026-11-10T12:00:00').getTime()
  it('shows only while the OS has not asked yet', () => {
    expect(shouldShowPushPrePrompt({ permission: 'undetermined', snoozedUntil: null, now })).toBe(true)
    expect(shouldShowPushPrePrompt({ permission: 'granted', snoozedUntil: null, now })).toBe(false)
    expect(shouldShowPushPrePrompt({ permission: 'denied', snoozedUntil: null, now })).toBe(false)
    expect(shouldShowPushPrePrompt({ permission: 'unavailable', snoozedUntil: null, now })).toBe(false)
  })

  it('"Not now" keeps it away for 14 days', () => {
    expect(PUSH_PRE_PROMPT_SNOOZE_DAYS).toBe(14)
    const until = pushPrePromptSnoozedUntil(now)
    expect(shouldShowPushPrePrompt({ permission: 'undetermined', snoozedUntil: until, now: now + 13 * 86400000 })).toBe(false)
    expect(shouldShowPushPrePrompt({ permission: 'undetermined', snoozedUntil: until, now: now + 14 * 86400000 })).toBe(true)
  })
})
