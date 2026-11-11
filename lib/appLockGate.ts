import type { AppStateStatus } from 'react-native'

/**
 * App-lock re-lock decision for one AppState change. Only a real trip to 'background' re-locks:
 * 'inactive' alone is a permission alert, the purchase sheet, Control Center or the app switcher
 * peek, and locking on those put the PIN screen up in the middle of a purchase.
 * `backgrounded` carries over between calls (true once 'background' was seen, until 'active').
 */
export function appLockTransition(backgrounded: boolean, next: AppStateStatus): { backgrounded: boolean; lock: boolean } {
  if (next === 'background') return { backgrounded: true, lock: false }
  if (next === 'active') return { backgrounded: false, lock: backgrounded }
  return { backgrounded, lock: false }
}
