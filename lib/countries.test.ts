import { describe, it, expect } from 'vitest'
import { countryFromGeo } from './countries'

describe('countryFromGeo', () => {
  it('uppercases any ISO alpha-2 code', () => {
    expect(countryFromGeo('br')).toBe('BR')
    expect(countryFromGeo('DE')).toBe('DE')
    expect(countryFromGeo(' fr ')).toBe('FR')
  })
  it('falls back to OTHER for malformed or missing values', () => {
    expect(countryFromGeo('xx1')).toBe('OTHER')
    expect(countryFromGeo('USA')).toBe('OTHER')
    expect(countryFromGeo('')).toBe('OTHER')
    expect(countryFromGeo(null)).toBe('OTHER')
    expect(countryFromGeo(undefined)).toBe('OTHER')
  })
})
