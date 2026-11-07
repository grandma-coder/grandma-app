import { describe, it, expect } from 'vitest'
import { countryFromGeo, placeFromGeo } from './countries'

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
  it('maps placeholder codes (unknown XX / ZZ, Tor T1) and non-letters to OTHER', () => {
    expect(countryFromGeo('XX')).toBe('OTHER')
    expect(countryFromGeo('xx')).toBe('OTHER')
    expect(countryFromGeo('ZZ')).toBe('OTHER')
    expect(countryFromGeo('T1')).toBe('OTHER')
    expect(countryFromGeo('A1')).toBe('OTHER')
    expect(countryFromGeo('1')).toBe('OTHER')
    expect(countryFromGeo('B-')).toBe('OTHER')
  })
})

describe('placeFromGeo', () => {
  it('keeps the subdivision code and decodes the city', () => {
    expect(placeFromGeo('sp', 'S%C3%A3o%20Paulo')).toEqual({ region: 'SP', city: 'São Paulo' })
    expect(placeFromGeo('RJ', 'Rio de Janeiro')).toEqual({ region: 'RJ', city: 'Rio de Janeiro' })
  })
  it('drops malformed or missing parts on their own', () => {
    expect(placeFromGeo(null, undefined)).toEqual({ region: null, city: null })
    expect(placeFromGeo('S-P', '%E0%A4%A')).toEqual({ region: null, city: null })
    expect(placeFromGeo('ABCD', 'x'.repeat(81))).toEqual({ region: null, city: null })
    expect(placeFromGeo('', ' Lisboa ')).toEqual({ region: null, city: 'Lisboa' })
    expect(placeFromGeo('11', 'a%0Ab')).toEqual({ region: '11', city: 'ab' })
  })
})
