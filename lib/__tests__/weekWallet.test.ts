import { buildWalletCards } from '../weekWallet'
import type { StandardAppointment } from '../pregnancyAppointments'
import type { TodayLogEntry } from '../analyticsData'

const appt = {
  id: 'anatomy', week: 20, name: 'Anatomy Scan', type: 'ultrasound',
  description: '', prepNote: 'x', whatToExpect: '', questions: [],
} satisfies StandardAppointment

const loggedKick: TodayLogEntry = { value: '10', notes: null, created_at: '2026-07-11' }

describe('buildWalletCards', () => {
  test('week 12, no appt, no tip → essentials, reminders, exams, birth_guide, ask_grandma', () => {
    const ids = buildWalletCards({
      weekNumber: 12, todayLogs: {}, hasWeekTip: false, upcomingAppointment: null,
    }).map((c) => c.id)
    expect(ids).toEqual(['essentials', 'reminders', 'exams', 'birth_guide', 'ask_grandma'])
  })

  test('appointment + tip appear in order at the top', () => {
    const ids = buildWalletCards({
      weekNumber: 20, todayLogs: {}, hasWeekTip: true, upcomingAppointment: appt,
    }).map((c) => c.id)
    expect(ids).toEqual(['essentials', 'appointment', 'week_tip', 'reminders', 'exams', 'birth_guide', 'ask_grandma'])
  })

  test('reminders card is always present and expandable (not linkOnly)', () => {
    const cards = buildWalletCards({
      weekNumber: 12, todayLogs: {}, hasWeekTip: false, upcomingAppointment: null,
    })
    const rem = cards.find((c) => c.id === 'reminders')!
    expect(rem).toBeDefined()
    expect(rem.linkOnly).toBe(false)
  })

  test('kicks appears at week 28 when not logged, hidden once logged', () => {
    const base = { weekNumber: 30, hasWeekTip: false, upcomingAppointment: null }
    const withKicks = buildWalletCards({ ...base, todayLogs: {} }).map((c) => c.id)
    expect(withKicks).toContain('kicks')
    const logged = buildWalletCards({ ...base, todayLogs: { kick_count: loggedKick } }).map((c) => c.id)
    expect(logged).not.toContain('kicks')
  })

  test('kicks hidden before week 28', () => {
    const ids = buildWalletCards({
      weekNumber: 27, todayLogs: {}, hasWeekTip: false, upcomingAppointment: null,
    }).map((c) => c.id)
    expect(ids).not.toContain('kicks')
  })

  test('ask_grandma, birth_guide and exams are linkOnly, reminders is not', () => {
    const cards = buildWalletCards({
      weekNumber: 20, todayLogs: {}, hasWeekTip: false, upcomingAppointment: null,
    })
    const byId = Object.fromEntries(cards.map((c) => [c.id, c]))
    expect(byId['ask_grandma'].linkOnly).toBe(true)
    expect(byId['birth_guide'].linkOnly).toBe(true)
    expect(byId['exams'].linkOnly).toBe(true)
    expect(byId['reminders'].linkOnly).toBe(false)
  })

  test('appointment card carries its payload and tone', () => {
    const cards = buildWalletCards({
      weekNumber: 20, todayLogs: {}, hasWeekTip: false, upcomingAppointment: appt,
    })
    const a = cards.find((c) => c.id === 'appointment')!
    expect(a.appointment?.name).toBe('Anatomy Scan')
    expect(a.tone).toBe('yellow')
  })
})
