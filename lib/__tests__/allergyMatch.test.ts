/**
 * Mirrors the allergen-matching rule used in FeedingForm.detectAllergenMatches.
 * Both sides are case-folded and matching uses substring containment so
 * "peanut" matches "peanut butter".
 *
 * The shape is intentionally permissive: a false positive shows a confirm
 * dialog the user can dismiss, while a missed allergen could be a serious
 * medical event.
 */

function matchAllergies(
  allergies: string[],
  foodStrings: string[],
): string[] {
  if (!allergies.length || !foodStrings.length) return []
  const haystack = foodStrings.join(' ').toLowerCase()
  return allergies.filter((a) => {
    const needle = a.trim().toLowerCase()
    if (!needle) return false
    return haystack.includes(needle)
  })
}

describe('allergen substring matching', () => {
  it('matches an exact known allergen', () => {
    expect(matchAllergies(['peanut'], ['peanut'])).toEqual(['peanut'])
  })

  it('matches when the allergen is a substring of the food', () => {
    expect(matchAllergies(['peanut'], ['Peanut Butter Sandwich'])).toEqual(['peanut'])
  })

  it('matches multiple allergens at once', () => {
    expect(matchAllergies(
      ['peanut', 'milk', 'wheat'],
      ['Peanut butter on wheat bread'],
    )).toEqual(['peanut', 'wheat'])
  })

  it('is case-insensitive in both directions', () => {
    expect(matchAllergies(['PEANUT'], ['peanut butter'])).toEqual(['PEANUT'])
    expect(matchAllergies(['peanut'], ['PEANUT BUTTER'])).toEqual(['peanut'])
  })

  it('returns empty when no allergen appears', () => {
    expect(matchAllergies(['peanut'], ['apple', 'banana'])).toEqual([])
  })

  it('returns empty when there are no allergies or no foods', () => {
    expect(matchAllergies([], ['anything'])).toEqual([])
    expect(matchAllergies(['peanut'], [])).toEqual([])
  })

  it('ignores blank allergens', () => {
    expect(matchAllergies(['', '   ', 'milk'], ['oat milk'])).toEqual(['milk'])
  })
})
