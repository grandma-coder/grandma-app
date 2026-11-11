import { inviteErrorKind, functionErrorMessage, setPendingInvite, consumePendingInvite } from '../pendingInvite'

describe('inviteErrorKind — maps accept-invite edge errors to a reason the invitee can act on', () => {
  it.each([
    ['This invite has expired. Please ask for a new one.', 'expired'],
    ['This invite was sent to a different email address', 'wrongAccount'],
    ['This invite has already been accepted', 'used'],
    ['This invite has been revoked', 'invalid'],
    ['Invite not found', 'invalid'],
    ['Edge Function returned a non-2xx status code', 'generic'],
    [undefined, 'generic'],
  ])('%s → %s', (msg, kind) => {
    expect(inviteErrorKind(msg as string | undefined)).toBe(kind)
  })
})

describe('functionErrorMessage', () => {
  it('reads the function body error out of a FunctionsHttpError', async () => {
    const err = { message: 'Edge Function returned a non-2xx status code', context: { json: async () => ({ error: 'Invite not found' }) } }
    await expect(functionErrorMessage(err)).resolves.toBe('Invite not found')
  })
  it('falls back to the error message when the body is unreadable', async () => {
    const err = { message: 'offline', context: { json: async () => { throw new Error('consumed') } } }
    await expect(functionErrorMessage(err)).resolves.toBe('offline')
  })
})

describe('pending invite token', () => {
  it('is consumed once', () => {
    setPendingInvite('abc')
    expect(consumePendingInvite()).toBe('abc')
    expect(consumePendingInvite()).toBeNull()
  })
})
