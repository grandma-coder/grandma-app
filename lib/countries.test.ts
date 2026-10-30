import { describe, it, expect } from 'vitest'
import { COUNTRIES, countryFromGeo } from './countries'

describe('countryFromGeo', () => {
  it('lists the launch countries', () => expect(COUNTRIES).toEqual(['BR', 'US', 'OTHER']))
  it('maps BR and US case-insensitively', () => {
    expect(countryFromGeo('BR', 'en')).toBe('BR')
    expect(countryFromGeo('us', 'pt')).toBe('US')
  })
  it('maps any other country to OTHER', () => expect(countryFromGeo('DE', 'pt')).toBe('OTHER'))
  it('falls back by locale when the header is missing', () => {
    expect(countryFromGeo(null, 'pt')).toBe('BR')
    expect(countryFromGeo('', 'en')).toBe('OTHER')
    expect(countryFromGeo(undefined, 'en')).toBe('OTHER')
  })
})
