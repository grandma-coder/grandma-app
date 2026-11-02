import {
  useAppointmentQuestionsStore,
  pendingQuestionsKey,
  openQuestionCount,
} from '../useAppointmentQuestionsStore'

const store = () => useAppointmentQuestionsStore.getState()
const list = (key: string) => store().questions[key] ?? []

type Persist = { getOptions: () => { name?: string; partialize?: (s: unknown) => unknown } }
const opts = () => (useAppointmentQuestionsStore as unknown as { persist: Persist }).persist.getOptions()

beforeEach(() => {
  useAppointmentQuestionsStore.setState({ questions: {} })
})

describe('useAppointmentQuestionsStore', () => {
  it('adds a trimmed question with the item shape', () => {
    const q = store().add('nt-scan', '  When do I get results?  ')
    expect(q).not.toBeNull()
    expect(list('nt-scan')).toEqual([
      { id: q!.id, text: 'When do I get results?', done: false, createdAt: expect.any(String) },
    ])
  })

  it('ignores blank questions', () => {
    expect(store().add('nt-scan', '   ')).toBeNull()
    expect(store().questions).toEqual({})
  })

  it('toggles a question asked and back', () => {
    const q = store().add('visit-1', 'Fever dose?')!
    store().toggle('visit-1', q.id)
    expect(list('visit-1')[0].done).toBe(true)
    store().toggle('visit-1', q.id)
    expect(list('visit-1')[0].done).toBe(false)
  })

  it('deletes a question and drops the empty bucket', () => {
    const a = store().add('visit-1', 'A')!
    const b = store().add('visit-1', 'B')!
    store().remove('visit-1', a.id)
    expect(list('visit-1').map((q) => q.id)).toEqual([b.id])
    store().remove('visit-1', b.id)
    expect('visit-1' in store().questions).toBe(false)
  })

  it('keeps appointments separate', () => {
    store().add('a', 'one')
    store().add('b', 'two')
    expect(list('a').map((q) => q.text)).toEqual(['one'])
    expect(list('b').map((q) => q.text)).toEqual(['two'])
  })

  it('moves pending questions onto the next appointment', () => {
    const pKey = pendingQuestionsKey('kids')
    expect(pKey).toBe('pending:kids')
    store().add('visit-1', 'Already here')
    store().add(pKey, 'Sleep regression?')
    store().add(pKey, 'Solid foods?')
    store().add(pendingQuestionsKey('pregnancy'), 'Other journey')

    expect(store().claimPending('kids', 'visit-1')).toBe(2)
    expect(list('visit-1').map((q) => q.text)).toEqual(['Already here', 'Sleep regression?', 'Solid foods?'])
    expect(pKey in store().questions).toBe(false)
    // Other journeys' pending stays put.
    expect(list(pendingQuestionsKey('pregnancy')).map((q) => q.text)).toEqual(['Other journey'])
    // Nothing left to claim.
    expect(store().claimPending('kids', 'visit-2')).toBe(0)
    expect(list('visit-2')).toEqual([])
  })

  it('counts only unasked questions across keys', () => {
    const q = store().add('a', 'one')!
    store().add('a', 'two')
    store().add('pending:kids', 'three')
    store().toggle('a', q.id)
    expect(openQuestionCount(store().questions, 'a')).toBe(1)
    expect(openQuestionCount(store().questions, 'a', 'pending:kids')).toBe(2)
  })

  it('persists only the questions map', () => {
    store().add('a', 'one')
    expect(opts().name).toBe('grandma-appointment-questions')
    expect(Object.keys(opts().partialize!(store()) as object)).toEqual(['questions'])
  })
})
