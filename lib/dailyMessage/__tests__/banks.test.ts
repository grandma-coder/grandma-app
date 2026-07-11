import { DAILY_TAGS } from '../tags'
import { PREGNANCY_QUESTIONS, PREGNANCY_CARDS } from '../questions.pregnancy'  // re-exported below
import { getQuestionById, getCardById, getCardsForMode } from '../index'

describe('content banks', () => {
  it('has a starter set of questions and cards', () => {
    expect(PREGNANCY_QUESTIONS.length).toBeGreaterThanOrEqual(20)
    expect(PREGNANCY_CARDS.length).toBeGreaterThanOrEqual(40)
  })
  it('every question option tag is in the vocabulary', () => {
    for (const q of PREGNANCY_QUESTIONS)
      for (const o of q.options)
        for (const t of o.tags)
          expect(DAILY_TAGS).toContain(t)
  })
  it('every card tag is in the vocabulary and ids are unique', () => {
    const ids = new Set<string>()
    for (const c of PREGNANCY_CARDS) {
      expect(ids.has(c.id)).toBe(false); ids.add(c.id)
      for (const t of c.tags) expect(DAILY_TAGS).toContain(t)
    }
  })
  it('lookups resolve by id', () => {
    expect(getQuestionById(PREGNANCY_QUESTIONS[0].id)?.id).toBe(PREGNANCY_QUESTIONS[0].id)
    expect(getCardById(PREGNANCY_CARDS[0].id)?.id).toBe(PREGNANCY_CARDS[0].id)
    expect(getCardsForMode('pregnancy').length).toBe(PREGNANCY_CARDS.length)
  })
})
