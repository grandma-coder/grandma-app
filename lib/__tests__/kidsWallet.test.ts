import { buildKidsWalletCards } from '../kidsWallet'

describe('buildKidsWalletCards', () => {
  test('no diaper, no leap → goals, health, exams, reminders, ask_grandma, rewards', () => {
    const ids = buildKidsWalletCards({ hasDiaper: false, hasGrowthLeap: false }).map((c) => c.id)
    expect(ids).toEqual(['goals', 'health', 'exams', 'reminders', 'ask_grandma', 'rewards'])
  })

  test('diaper + leap appear in order after health/exams', () => {
    const ids = buildKidsWalletCards({ hasDiaper: true, hasGrowthLeap: true }).map((c) => c.id)
    expect(ids).toEqual(['goals', 'health', 'exams', 'diaper', 'growth_leap', 'reminders', 'ask_grandma', 'rewards'])
  })

  test('growth_leap + reminders expand inline; the rest are link-only', () => {
    const cards = buildKidsWalletCards({ hasDiaper: true, hasGrowthLeap: true })
    const byId = Object.fromEntries(cards.map((c) => [c.id, c]))
    expect(byId['goals'].linkOnly).toBe(true)
    expect(byId['health'].linkOnly).toBe(true)
    expect(byId['diaper'].linkOnly).toBe(true)
    expect(byId['ask_grandma'].linkOnly).toBe(true)
    expect(byId['rewards'].linkOnly).toBe(true)
    expect(byId['growth_leap'].linkOnly).toBe(false)
    expect(byId['reminders'].linkOnly).toBe(false)
  })
})
