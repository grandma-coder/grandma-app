/**
 * Pins calcDuration's contract for the two call modes:
 *   - sleep (allowOvernight = true): a 22:00 → 06:00 pair wraps to 8h
 *   - activity (allowOvernight = false): a reversed pair returns '' so
 *     the UI doesn't silently save a 23-hour playtime
 *
 * Mirrored from components/calendar/KidsLogForms.tsx — keep in sync.
 */

function calcDuration(start: string, end: string, allowOvernight = true): string {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => !Number.isFinite(n))) return ''
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins === 0) return ''
  if (mins < 0) {
    if (!allowOvernight) return ''
    mins += 24 * 60
  }
  if (mins >= 60) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${mins}m`
}

describe('calcDuration', () => {
  it('formats whole hours', () => {
    expect(calcDuration('09:00', '11:00')).toBe('2h')
  })

  it('formats hours and minutes', () => {
    expect(calcDuration('09:00', '11:30')).toBe('2h 30m')
  })

  it('formats sub-hour durations in minutes', () => {
    expect(calcDuration('09:00', '09:45')).toBe('45m')
  })

  it('wraps around midnight in sleep mode (allowOvernight=true)', () => {
    // 22:00 → 06:00 = 8h overnight sleep
    expect(calcDuration('22:00', '06:00', true)).toBe('8h')
  })

  it('returns empty string for reversed times in activity mode', () => {
    // The user typo'd; do not silently save a 23-hour playtime.
    expect(calcDuration('10:00', '09:00', false)).toBe('')
  })

  it('returns empty string when start equals end', () => {
    expect(calcDuration('10:00', '10:00')).toBe('')
  })

  it('returns empty string for blank inputs', () => {
    expect(calcDuration('', '10:00')).toBe('')
    expect(calcDuration('10:00', '')).toBe('')
  })

  it('returns empty string for malformed inputs (NaN guard)', () => {
    expect(calcDuration('abc', '10:00')).toBe('')
    expect(calcDuration('10:00', 'xx:yy')).toBe('')
  })
})
