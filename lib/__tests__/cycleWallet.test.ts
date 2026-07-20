import { buildCycleWalletCards } from '../cycleWallet'

describe('buildCycleWalletCards', () => {
  test('returns essentials, reminders, pillars, memories, exams', () => {
    const ids = buildCycleWalletCards().map((c) => c.id)
    expect(ids).toEqual(['essentials', 'reminders', 'pillars', 'memories', 'exams'])
  })

  test('every card taps to a pop-up / route (link-only, no inline expand)', () => {
    const cards = buildCycleWalletCards()
    expect(cards.every((c) => c.linkOnly === true)).toBe(true)
  })
})
