/**
 * appLockAttempts — wrong-PIN throttling for the app lock. Pure (no React / native imports);
 * lib/appLock persists the state in the keychain so killing the app doesn't reset it.
 *
 *   failures 1–4 → no wait
 *   5–6          → 30 s lockout after each mistake
 *   7–8          → 1 min
 *   9            → 5 min
 *   10           → sign out (clears the PIN and the account's local data)
 *
 * A correct PIN or a biometric unlock resets the count.
 */

export interface PinAttempts {
  failures: number
  /** Epoch ms until which the pad stays locked; null when not locked. */
  lockedUntil: number | null
}

export const NO_PIN_ATTEMPTS: PinAttempts = { failures: 0, lockedUntil: null }

/** The mistake that signs out. */
export const MAX_PIN_ATTEMPTS = 10

const TIERS: readonly { from: number; ms: number }[] = [
  { from: 9, ms: 5 * 60_000 },
  { from: 7, ms: 60_000 },
  { from: 5, ms: 30_000 },
]

/** Lockout that follows the `failures`-th wrong PIN (0 = none). */
export function lockoutMsAfter(failures: number): number {
  return TIERS.find((tier) => failures >= tier.from)?.ms ?? 0
}

export function recordPinFailure(state: PinAttempts, now: number): { state: PinAttempts; signOut: boolean } {
  const failures = state.failures + 1
  const ms = lockoutMsAfter(failures)
  return {
    state: { failures, lockedUntil: ms > 0 ? now + ms : null },
    signOut: failures >= MAX_PIN_ATTEMPTS,
  }
}

/**
 * Milliseconds left in the current lockout (0 = the pad is open). Capped at the tier's own length
 * so a clock set backwards can't turn 30 s into an hour.
 */
export function lockoutRemainingMs(state: PinAttempts, now: number): number {
  if (state.lockedUntil == null) return 0
  const left = state.lockedUntil - now
  if (left <= 0) return 0
  return Math.min(left, lockoutMsAfter(state.failures) || left)
}

/** Wrong PINs still allowed before the sign-out. */
export function attemptsLeft(state: PinAttempts): number {
  return Math.max(0, MAX_PIN_ATTEMPTS - state.failures)
}

/** Read the persisted JSON; anything malformed counts as a clean slate. */
export function parsePinAttempts(raw: string | null | undefined): PinAttempts {
  if (!raw) return NO_PIN_ATTEMPTS
  try {
    const v = JSON.parse(raw) as Partial<PinAttempts>
    if (typeof v.failures !== 'number' || !Number.isFinite(v.failures) || v.failures < 0) return NO_PIN_ATTEMPTS
    const lockedUntil = typeof v.lockedUntil === 'number' && Number.isFinite(v.lockedUntil) ? v.lockedUntil : null
    return { failures: Math.floor(v.failures), lockedUntil }
  } catch {
    return NO_PIN_ATTEMPTS
  }
}
