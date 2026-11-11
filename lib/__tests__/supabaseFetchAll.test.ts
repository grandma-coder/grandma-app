jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }))

import { fetchAllRows } from '../supabase'

/** A query that behaves like PostgREST with max_rows = `cap`: never more than `cap` rows per request. */
function fakeQuery(total: number, cap = 1000, failAt?: number) {
  const rows = Array.from({ length: total }, (_, i) => ({ i }))
  const calls: Array<[number, number]> = []
  const make = () => ({
    range: (from: number, to: number) => {
      calls.push([from, to])
      if (failAt !== undefined && from >= failAt) return Promise.resolve({ data: null, error: { message: 'boom' } })
      return Promise.resolve({ data: rows.slice(from, Math.min(to + 1, from + cap)), error: null })
    },
  })
  return { make, calls }
}

describe('fetchAllRows', () => {
  it('reads past the 1000-row server cap instead of silently dropping the newest rows', async () => {
    const q = fakeQuery(2350)
    const out = await fetchAllRows(q.make)
    expect(out).toHaveLength(2350)
    expect(out[2349]).toEqual({ i: 2349 })
  })

  it('stops after a short page', async () => {
    const q = fakeQuery(10)
    expect(await fetchAllRows(q.make)).toHaveLength(10)
    expect(q.calls).toHaveLength(1)
  })

  it('surfaces an error instead of returning a partial list', async () => {
    const q = fakeQuery(2500, 1000, 1000)
    await expect(fetchAllRows(q.make)).rejects.toEqual({ message: 'boom' })
  })
})
