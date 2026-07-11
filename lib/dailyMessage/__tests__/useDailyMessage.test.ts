// This suite only exercises the pure `resolveAnswer` helper, not the hook's
// Supabase-backed queries/mutation. Mock the client so importing the module
// doesn't require real EXPO_PUBLIC_SUPABASE_* env vars in the test env.
jest.mock('../../supabase', () => ({ supabase: {} }))

import { resolveAnswer } from '../useDailyMessage'
import { PREGNANCY_QUESTIONS } from '../questions.pregnancy'

describe('resolveAnswer', () => {
  it('returns a card matching the chosen option', () => {
    const q = PREGNANCY_QUESTIONS[0]
    const card = resolveAnswer(q, 0, [])
    expect(card).toBeTruthy()
    expect(card.mode).toBe('pregnancy')
  })
})
