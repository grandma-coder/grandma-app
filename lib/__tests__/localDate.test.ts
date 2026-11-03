import { parseLocalDate } from '../localDate'

describe('parseLocalDate', () => {
  it('reads a bare day as local midnight (not UTC midnight)', () => {
    const d = parseLocalDate('2026-11-01')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 1, 0])
  })

  it('leaves full timestamps alone', () => {
    expect(parseLocalDate('2026-11-01T12:30:00Z').toISOString()).toBe('2026-11-01T12:30:00.000Z')
  })
})
