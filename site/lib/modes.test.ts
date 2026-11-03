import { describe, it, expect } from 'vitest'
import { MODES, isMode } from './modes'

describe('modes', () => {
  it('has exactly the four live modes', () => expect(MODES).toEqual(['pre', 'preg', 'kids', 'meno']))
  it('isMode rejects caregiver and junk', () => {
    expect(isMode('kids')).toBe(true)
    expect(isMode('care')).toBe(false)
    expect(isMode(undefined)).toBe(false)
  })
})
