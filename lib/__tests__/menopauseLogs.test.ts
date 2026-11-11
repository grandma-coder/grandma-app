// Insert → .select('id').single(); delete → .eq(user).eq(date).eq(type).neq('id', newId).
const mockInsertResult: { data: { id: string } | null; error: unknown } = { data: { id: 'new-row' }, error: null }
const mockInsert = jest.fn((_row: unknown) => ({ select: () => ({ single: () => Promise.resolve(mockInsertResult) }) }))
const mockEqs: [string, unknown][] = []
const mockDelete = jest.fn(() => {
  const chain: { eq: jest.Mock; neq: jest.Mock } = { eq: jest.fn(), neq: jest.fn() }
  chain.eq.mockImplementation((k: string, v: unknown) => {
    mockEqs.push([k, v])
    return chain
  })
  chain.neq.mockImplementation((k: string, v: unknown) => {
    mockEqs.push([`!${k}`, v])
    return Promise.resolve({ error: null })
  })
  return chain
})
const mockCalls: string[] = []
jest.mock('../supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }) },
    from: jest.fn(() => ({
      insert: (row: unknown) => { mockCalls.push('insert'); return mockInsert(row) },
      delete: () => { mockCalls.push('delete'); return mockDelete() },
    })),
  },
}))
jest.mock('../queryClient', () => ({ queryClient: { invalidateQueries: jest.fn() } }))

import { saveMenopauseLog } from '../menopauseLogs'
import { supabase } from '../supabase'

beforeEach(() => {
  mockInsert.mockClear(); mockDelete.mockClear(); mockEqs.length = 0; mockCalls.length = 0
  mockInsertResult.data = { id: 'new-row' }; mockInsertResult.error = null
})

it('inserts a menopause log row with the user id', async () => {
  await saveMenopauseLog({ date: '2026-07-25', type: 'hot_flash', severity: 3 })
  expect(supabase.from).toHaveBeenCalledWith('menopause_logs')
  expect(mockInsert).toHaveBeenCalledWith(
    expect.objectContaining({ user_id: 'u1', type: 'hot_flash', severity: 3, date: '2026-07-25' }),
  )
})

it('replaces the same day + type instead of stacking a duplicate', async () => {
  await saveMenopauseLog({ date: '2026-07-25', type: 'period', value: 'light' })
  expect(mockEqs).toEqual([['user_id', 'u1'], ['date', '2026-07-25'], ['type', 'period'], ['!id', 'new-row']])
  expect(mockInsert).toHaveBeenCalledTimes(1)
})

it('an edit whose insert fails keeps the existing entry (nothing deleted first)', async () => {
  mockInsertResult.data = null
  mockInsertResult.error = new Error('offline')
  await expect(saveMenopauseLog({ date: '2026-07-25', type: 'hot_flash', severity: 4 })).rejects.toThrow('offline')
  expect(mockDelete).not.toHaveBeenCalled()
  expect(mockCalls).toEqual(['insert'])
})

it('keeps every note of the day', async () => {
  await saveMenopauseLog({ date: '2026-07-25', type: 'note', notes: 'hi' })
  expect(mockDelete).not.toHaveBeenCalled()
})

it('refuses a future date', async () => {
  await expect(saveMenopauseLog({ date: '2999-01-01', type: 'hot_flash' })).rejects.toThrow()
  expect(mockInsert).not.toHaveBeenCalled()
})
