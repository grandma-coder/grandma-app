import {
  COUNTRIES,
  POPULAR_COUNTRIES,
  POPULAR_COUNTRY_CODES,
  countryByCode,
  searchCountries,
} from '../countries'

describe('countries', () => {
  it('has a full list (all quick-picks resolve, no dup codes)', () => {
    expect(COUNTRIES.length).toBeGreaterThan(180)
    const codes = COUNTRIES.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length) // no duplicates
    // every curated code exists in the full list
    for (const code of POPULAR_COUNTRY_CODES) {
      expect(codes).toContain(code)
    }
    expect(POPULAR_COUNTRIES.length).toBe(POPULAR_COUNTRY_CODES.length)
  })

  it('empty query returns the curated shortlist', () => {
    expect(searchCountries('')).toBe(POPULAR_COUNTRIES)
    expect(searchCountries('   ')).toBe(POPULAR_COUNTRIES)
  })

  it('finds a country not in the shortlist, by name (case-insensitive)', () => {
    const jp = searchCountries('japan')
    expect(jp.map((c) => c.code)).toContain('JP')
    const jp2 = searchCountries('JAPAN')
    expect(jp2.map((c) => c.code)).toContain('JP')
  })

  it('matches a partial substring across many countries', () => {
    const land = searchCountries('land')
    const names = land.map((c) => c.name)
    expect(names).toEqual(expect.arrayContaining(['Ireland', 'Iceland', 'Finland', 'Poland']))
  })

  it('matches by ISO code', () => {
    expect(searchCountries('kr').map((c) => c.code)).toContain('KR')
  })

  it('returns empty for gibberish', () => {
    expect(searchCountries('zzzzz')).toEqual([])
  })

  it('countryByCode is case-insensitive and safe on nullish', () => {
    expect(countryByCode('us')?.name).toBe('United States')
    expect(countryByCode('US')?.name).toBe('United States')
    expect(countryByCode(undefined)).toBeUndefined()
    expect(countryByCode('ZZ')).toBeUndefined()
  })
})
