import { msUntilNextLocalMidnight } from '../../hooks/useTodayKey'

describe('msUntilNextLocalMidnight', () => {
  it('counts to the next local midnight, not 24h blocks', () => {
    const now = new Date(2026, 10, 10, 23, 30, 0, 0)
    expect(msUntilNextLocalMidnight(now)).toBe(30 * 60 * 1000)
  })
  it('a moment after midnight waits for the following one', () => {
    const now = new Date(2026, 10, 10, 0, 0, 1, 0)
    expect(msUntilNextLocalMidnight(now)).toBe(24 * 3600 * 1000 - 1000)
  })
})
