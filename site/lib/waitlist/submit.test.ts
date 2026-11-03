import { describe, it, expect, vi } from 'vitest'
import { submitWaitlist } from './submit'
import type { WaitlistDeps } from './types'

const deps = (result: 'ok' | 'rate_limited' | Error = 'ok') => {
  const join = vi.fn(async () => { if (result instanceof Error) throw result; return result })
  return { join, hashIp: vi.fn((ip: string | null) => (ip ? `h(${ip})` : null)) } satisfies WaitlistDeps
}
const valid = { email: ' Ana@Example.com ', name: 'Ana', mode: 'meno', locale: 'pt', notify_launch: 'on', utm_source: 'ig' }

describe('submitWaitlist', () => {
  it('writes a normalised row with hashed ip and the geo country', async () => {
    const d = deps()
    expect(await submitWaitlist(valid, '1.2.3.4', d, 'BR')).toEqual({ status: 'success' })
    expect(d.join).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@example.com', mode: 'meno', country: 'BR', notifyLaunch: true, utmSource: 'ig' }), 'h(1.2.3.4)')
  })
  it('honeypot → success without writing', async () => {
    const d = deps()
    expect(await submitWaitlist({ ...valid, company: 'Acme' }, null, d, 'BR')).toEqual({ status: 'success' })
    expect(d.join).not.toHaveBeenCalled()
  })
  it('invalid → field errors, no write', async () => {
    const d = deps()
    expect(await submitWaitlist({ ...valid, email: 'nope', mode: '' }, null, d, 'BR')).toEqual({
      status: 'invalid', fieldErrors: { email: 'email_invalid', mode: 'mode_required' },
    })
    expect(d.join).not.toHaveBeenCalled()
  })
  it('rate limit passes through', async () => expect(await submitWaitlist(valid, '1.2.3.4', deps('rate_limited'), 'BR')).toEqual({ status: 'rate_limited' }))
  it('storage failure → generic error, email masked in logs', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await submitWaitlist(valid, null, deps(new Error('db down for ana@example.com')), 'BR')).toEqual({ status: 'error' })
    expect(JSON.stringify(spy.mock.calls)).not.toContain('ana@example.com')
    spy.mockRestore()
  })
  it('missing config (deps throw) still allows honeypot and validation, and join failure → error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const broken: WaitlistDeps = { hashIp: () => { throw new Error('SUPABASE_URL is not set') }, join: async () => { throw new Error('SUPABASE_URL is not set') } }
    expect(await submitWaitlist({ ...valid, company: 'x' }, null, broken, 'BR')).toEqual({ status: 'success' })
    expect((await submitWaitlist({ ...valid, email: '' }, null, broken, 'BR')).status).toBe('invalid')
    expect(await submitWaitlist(valid, null, broken, 'BR')).toEqual({ status: 'error' })
    spy.mockRestore()
  })
})
