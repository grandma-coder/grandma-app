import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
const rpc = vi.fn()
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc }) }))

import { waitlistDeps } from './supabase'
import type { WaitlistRow } from './types'

const row: WaitlistRow = {
  email: 'ana@example.com', name: null, mode: 'preg', locale: 'pt', country: 'BR', notifyLaunch: false,
  utmSource: null, utmMedium: null, utmCampaign: null, referrer: null, region: 'SP', city: 'São Paulo',
}

describe('waitlistDeps().join', () => {
  beforeEach(() => {
    rpc.mockReset()
    process.env.WAITLIST_SUPABASE_URL = 'https://x.supabase.co'
    process.env.WAITLIST_SUPABASE_SERVICE_ROLE_KEY = 'k'
    process.env.WAITLIST_IP_SALT = 's'
  })
  it('sends region and city', async () => {
    rpc.mockResolvedValueOnce({ data: 'ok', error: null })
    expect(await waitlistDeps().join(row, 'h')).toBe('ok')
    expect(rpc).toHaveBeenCalledWith('waitlist_join', expect.objectContaining({ p_country: 'BR', p_region: 'SP', p_city: 'São Paulo', p_ip_hash: 'h' }))
  })
  it('joins without them while the database still has the old function', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } })
    rpc.mockResolvedValueOnce({ data: 'rate_limited', error: null })
    expect(await waitlistDeps().join(row, 'h')).toBe('rate_limited')
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc.mock.calls[1][1]).not.toHaveProperty('p_region')
    expect(rpc.mock.calls[1][1]).not.toHaveProperty('p_city')
  })
  it('throws on any other error', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: '23514', message: 'check violation' } })
    await expect(waitlistDeps().join(row, 'h')).rejects.toThrow('waitlist_join: 23514')
    expect(rpc).toHaveBeenCalledTimes(1)
  })
})
