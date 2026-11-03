// Sleep/activity durations are stored as "45m", "1h 30m", "8h" (KidsLogForms calcDuration).
// Readers used parseFloat, so a 45-minute nap counted as 45 hours and "2h" of play as 2 minutes.
import { parseDurationMinutes } from '../kidsHandoff'

describe('parseDurationMinutes', () => {
  it('reads the stored h/m strings', () => {
    expect(parseDurationMinutes('45m')).toBe(45)
    expect(parseDurationMinutes('1h 30m')).toBe(90)
    expect(parseDurationMinutes('8h')).toBe(480)
  })

  it('treats a bare legacy number as hours by default, minutes when asked', () => {
    expect(parseDurationMinutes('7.5')).toBe(450)
    expect(parseDurationMinutes(30, 'm')).toBe(30)
  })

  it('returns null for empty or junk input', () => {
    expect(parseDurationMinutes('')).toBeNull()
    expect(parseDurationMinutes(undefined)).toBeNull()
    expect(parseDurationMinutes('soon')).toBeNull()
  })
})
