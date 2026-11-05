const mockDisk = new Map<string, string>()
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => mockDisk.get(k) ?? null),
  setItem: jest.fn(async (k: string, v: string) => { mockDisk.set(k, v) }),
}))
jest.mock('../../lib/reminderNotifications', () => ({ syncReminderNotifications: jest.fn(async () => {}) }))
jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn() } }))

import { useRemindersStore } from '../useRemindersStore'
import { syncReminderNotifications } from '../../lib/reminderNotifications'
import { createReminder } from '../../lib/reminders'

const KEY = 'grandma-reminders-pregnancy-u1'
const draft = (text: string) => ({ text, dueDate: null, dueTime: null, notes: '' })

beforeEach(() => {
  mockDisk.clear()
  useRemindersStore.setState({ lists: {}, loaded: {} })
  jest.clearAllMocks()
})

describe('useRemindersStore', () => {
  it('reads reminders written by older builds under the same key', async () => {
    mockDisk.set(KEY, JSON.stringify([{ id: '1', text: 'old', done: false, tags: ['x'] }, { bogus: true }]))
    const list = await useRemindersStore.getState().load('u1', 'pregnancy')
    expect(list).toEqual([{ id: '1', text: 'old', done: false, tags: ['x'] }])
    expect(syncReminderNotifications).toHaveBeenCalledWith('pregnancy', list)
  })

  it('a write before the first load finishes keeps the stored reminders', async () => {
    mockDisk.set(KEY, JSON.stringify([{ id: '1', text: 'old', done: false }]))
    const next = await useRemindersStore.getState().mutate('u1', 'pregnancy', (l) => [...l, createReminder(draft('new'), '2')])
    expect(next?.map((r) => r.id)).toEqual(['1', '2'])
    expect(JSON.parse(mockDisk.get(KEY)!).map((r: { id: string }) => r.id)).toEqual(['1', '2'])
    expect(syncReminderNotifications).toHaveBeenLastCalledWith('pregnancy', next)
  })

  it('keeps journeys and users apart; no user → no write', async () => {
    await useRemindersStore.getState().mutate('u1', 'pre-pregnancy', () => [createReminder(draft('cycle'), 'c')])
    expect(mockDisk.has('grandma-reminders-pre-pregnancy-u1')).toBe(true)
    expect(mockDisk.has(KEY)).toBe(false)
    expect(await useRemindersStore.getState().mutate(null, 'pregnancy', () => [])).toBeNull()
  })
})
