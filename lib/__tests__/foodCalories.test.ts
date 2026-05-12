import { estimateCalories, matchSingleTag } from '../foodCalories'

describe('estimateCalories', () => {
  it('returns 0 for empty input', () => {
    const result = estimateCalories('')
    expect(result.totalCals).toBe(0)
    expect(result.matches).toEqual([])
  })

  it('returns 0 for whitespace-only input', () => {
    expect(estimateCalories('   ').totalCals).toBe(0)
  })

  it('matches a single known food', () => {
    const result = estimateCalories('apple')
    expect(result.matches.length).toBeGreaterThanOrEqual(1)
    expect(result.totalCals).toBeGreaterThan(0)
  })

  it('does not match "pineapple" when token is "apple" via word boundary', () => {
    // Regression: pineapple contains "apple" as substring — word-boundary regex
    // should prevent the false match.
    const result = estimateCalories('pineapple')
    const matchedNames = result.matches.map((m) => m.food.toLowerCase())
    expect(matchedNames).not.toContain('apple')
  })

  it('sums calories across multiple comma-separated tags', () => {
    const single = estimateCalories('apple')
    const double = estimateCalories('apple, banana')
    expect(double.totalCals).toBeGreaterThanOrEqual(single.totalCals)
    expect(double.matches.length).toBeGreaterThanOrEqual(single.matches.length)
  })

  it('does not double-count the same food repeated', () => {
    const once = estimateCalories('apple')
    const twice = estimateCalories('apple, apple')
    expect(twice.totalCals).toBe(once.totalCals)
  })
})

describe('matchSingleTag', () => {
  it('returns null for unknown food', () => {
    expect(matchSingleTag('xyzzy-not-a-food')).toBeNull()
  })

  it('returns null for empty/whitespace', () => {
    expect(matchSingleTag('')).toBeNull()
    expect(matchSingleTag('   ')).toBeNull()
  })

  it('returns a match with positive calories for a known food', () => {
    const result = matchSingleTag('apple')
    expect(result).not.toBeNull()
    expect(result!.cals).toBeGreaterThan(0)
    expect(result!.category).toBeDefined()
  })
})
