const mockInsert = jest.fn().mockResolvedValue({ error: null })
const mockEqs: [string, unknown][] = []
const mockDelete = jest.fn(() => {
  const chain: { eq: jest.Mock } = { eq: jest.fn() }
  chain.eq.mockImplementation((k: string, v: unknown) => {
    mockEqs.push([k, v])
    return mockEqs.length % 3 === 0 ? Promise.resolve({ error: null }) : chain
  })
  return chain
})
jest.mock('../supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }) },
    from: jest.fn(() => ({ insert: mockInsert, delete: mockDelete })),
  },
}))
jest.mock('../queryClient', () => ({ queryClient: { invalidateQueries: jest.fn() } }))

import { saveMenopauseLog } from '../menopauseLogs'
import { supabase } from '../supabase'

beforeEach(() => { mockInsert.mockClear(); mockDelete.mockClear(); mockEqs.length = 0 })

it('inserts a menopause log row with the user id', async () => {
  await saveMenopauseLog({ date: '2026-07-25', type: 'hot_flash', severity: 3 })
  expect(supabase.from).toHaveBeenCalledWith('menopause_logs')
  expect(mockInsert).toHaveBeenCalledWith(
    expect.objectContaining({ user_id: 'u1', type: 'hot_flash', severity: 3, date: '2026-07-25' }),
  )
})

it('replaces the same day + type instead of stacking a duplicate', async () => {
  await saveMenopauseLog({ date: '2026-07-25', type: 'period', value: 'light' })
  expect(mockEqs).toEqual([['user_id', 'u1'], ['date', '2026-07-25'], ['type', 'period']])
  expect(mockInsert).toHaveBeenCalledTimes(1)
})

it('keeps every note of the day', async () => {
  await saveMenopauseLog({ date: '2026-07-25', type: 'note', notes: 'hi' })
  expect(mockDelete).not.toHaveBeenCalled()
})

it('refuses a future date', async () => {
  await expect(saveMenopauseLog({ date: '2999-01-01', type: 'hot_flash' })).rejects.toThrow()
  expect(mockInsert).not.toHaveBeenCalled()
})
