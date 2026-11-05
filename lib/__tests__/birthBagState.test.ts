import { hospitalBagChecklist, normalizeBagState } from '../birthData'

describe('hospital bag checked state', () => {
  const allIds = hospitalBagChecklist.flatMap((s) => s.items.map((i) => i.id))

  it('has unique, stable item ids', () => {
    expect(new Set(allIds).size).toBe(allIds.length)
    expect(allIds).toContain('mom_id')
  })

  it('maps every legacy "<category>::<English text>" key to its id', () => {
    for (const s of hospitalBagChecklist) {
      for (const it of s.items) {
        expect(normalizeBagState({ [`${s.category}::${it.text}`]: true })).toEqual({ [it.id]: true })
      }
    }
  })

  it('keeps new id keys, drops unchecked/unknown/garbage', () => {
    expect(normalizeBagState({ mom_id: true, baby_hat: false, nope: true, 'For Mom::Gone item': true }))
      .toEqual({ mom_id: true })
    expect(normalizeBagState(null)).toEqual({})
    expect(normalizeBagState('x')).toEqual({})
  })
})
