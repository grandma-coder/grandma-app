const mockSelect = jest.fn()
jest.mock('../supabase', () => ({ supabase: { from: () => ({ select: mockSelect }) } }))

import { loadRemoteFlags } from '../remoteFlags'
import { useFeatureFlags } from '../../store/useFeatureFlags'

describe('loadRemoteFlags — grandma chat kill switch', () => {
  beforeEach(() => { useFeatureFlags.setState({ grandmaChat: false }); mockSelect.mockReset() })

  it('starts off and is never persisted', () => {
    expect(useFeatureFlags.getState().grandmaChat).toBe(false)
    const opts = (useFeatureFlags as unknown as { persist: { getOptions: () => { partialize: (s: object) => object } } }).persist.getOptions()
    expect(opts.partialize(useFeatureFlags.getState())).not.toHaveProperty('grandmaChat')
  })

  it('turns on only when the row says enabled', async () => {
    mockSelect.mockResolvedValue({ data: [{ key: 'grandma_chat', enabled: true }], error: null })
    await loadRemoteFlags()
    expect(useFeatureFlags.getState().grandmaChat).toBe(true)
    mockSelect.mockResolvedValue({ data: [{ key: 'grandma_chat', enabled: false }], error: null })
    await loadRemoteFlags()
    expect(useFeatureFlags.getState().grandmaChat).toBe(false)
  })

  it('fails closed: missing row, read error or throw keep it off', async () => {
    for (const r of [{ data: [], error: null }, { data: null, error: { message: 'x' } }]) {
      mockSelect.mockResolvedValue(r)
      await loadRemoteFlags()
      expect(useFeatureFlags.getState().grandmaChat).toBe(false)
    }
    mockSelect.mockRejectedValue(new Error('offline'))
    await loadRemoteFlags()
    expect(useFeatureFlags.getState().grandmaChat).toBe(false)
  })
})
