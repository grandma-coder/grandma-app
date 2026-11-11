// PIN brute force: 5 wrong → 30 s lockout, 7 → 1 min, 9 → 5 min, 10 → sign out. The state is
// persisted so killing the app doesn't reset it; a biometric or PIN success resets it.
import {
  MAX_PIN_ATTEMPTS, NO_PIN_ATTEMPTS, lockoutMsAfter, lockoutRemainingMs, parsePinAttempts,
  recordPinFailure, attemptsLeft,
} from '../appLockAttempts'

const T0 = 1_800_000_000_000
const fail = (n: number, now = T0) => {
  let s = NO_PIN_ATTEMPTS
  let r = recordPinFailure(s, now)
  for (let i = 1; i < n; i++) { s = r.state; r = recordPinFailure(s, now) }
  return r
}

describe('lockout tiers', () => {
  it('no lockout for the first four mistakes', () => {
    for (const n of [1, 2, 3, 4]) expect(lockoutMsAfter(n)).toBe(0)
    expect(fail(4).state.lockedUntil).toBeNull()
  })
  it('30 s from the 5th, 1 min from the 7th, 5 min from the 9th', () => {
    expect(lockoutMsAfter(5)).toBe(30_000)
    expect(lockoutMsAfter(6)).toBe(30_000)
    expect(lockoutMsAfter(7)).toBe(60_000)
    expect(lockoutMsAfter(8)).toBe(60_000)
    expect(lockoutMsAfter(9)).toBe(300_000)
    expect(fail(5).state.lockedUntil).toBe(T0 + 30_000)
    expect(fail(7).state.lockedUntil).toBe(T0 + 60_000)
    expect(fail(9).state.lockedUntil).toBe(T0 + 300_000)
  })
  it('the 10th mistake signs out', () => {
    expect(MAX_PIN_ATTEMPTS).toBe(10)
    expect(fail(9).signOut).toBe(false)
    expect(fail(10).signOut).toBe(true)
  })
  it('attempts left before sign-out', () => {
    expect(attemptsLeft(fail(5).state)).toBe(5)
    expect(attemptsLeft(fail(9).state)).toBe(1)
  })
})

describe('lockoutRemainingMs', () => {
  const s = fail(5).state
  it('counts down and ends', () => {
    expect(lockoutRemainingMs(s, T0)).toBe(30_000)
    expect(lockoutRemainingMs(s, T0 + 10_000)).toBe(20_000)
    expect(lockoutRemainingMs(s, T0 + 30_000)).toBe(0)
  })
  it('a clock moved backwards can\'t stretch the wait past the tier', () => {
    expect(lockoutRemainingMs(s, T0 - 3_600_000)).toBe(30_000)
  })
})

describe('persisted state', () => {
  it('round-trips and survives junk', () => {
    const s = fail(6).state
    expect(parsePinAttempts(JSON.stringify(s))).toEqual(s)
    expect(parsePinAttempts(null)).toEqual(NO_PIN_ATTEMPTS)
    expect(parsePinAttempts('nope')).toEqual(NO_PIN_ATTEMPTS)
    expect(parsePinAttempts('{"failures":"x"}')).toEqual(NO_PIN_ATTEMPTS)
  })
})
