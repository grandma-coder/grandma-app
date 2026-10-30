import { describe, it, expect, vi } from 'vitest'
import { submitWaitlist } from './submit'
import type { WaitlistDeps } from './types'

const deps = (result: 'ok' | 'rate_limited' | Error = 'ok') => {
  const join = vi.fn(async () => { if (result instanceof Error) throw result; return result })
  return { join, hashIp: vi.fn((ip: string | null) => (ip ? `h(${ip})` : null)) } satisfies WaitlistDeps
}
const valid = { email: ' Ana@Example.com ', name: 'Ana', mode: 'meno', locale: 'pt', country: 'BR', notify_launch: 'on', utm_source: 'ig' }

describe('submitWaitlist', () => {
  it('writes a normalised row with hashed ip and echoes the country', async () => {
    const d = deps()
    expect(await submitWaitlist(valid, '1.2.3.4', d)).toEqual({ status: 'success', country: 'BR' })
    expect(d.join).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@example.com', mode: 'meno', country: 'BR', notifyLaunch: true, utmSource: 'ig' }), 'h(1.2.3.4)')
  })
  it('honeypot → success without writing', async () => {
    const d = deps()
    expect(await submitWaitlist({ ...valid, company: 'Acme' }, null, d)).toEqual({ status: 'success', country: 'BR' })
    expect(d.join).not.toHaveBeenCalled()
  })
  it('invalid → field errors, no write', async () => {
    const d = deps()
    expect(await submitWaitlist({ ...valid, email: 'nope', mode: '', country: '' }, null, d)).toEqual({
      status: 'invalid', fieldErrors: { email: 'email_invalid', mode: 'mode_required', country: 'country_required' },
    })
    expect(d.join).not.toHaveBeenCalled()
  })
  it('rate limit passes through', async () => expect(await submitWaitlist(valid, '1.2.3.4', deps('rate_limited'))).toEqual({ status: 'rate_limited' }))
  it('storage failure → generic error, email masked in logs', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await submitWaitlist(valid, null, deps(new Error('db down for ana@example.com')))).toEqual({ status: 'error' })
    expect(JSON.stringify(spy.mock.calls)).not.toContain('ana@example.com')
    spy.mockRestore()
  })
})
