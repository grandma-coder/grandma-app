import { describe, it, expect, vi, beforeEach } from 'vitest'

const join = vi.fn(async () => 'ok' as const)
let headerMap: Record<string, string> = {}
vi.mock('next/headers', () => ({ headers: async () => ({ get: (k: string) => headerMap[k] ?? null }) }))
vi.mock('./supabase', () => ({ waitlistDeps: () => ({ join, hashIp: (ip: string | null) => ip }) }))

import { joinWaitlist } from './action'

const form = () => {
  const fd = new FormData()
  fd.set('email', 'ana@example.com'); fd.set('mode', 'preg'); fd.set('locale', 'en')
  return fd
}

describe('joinWaitlist', () => {
  beforeEach(() => { join.mockClear() })
  it('passes the geo country from x-vercel-ip-country to the RPC row', async () => {
    headerMap = { 'x-vercel-ip-country': 'FR' }
    expect(await joinWaitlist({ status: 'idle' }, form())).toEqual({ status: 'success' })
    expect(join).toHaveBeenCalledWith(expect.objectContaining({ country: 'FR' }), null)
  })
  it('uses OTHER without the header, and ignores a client-sent country', async () => {
    headerMap = {}
    const fd = form(); fd.set('country', 'US')
    await joinWaitlist({ status: 'idle' }, fd)
    expect(join).toHaveBeenCalledWith(expect.objectContaining({ country: 'OTHER' }), null)
  })
  it('passes region and city from the Vercel geo headers', async () => {
    headerMap = { 'x-vercel-ip-country': 'BR', 'x-vercel-ip-country-region': 'SP', 'x-vercel-ip-city': 'S%C3%A3o%20Paulo' }
    await joinWaitlist({ status: 'idle' }, form())
    expect(join).toHaveBeenCalledWith(expect.objectContaining({ country: 'BR', region: 'SP', city: 'São Paulo' }), null)
  })
  it('sends null region and city without the headers', async () => {
    headerMap = { 'x-vercel-ip-country': 'BR' }
    await joinWaitlist({ status: 'idle' }, form())
    expect(join).toHaveBeenCalledWith(expect.objectContaining({ region: null, city: null }), null)
  })
})
