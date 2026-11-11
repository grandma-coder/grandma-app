// Account deletion from the app: the edge function reply is the source of truth, but a reply lost
// on a flaky network used to leave a deleted account "signed in" and re-asking to delete forever.
// After deletion every per-account key on the phone goes too (reminders, checklists, caches), not
// just the stores sign-out resets.
jest.mock('../supabase', () => ({ supabase: { functions: { invoke: jest.fn() }, auth: { getUser: jest.fn() } } }))
jest.mock('../signOut', () => ({ signOut: jest.fn() }))

import { requestAccountDeletion, accountKeysToWipe } from '../deleteAccount'

describe('requestAccountDeletion', () => {
  it('succeeds when the function confirms ok', async () => {
    const invoke = jest.fn().mockResolvedValue({ data: { ok: true }, error: null })
    const getUser = jest.fn()
    await expect(requestAccountDeletion({ invoke, getUser })).resolves.toBe(true)
    expect(getUser).not.toHaveBeenCalled()
  })

  it('fails when the function errors and the account still exists', async () => {
    const invoke = jest.fn().mockResolvedValue({ data: null, error: new Error('Edge Function returned a non-2xx status code') })
    const getUser = jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    await expect(requestAccountDeletion({ invoke, getUser })).resolves.toBe(false)
  })

  it('fails when the reply is 2xx but not ok (never assume deleted)', async () => {
    const invoke = jest.fn().mockResolvedValue({ data: { error: 'boom' }, error: null })
    const getUser = jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    await expect(requestAccountDeletion({ invoke, getUser })).resolves.toBe(false)
  })

  it('treats a lost reply as success when the server no longer knows the user', async () => {
    const invoke = jest.fn().mockRejectedValue(new TypeError('Network request failed'))
    const getUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: { status: 403, code: 'user_not_found', message: 'User from sub claim in JWT does not exist' },
    })
    await expect(requestAccountDeletion({ invoke, getUser })).resolves.toBe(true)
  })

  it('does not treat an offline getUser as deleted', async () => {
    const invoke = jest.fn().mockRejectedValue(new TypeError('Network request failed'))
    const getUser = jest.fn().mockResolvedValue({ data: { user: null }, error: { status: 0, message: 'Network request failed' } })
    await expect(requestAccountDeletion({ invoke, getUser })).resolves.toBe(false)
  })
})

describe('accountKeysToWipe', () => {
  it('removes per-account keys and keeps device preferences', () => {
    const keys = [
      'grandma-theme', 'grandma-language', 'grandma-units', 'grandma-agenda-view', 'grandma-feature-flags',
      'grandma-push-preprompt', 'grandma-last-account',
      'grandma-reminders-cycle-u1', 'grandma-reminders-kid1', 'grandma-vaccine-scheduled-kid1',
      'grandma:hospital_bag_checklist:v1', 'grandma-insight-context', 'congrats_shown', 'grandma-journey',
    ]
    const wiped = accountKeysToWipe(keys)
    expect(wiped).toEqual(expect.arrayContaining([
      'grandma-reminders-cycle-u1', 'grandma-reminders-kid1', 'grandma-vaccine-scheduled-kid1',
      'grandma:hospital_bag_checklist:v1', 'grandma-insight-context', 'congrats_shown', 'grandma-journey',
    ]))
    for (const keep of ['grandma-theme', 'grandma-language', 'grandma-units', 'grandma-agenda-view', 'grandma-feature-flags', 'grandma-push-preprompt']) {
      expect(wiped).not.toContain(keep)
    }
  })
})
