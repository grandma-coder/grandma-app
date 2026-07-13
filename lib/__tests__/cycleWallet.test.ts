import { buildCycleWalletCards } from '../cycleWallet'

describe('buildCycleWalletCards', () => {
  test('returns nudge, mood, pillars in order (today lifted to standalone card)', () => {
    const ids = buildCycleWalletCards().map((c) => c.id)
    expect(ids).toEqual(['nudge', 'mood', 'pillars'])
  })

  test('all cards are expandable (not link-only)', () => {
    const cards = buildCycleWalletCards()
    expect(cards.every((c) => c.linkOnly === false)).toBe(true)
  })
})
