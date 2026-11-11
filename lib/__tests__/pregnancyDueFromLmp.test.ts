// A timezone with DST, so the 280 days from LMP to due date can cross a clock change.
process.env.TZ = 'America/New_York'

import { dueDateFromLmp, getCurrentWeekFromDueDate } from '../pregnancyData'

describe('dueDateFromLmp (Naegele: LMP + 280 days)', () => {
  it('adds 280 calendar days when the window crosses the autumn clock change', () => {
    // 2026-04-01 + 280 days = 2027-01-06. Adding 280×24h of ms lands on 2027-01-05 23:00 local.
    expect(dueDateFromLmp('2026-04-01')).toBe('2027-01-06')
  })
  it('adds 280 calendar days when the window crosses the spring clock change', () => {
    expect(dueDateFromLmp('2026-01-01')).toBe('2026-10-08')
  })
  it('LMP today puts her at week 1 (clamped from 0), never week 2', () => {
    const now = new Date(2026, 3, 1, 12)
    expect(getCurrentWeekFromDueDate(dueDateFromLmp('2026-04-01'), now)).toBe(1)
  })
  it('garbage input returns empty string', () => {
    expect(dueDateFromLmp('nope')).toBe('')
  })
})
