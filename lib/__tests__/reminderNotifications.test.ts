const mockScheduled = new Map<string, { title: string; body: string; date: Date }>()
let mockPermission: 'granted' | 'denied' | 'undetermined' | 'unavailable' = 'granted'

jest.mock('../pushNotifications', () => ({
  listScheduledLocalNotificationIds: jest.fn(async () => [...mockScheduled.keys()]),
  cancelLocalNotification: jest.fn(async (id: string) => { mockScheduled.delete(id) }),
  getNotificationPermissionStatus: jest.fn(async () => mockPermission),
  requestNotificationPermission: jest.fn(async () => { mockPermission = 'granted'; return true }),
  scheduleLocalNotificationAt: jest.fn(async (o: { identifier: string; title: string; body: string; date: Date }) => {
    if (mockPermission !== 'granted') return false
    mockScheduled.set(o.identifier, { title: o.title, body: o.body, date: o.date })
    return true
  }),
}))
jest.mock('../i18n', () => ({ t: (k: string) => k }))
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }))

import { syncReminderNotifications, cancelAllReminderNotifications, ensureReminderPermission } from '../reminderNotifications'
import { addDays, type Reminder } from '../reminders'

const tomorrow = () => addDays(new Date(), 1)
const rem = (over: Partial<Reminder>): Reminder => ({ id: 'a', text: 'Vitamins', done: false, dueDate: tomorrow(), dueTime: '09:00', ...over })

beforeEach(() => {
  mockScheduled.clear()
  mockPermission = 'granted'
})

describe('syncReminderNotifications', () => {
  it('schedules one alert per open future reminder, under a stable id', async () => {
    await syncReminderNotifications('pregnancy', [rem({ id: 'a' }), rem({ id: 'b', notes: 'with food' })])
    expect([...mockScheduled.keys()].sort()).toEqual(['reminder-pregnancy-a', 'reminder-pregnancy-b'])
    expect(mockScheduled.get('reminder-pregnancy-a')).toMatchObject({ title: 'Vitamins', body: 'reminders_notifBody' })
    expect(mockScheduled.get('reminder-pregnancy-b')?.body).toBe('with food')
  })

  it('re-syncing never duplicates and moves an edited alert', async () => {
    await syncReminderNotifications('pregnancy', [rem({ id: 'a' })])
    await syncReminderNotifications('pregnancy', [rem({ id: 'a', dueTime: '18:30' })])
    expect(mockScheduled.size).toBe(1)
    expect(mockScheduled.get('reminder-pregnancy-a')?.date.getHours()).toBe(18)
  })

  it('cancels alerts for done and deleted reminders, leaving other journeys and app alerts alone', async () => {
    mockScheduled.set('local-daily-reminder', { title: '', body: '', date: new Date() })
    await syncReminderNotifications('pre-pregnancy', [rem({ id: 'c' })])
    await syncReminderNotifications('pregnancy', [rem({ id: 'a' }), rem({ id: 'b' })])
    await syncReminderNotifications('pregnancy', [rem({ id: 'a', done: true })])
    expect([...mockScheduled.keys()].sort()).toEqual(['local-daily-reminder', 'reminder-pre-pregnancy-c'])
  })

  it('without permission schedules nothing but still cancels stale ones', async () => {
    await syncReminderNotifications('kids', [rem({ id: 'k' })])
    mockPermission = 'denied'
    await syncReminderNotifications('kids', [rem({ id: 'k2' })])
    expect(mockScheduled.size).toBe(0)
  })

  it('overlapping syncs run in order (last list wins)', async () => {
    await Promise.all([
      syncReminderNotifications('pregnancy', [rem({ id: 'a' })]),
      syncReminderNotifications('pregnancy', [rem({ id: 'b' })]),
    ])
    expect([...mockScheduled.keys()]).toEqual(['reminder-pregnancy-b'])
  })
})

describe('cancelAllReminderNotifications', () => {
  it('clears every journey on sign-out, keeps non-reminder alerts', async () => {
    mockScheduled.set('local-cycle-period-reminder', { title: '', body: '', date: new Date() })
    await syncReminderNotifications('pregnancy', [rem({ id: 'a' })])
    await syncReminderNotifications('kids', [rem({ id: 'b' })])
    await cancelAllReminderNotifications()
    expect([...mockScheduled.keys()]).toEqual(['local-cycle-period-reminder'])
  })
})

describe('ensureReminderPermission', () => {
  it('asks only while undetermined', async () => {
    mockPermission = 'undetermined'
    expect(await ensureReminderPermission()).toBe('granted')
    mockPermission = 'denied'
    expect(await ensureReminderPermission()).toBe('denied')
  })
})
