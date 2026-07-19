import { buildKidsWalletCards } from '../kidsWallet'
import { buildWalletCards } from '../weekWallet'
import { buildCycleWalletCards } from '../cycleWallet'
import type { StandardAppointment } from '../pregnancyAppointments'

const minimalAppt = {
  id: 'anatomy', week: 20, name: 'Anatomy Scan', type: 'ultrasound',
  description: '', prepNote: '', whatToExpect: '', questions: [],
} satisfies StandardAppointment

describe('essentials card in wallet builders', () => {
  it('kids wallet includes essentials as the first card', () => {
    const cards = buildKidsWalletCards({ hasDiaper: false, hasGrowthLeap: false })
    const ids = cards.map((c) => c.id)
    expect(ids).toContain('essentials')
    expect(ids[0]).toBe('essentials')
  })

  it('pregnancy wallet includes essentials as the first card', () => {
    const cards = buildWalletCards({
      weekNumber: 12, todayLogs: {}, hasWeekTip: false, upcomingAppointment: null,
    })
    const ids = cards.map((c) => c.id)
    expect(ids).toContain('essentials')
    expect(ids[0]).toBe('essentials')
  })

  it('cycle wallet includes essentials as the first card', () => {
    const cards = buildCycleWalletCards()
    const ids = cards.map((c) => c.id)
    expect(ids).toContain('essentials')
    expect(ids[0]).toBe('essentials')
  })
})
