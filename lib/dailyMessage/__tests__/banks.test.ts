import { DAILY_TAGS } from '../tags'
import { PREGNANCY_QUESTIONS, PREGNANCY_CARDS } from '../questions.pregnancy'  // re-exported below
import { PREPREGNANCY_QUESTIONS } from '../questions.prePregnancy'
import { PREPREGNANCY_CARDS } from '../cards.prePregnancy'
import { getQuestionById, getCardById, getCardsForMode, getQuestionsForMode } from '../index'

// Each mode's populated content bank, tested with identical invariants so a new
// mode's data (tags, id-uniqueness, lookups) is held to the same bar.
const BANKS = [
  { mode: 'pregnancy' as const, questions: PREGNANCY_QUESTIONS, cards: PREGNANCY_CARDS },
  { mode: 'pre-pregnancy' as const, questions: PREPREGNANCY_QUESTIONS, cards: PREPREGNANCY_CARDS },
]

describe.each(BANKS)('content bank: $mode', ({ mode, questions, cards }) => {
  it('has a starter set of questions and cards', () => {
    expect(questions.length).toBeGreaterThanOrEqual(20)
    expect(cards.length).toBeGreaterThanOrEqual(40)
  })
  it('every question is tagged from the vocabulary and belongs to this mode', () => {
    for (const q of questions) {
      expect(q.mode).toBe(mode)
      for (const o of q.options)
        for (const t of o.tags)
          expect(DAILY_TAGS).toContain(t)
    }
  })
  it('every card tag is in the vocabulary, belongs to this mode, and ids are unique', () => {
    const ids = new Set<string>()
    for (const c of cards) {
      expect(ids.has(c.id)).toBe(false); ids.add(c.id)
      expect(c.mode).toBe(mode)
      for (const t of c.tags) expect(DAILY_TAGS).toContain(t)
    }
  })
  it('lookups resolve by id and getCardsForMode returns this bank', () => {
    expect(getQuestionById(questions[0].id)?.id).toBe(questions[0].id)
    expect(getCardById(cards[0].id)?.id).toBe(cards[0].id)
    expect(getCardsForMode(mode).length).toBe(cards.length)
    expect(getQuestionsForMode(mode).length).toBe(questions.length)
  })
})

it('question and card ids are globally unique across modes', () => {
  const qids = [...PREGNANCY_QUESTIONS, ...PREPREGNANCY_QUESTIONS].map((q) => q.id)
  const cids = [...PREGNANCY_CARDS, ...PREPREGNANCY_CARDS].map((c) => c.id)
  expect(new Set(qids).size).toBe(qids.length)
  expect(new Set(cids).size).toBe(cids.length)
})
