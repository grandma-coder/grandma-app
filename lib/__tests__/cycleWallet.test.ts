import { buildCycleWalletCards } from '../cycleWallet'

describe('buildCycleWalletCards', () => {
  test('returns mood, pillars in order (today → quick-log card, nudge → Daily Message)', () => {
    const ids = buildCycleWalletCards().map((c) => c.id)
    expect(ids).toEqual(['mood', 'pillars'])
  })

  test('all cards are expandable (not link-only)', () => {
    const cards = buildCycleWalletCards()
    expect(cards.every((c) => c.linkOnly === false)).toBe(true)
  })
})
