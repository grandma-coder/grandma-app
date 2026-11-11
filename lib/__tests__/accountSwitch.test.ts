import { claimDeviceAccount } from '../accountSwitch'

// A session can end without signOut() (expired/revoked refresh token, "sign out all devices" on
// another phone). Only signOut() wiped the local stores, so the next account to sign in on this
// phone inherited the previous one's journeys, due date, children and reminders. The boot path
// asks claimDeviceAccount whether the device last belonged to someone else.
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: async (k: string) => data.get(k) ?? null,
    setItem: async (k: string, v: string) => { data.set(k, v) },
    data,
  }
}

test('a different account than last time → previous local data must be cleared', async () => {
  const storage = memoryStorage()
  expect(await claimDeviceAccount('user-a', storage)).toBe(false)
  expect(await claimDeviceAccount('user-b', storage)).toBe(true)
})

test('the same account signing back in keeps its local data', async () => {
  const storage = memoryStorage()
  await claimDeviceAccount('user-a', storage)
  expect(await claimDeviceAccount('user-a', storage)).toBe(false)
})

test('first boot after an update (nothing recorded yet) keeps local data', async () => {
  expect(await claimDeviceAccount('user-a', memoryStorage())).toBe(false)
})

test('unreadable storage never wipes', async () => {
  const broken = {
    getItem: async () => { throw new Error('disk') },
    setItem: async () => { throw new Error('disk') },
  }
  expect(await claimDeviceAccount('user-a', broken)).toBe(false)
})
