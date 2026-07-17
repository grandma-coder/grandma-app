/**
 * App-lock (Phase 1 / WS2d) — PIN + biometric gate for a shared family device.
 *
 * Superset requirement for grandma.app: partner, nanny, and grandparent often
 * share one phone, so locking the app behind a PIN / Face ID protects a child's
 * medical data and a parent's cycle/pregnancy data. (Flo has this; for us the
 * shared-device case makes it more than a nice-to-have.)
 *
 * Security model:
 *   - The PIN is NEVER stored in plaintext or in a Zustand store. We store a
 *     salted SHA-256 hash in expo-secure-store (Keychain / Keystore).
 *   - expo-secure-store is already a native dep in the current build, so PIN
 *     lock works today. Biometrics need expo-local-authentication, whose native
 *     module resolves at import time — so we probe it defensively (same pattern
 *     as lib/pushNotifications.ts) and it's simply unavailable until the next
 *     EAS rebuild, never a crash.
 */

import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'
import { requireOptionalNativeModule } from 'expo-modules-core'
import type * as LocalAuthType from 'expo-local-authentication'

const PIN_HASH_KEY = 'grandma_app_lock_pin_hash'
const PIN_SALT_KEY = 'grandma_app_lock_pin_salt'

// expo-local-authentication resolves its NATIVE module at import time, so a bare
// top-level import crashes any client that predates the rebuild. Probe first,
// require only when the native side is present — clean no-op otherwise.
let _localAuth: typeof LocalAuthType | null | undefined

function getLocalAuth(): typeof LocalAuthType | null {
  if (_localAuth !== undefined) return _localAuth
  _localAuth = null
  try {
    if (requireOptionalNativeModule('ExpoLocalAuthentication')) {
      _localAuth = require('expo-local-authentication')
    }
  } catch {
    _localAuth = null
  }
  return _localAuth ?? null
}

/** Whether biometric hardware is present AND the native module is available. */
export async function isBiometricAvailable(): Promise<boolean> {
  const LA = getLocalAuth()
  if (!LA) return false
  try {
    const [hasHardware, enrolled] = await Promise.all([
      LA.hasHardwareAsync(),
      LA.isEnrolledAsync(),
    ])
    return hasHardware && enrolled
  } catch {
    return false
  }
}

/** Human label for the available biometric (Face ID / Touch ID / Fingerprint). */
export async function biometricLabel(): Promise<'face' | 'fingerprint' | 'generic' | null> {
  const LA = getLocalAuth()
  if (!LA) return null
  try {
    const types = await LA.supportedAuthenticationTypesAsync()
    if (types.includes(LA.AuthenticationType.FACIAL_RECOGNITION)) return 'face'
    if (types.includes(LA.AuthenticationType.FINGERPRINT)) return 'fingerprint'
    return 'generic'
  } catch {
    return null
  }
}

// The biometric sheet backgrounds the app (inactive → active), which would make
// the foreground re-lock listener fire and re-lock us the instant we unlock.
// This flag lets the AppState listener ignore transitions caused by our own
// prompt. Module-level so the listener (in _layout) can read it.
let _biometricInFlight = false
export function isBiometricInFlight(): boolean {
  return _biometricInFlight
}

/** Prompt the OS biometric sheet. Returns true on success. */
export async function authenticateBiometric(promptMessage: string): Promise<boolean> {
  const LA = getLocalAuth()
  if (!LA) return false
  _biometricInFlight = true
  try {
    const res = await LA.authenticateAsync({
      promptMessage,
      // Shared-device threat model: fall back to the app's OWN PIN pad, NOT the
      // device passcode (which others on a shared family phone may know).
      disableDeviceFallback: true,
      cancelLabel: undefined,
    })
    return res.success === true
  } catch {
    return false
  } finally {
    // Hold the flag briefly past resolution — the inactive→active transition
    // arrives just AFTER authenticateAsync resolves.
    setTimeout(() => { _biometricInFlight = false }, 800)
  }
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`
  )
}

/** Set (or replace) the PIN. Stores only a salted hash in the keychain. */
export async function setPin(pin: string): Promise<void> {
  // A cryptographically-random salt per set so identical PINs hash differently.
  const bytes = await Crypto.getRandomBytesAsync(16)
  const salt = Array.from(bytes).map((x) => x.toString(16).padStart(2, '0')).join('')
  const hash = await hashPin(pin, salt)
  await SecureStore.setItemAsync(PIN_SALT_KEY, salt)
  await SecureStore.setItemAsync(PIN_HASH_KEY, hash)
}

/** Verify an entered PIN against the stored hash. */
export async function verifyPin(pin: string): Promise<boolean> {
  const [salt, stored] = await Promise.all([
    SecureStore.getItemAsync(PIN_SALT_KEY),
    SecureStore.getItemAsync(PIN_HASH_KEY),
  ])
  if (!salt || !stored) return false
  const hash = await hashPin(pin, salt)
  return hash === stored
}

/** True if a PIN has been set. */
export async function hasPin(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_HASH_KEY)
  return !!stored
}

/** Remove the PIN (called when app-lock is disabled). */
export async function clearPin(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PIN_HASH_KEY),
    SecureStore.deleteItemAsync(PIN_SALT_KEY),
  ])
}
