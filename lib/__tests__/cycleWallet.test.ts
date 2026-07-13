import { buildCycleWalletCards } from '../cycleWallet'

describe('buildCycleWalletCards', () => {
  test('returns only pillars (today → quick-log, nudge → Daily Message, mood → Today card)', () => {
    const ids = buildCycleWalletCards().map((c) => c.id)
    expect(ids).toEqual(['pillars'])
  })

  test('all cards are expandable (not link-only)', () => {
    const cards = buildCycleWalletCards()
    expect(cards.every((c) => c.linkOnly === false)).toBe(true)
  })
})
