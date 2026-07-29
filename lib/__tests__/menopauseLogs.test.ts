jest.mock('../supabase', () => {
  const insert = jest.fn().mockResolvedValue({ error: null })
  return {
    supabase: {
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }) },
      from: jest.fn(() => ({ insert })),
    },
    __insert: insert,
  }
})
jest.mock('../queryClient', () => ({ queryClient: { invalidateQueries: jest.fn() } }))

import { saveMenopauseLog } from '../menopauseLogs'
import { supabase } from '../supabase'

it('inserts a menopause log row with the user id', async () => {
  await saveMenopauseLog({ date: '2026-07-25', type: 'hot_flash', severity: 3 })
  expect(supabase.from).toHaveBeenCalledWith('menopause_logs')
  const insert = (supabase.from as jest.Mock).mock.results[0].value.insert
  expect(insert).toHaveBeenCalledWith(
    expect.objectContaining({ user_id: 'u1', type: 'hot_flash', severity: 3, date: '2026-07-25' }),
  )
})
