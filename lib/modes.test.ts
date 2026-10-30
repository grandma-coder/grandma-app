import { describe, it, expect } from 'vitest'
import { MODES, FIELDS, fieldStops, isMode } from './modes'

describe('modes', () => {
  it('has exactly the four live modes', () => expect(MODES).toEqual(['pre', 'preg', 'kids', 'meno']))
  it('matches the app diffuseFields', () => {
    expect(FIELDS.meno).toEqual({ g1: '#F5C89A', g2: '#F0B27A', g3: '#E8975A', g4: '#F7DCC0', accent: '#C2703A', accentSoft: '#F7E3D2' })
    expect(fieldStops('preg')).toEqual(['#F8C9A6', '#F2AEC6', '#BDA4E2', '#F8E1B2'])
  })
  it('isMode rejects caregiver and junk', () => {
    expect(isMode('kids')).toBe(true)
    expect(isMode('care')).toBe(false)
    expect(isMode(undefined)).toBe(false)
  })
})
