/**
 * Pins the DST-safe day-diff formula used inside components/home/KidsHome.tsx.
 *
 * The naive (end - start) / 86_400_000 + 1 formula breaks across DST: e.g. a
 * 7-day range straddling spring-forward returns 6.
 *
 * Mirroring the helper here so the contract is tested independently of the
 * component file. Keep this in sync if the helper signature changes.
 */

function daysInclusive(start: Date, end: Date): number {
  const s = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const e = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.round((e - s) / 86400000) + 1
}

describe('daysInclusive (DST regression guard)', () => {
  it('returns 1 for the same calendar day', () => {
    const d = new Date(2026, 4, 12)
    expect(daysInclusive(d, d)).toBe(1)
  })

  it('returns 7 for a standard 7-day window', () => {
    const start = new Date(2026, 4, 12)
    const end = new Date(2026, 4, 18)
    expect(daysInclusive(start, end)).toBe(7)
  })

  it('returns 7 across US spring-forward (March 8, 2026)', () => {
    // March 8 2026 is the US spring-forward Sunday. A 7-day window that
    // straddles it has only 6 × 24h + 1 × 23h of wall-clock time, which
    // would round to 6 with the naive ms formula.
    const start = new Date(2026, 2, 5) // Mar 5 2026
    const end = new Date(2026, 2, 11) // Mar 11 2026
    expect(daysInclusive(start, end)).toBe(7)
  })

  it('returns 7 across US fall-back (November 1, 2026)', () => {
    // Nov 1 2026 is the US fall-back Sunday (25h day in ms terms).
    const start = new Date(2026, 9, 29) // Oct 29 2026
    const end = new Date(2026, 10, 4) // Nov 4 2026
    expect(daysInclusive(start, end)).toBe(7)
  })

  it('returns 30 for a 30-day window across DST', () => {
    const start = new Date(2026, 1, 28) // Feb 28
    const end = new Date(2026, 2, 29)   // Mar 29 — spans spring-forward
    expect(daysInclusive(start, end)).toBe(30)
  })
})
