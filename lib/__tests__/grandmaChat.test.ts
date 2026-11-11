/** sendGrandmaMessage must never hand the UI a placeholder as if Grandma had answered. */
const mockInvoke = jest.fn()
jest.mock('../supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'me' } } } }) },
    functions: { invoke: (...a: unknown[]) => mockInvoke(...a) },
  },
}))
jest.mock('../../store/useFeatureFlags', () => ({ useFeatureFlags: { getState: () => ({ grandmaChat: true }) } }))

import { sendGrandmaMessage } from '../grandmaChat'

beforeEach(() => mockInvoke.mockReset())

describe('sendGrandmaMessage', () => {
  it('returns the grandma-chat reply + suggestions', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { reply: 'hi', suggestions: ['a'] }, error: null })
    await expect(sendGrandmaMessage([{ role: 'user', content: 'x' }], { behavior: 'kids' })).resolves.toEqual({ reply: 'hi', suggestions: ['a'] })
  })
  it('throws (instead of a fake "Grandma is thinking..." reply) when the fallback returns no reply', async () => {
    mockInvoke
      .mockResolvedValueOnce({ data: null, error: new Error('500') })
      .mockResolvedValueOnce({ data: {}, error: null })
    await expect(sendGrandmaMessage([{ role: 'user', content: 'x' }], { behavior: 'kids' })).rejects.toThrow()
  })
  it('does not retry on nana-chat when grandma-chat is switched off server-side', async () => {
    const err = Object.assign(new Error('non-2xx'), { context: { status: 403, json: async () => ({ error: 'grandma_chat_disabled' }) } })
    mockInvoke.mockResolvedValueOnce({ data: null, error: err })
    await expect(sendGrandmaMessage([{ role: 'user', content: 'x' }], { behavior: 'kids' })).rejects.toThrow('grandma_chat_disabled')
    expect(mockInvoke).toHaveBeenCalledTimes(1)
  })
})
