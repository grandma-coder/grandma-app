import { isFutureDate, assertNotFuture, FutureDateError } from '../futureDate'

describe('future-date guard', () => {
  it('compares calendar days', () => {
    expect(isFutureDate('2026-11-04', '2026-11-03')).toBe(true)
    expect(isFutureDate('2026-11-03', '2026-11-03')).toBe(false)
    expect(isFutureDate('2026-10-01', '2026-11-03')).toBe(false)
  })

  it('throws for a future day and passes today', () => {
    expect(() => assertNotFuture('2999-01-01')).toThrow(FutureDateError)
    expect(() => assertNotFuture('2000-01-01')).not.toThrow()
  })
})
