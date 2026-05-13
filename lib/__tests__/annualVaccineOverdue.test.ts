/**
 * Pins the annual-vaccine overdue rule used inside KidsHome.tsx.
 *
 * The schedule uses [monthMin, 999] as a sentinel for annual vaccines
 * (e.g. Influenza [6, 999] = "from 6 months onward, every year"). The
 * naive `ageMonths > monthMax + 1` check meant a child had to be 83
 * years old to be flagged as overdue. We compute overdue against the
 * months-since-last-dose instead.
 *
 * Mirrored from components/home/KidsHome.tsx — keep in sync.
 */

const ANNUAL_OVERDUE_MONTHS = 13

function monthsSince(dateStr: string, now: Date): number {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return Infinity
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
}

type Status = 'done' | 'overdue' | 'upcoming' | 'future'

function annualStatus(opts: {
  ageMonths: number
  monthMin: number
  doseCount: number
  lastGivenDate?: string
  now?: Date
}): Status {
  const { ageMonths, monthMin, doseCount, lastGivenDate, now = new Date() } = opts
  if (ageMonths < monthMin - 2) return 'future'
  if (doseCount === 0) return ageMonths > monthMin + 2 ? 'overdue' : 'upcoming'
  const monthsSinceLast = lastGivenDate ? monthsSince(lastGivenDate, now) : Infinity
  if (monthsSinceLast >= ANNUAL_OVERDUE_MONTHS) return 'overdue'
  if (monthsSinceLast >= 11) return 'upcoming'
  return 'future'
}

describe('annual vaccine overdue logic', () => {
  const now = new Date(2026, 4, 12)

  it('is "future" when the child is too young (more than 2mo below min)', () => {
    expect(annualStatus({ ageMonths: 3, monthMin: 6, doseCount: 0, now })).toBe('future')
  })

  it('enters the eligibility window 2mo before monthMin', () => {
    expect(annualStatus({ ageMonths: 4, monthMin: 6, doseCount: 0, now })).toBe('upcoming')
  })

  it('is "upcoming" at the eligibility window with no doses', () => {
    expect(annualStatus({ ageMonths: 6, monthMin: 6, doseCount: 0, now })).toBe('upcoming')
    expect(annualStatus({ ageMonths: 8, monthMin: 6, doseCount: 0, now })).toBe('upcoming')
  })

  it('is "overdue" past eligibility with no doses (was the original bug)', () => {
    expect(annualStatus({ ageMonths: 12, monthMin: 6, doseCount: 0, now })).toBe('overdue')
    expect(annualStatus({ ageMonths: 60, monthMin: 6, doseCount: 0, now })).toBe('overdue')
  })

  it('is "future" within the safe window after a recent dose', () => {
    const lastGivenDate = '2025-11-12'
    expect(annualStatus({ ageMonths: 24, monthMin: 6, doseCount: 1, lastGivenDate, now })).toBe('future')
  })

  it('is "upcoming" 11 months after the last dose', () => {
    const lastGivenDate = '2025-06-12'
    expect(annualStatus({ ageMonths: 24, monthMin: 6, doseCount: 1, lastGivenDate, now })).toBe('upcoming')
  })

  it('is "overdue" 13+ months after the last dose', () => {
    const lastGivenDate = '2025-04-12'
    expect(annualStatus({ ageMonths: 24, monthMin: 6, doseCount: 1, lastGivenDate, now })).toBe('overdue')
  })
})
