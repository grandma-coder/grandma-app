import { minSignupAge, ageOn, isMinor, latestAllowedDob } from '../ageRules'

const NOW = new Date(2026, 10, 9) // 9 Nov 2026

test('minimum sign-up age is 16 in the EU/EEA, UK and Canada, 13 elsewhere', () => {
  for (const r of ['DE', 'FR', 'PT', 'ES', 'IE', 'NO', 'IS', 'GB', 'CA']) expect(minSignupAge(r)).toBe(16)
  for (const r of ['US', 'BR', 'MX', 'AR', 'AU', 'IN', null, undefined]) expect(minSignupAge(r as never)).toBe(13)
  expect(minSignupAge('de')).toBe(16)
})

test('age counts whole years and respects the birthday', () => {
  expect(ageOn('2008-11-09', NOW)).toBe(18)
  expect(ageOn('2008-11-10', NOW)).toBe(17)
  expect(ageOn('1990-01-01', NOW)).toBe(36)
})

test('minors are under 18; unknown birth date is not treated as a minor', () => {
  expect(isMinor('2010-05-01', NOW)).toBe(true)
  expect(isMinor('2008-11-09', NOW)).toBe(false)
  expect(isMinor(null, NOW)).toBe(false)
  expect(isMinor('garbage', NOW)).toBe(false)
})

test('latest allowed birth date matches the region minimum', () => {
  expect(latestAllowedDob('US', NOW)).toEqual(new Date(2013, 10, 9))
  expect(latestAllowedDob('FR', NOW)).toEqual(new Date(2010, 10, 9))
})
