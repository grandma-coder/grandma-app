// This suite only exercises the pure `resolveAnswer` helper, not the hook's
// Supabase-backed queries/mutation. Mock the client so importing the module
// doesn't require real EXPO_PUBLIC_SUPABASE_* env vars in the test env.
jest.mock('../../supabase', () => ({ supabase: {} }))

import { resolveAnswer } from '../useDailyMessage'
import { PREGNANCY_QUESTIONS } from '../questions.pregnancy'
import { PREPREGNANCY_QUESTIONS } from '../questions.prePregnancy'

describe('resolveAnswer', () => {
  it('returns a pregnancy card for a pregnancy question', () => {
    const card = resolveAnswer(PREGNANCY_QUESTIONS[0], 0, [])
    expect(card).toBeTruthy()
    expect(card.mode).toBe('pregnancy')
    expect(card.id.startsWith('c_')).toBe(true)
  })

  it('returns a pre-pregnancy card for a pre-pregnancy question (never crosses modes)', () => {
    const card = resolveAnswer(PREPREGNANCY_QUESTIONS[0], 0, [])
    expect(card).toBeTruthy()
    expect(card.mode).toBe('pre-pregnancy')
    expect(card.id.startsWith('pc_')).toBe(true)
  })
})
