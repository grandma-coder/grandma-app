import { matchCard } from '../matcher'
import type { DailyCard } from '../types'

// Deterministic rng: always pick index 0 of the top tier.
const first = () => 0

describe('matchCard', () => {
  it('returns a card sharing the most tags', () => {
    const c = matchCard(['tired', 'reassurance'], 'pregnancy', { rng: first })
    expect(c.tags).toEqual(expect.arrayContaining(['reassurance']))
  })
  it('falls back to a same-mode card when no tag overlaps', () => {
    const c = matchCard([], 'pregnancy', { rng: first })
    expect(c.mode).toBe('pregnancy')
    expect(c).toBeTruthy()
  })
  it('never returns an excluded card when alternatives exist', () => {
    const a = matchCard(['reassurance'], 'pregnancy', { rng: first })
    const b = matchCard(['reassurance'], 'pregnancy', { exclude: [a.id], rng: first })
    expect(b.id).not.toBe(a.id)
  })
  it('never returns null', () => {
    expect(matchCard(['wonder'], 'pregnancy', { rng: first })).toBeTruthy()
  })
})
