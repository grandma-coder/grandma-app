jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }))

describe('fetchWithReadTimeout', () => {
  const realFetch = global.fetch
  afterEach(() => { global.fetch = realFetch; jest.useRealTimers() })

  function load() {
    let mod: typeof import('../supabase')
    jest.isolateModules(() => { mod = require('../supabase') })
    return mod!.fetchWithReadTimeout
  }

  it('aborts a PostgREST read that hangs past the timeout', async () => {
    jest.useFakeTimers()
    let seenSignal: AbortSignal | undefined
    global.fetch = jest.fn((_u: any, init?: RequestInit) => {
      seenSignal = init?.signal ?? undefined
      return new Promise((_res, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('aborted'))))
    }) as any
    const f = load()
    const p = f('https://x.supabase.co/rest/v1/profiles?select=id', { method: 'GET' })
    jest.advanceTimersByTime(12001)
    await expect(p).rejects.toThrow('aborted')
    expect(seenSignal?.aborted).toBe(true)
  })

  it('leaves writes, storage and functions untouched', async () => {
    global.fetch = jest.fn(() => Promise.resolve(new Response('ok'))) as any
    const f = load()
    await f('https://x.supabase.co/rest/v1/logs', { method: 'POST' })
    await f('https://x.supabase.co/storage/v1/object/a', { method: 'GET' })
    await f('https://x.supabase.co/functions/v1/food-ai', { method: 'POST' })
    for (const call of (global.fetch as jest.Mock).mock.calls) expect(call[1]?.signal).toBeUndefined()
  })
})
