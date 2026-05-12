import { toDateStr } from '../cycleLogic'

describe('toDateStr', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    const d = new Date(2026, 4, 11) // May 11 2026 (month is 0-indexed)
    expect(toDateStr(d)).toBe('2026-05-11')
  })

  it('zero-pads single-digit months and days', () => {
    const d = new Date(2026, 0, 3) // Jan 3 2026
    expect(toDateStr(d)).toBe('2026-01-03')
  })

  it('uses local time, not UTC (regression guard)', () => {
    // 2026-05-11 23:30 local in any negative-UTC timezone would be 2026-05-12 in UTC.
    // toDateStr MUST return the local date so evening logs don't shift to "tomorrow".
    const localEvening = new Date(2026, 4, 11, 23, 30, 0)
    expect(toDateStr(localEvening)).toBe('2026-05-11')
  })
})
