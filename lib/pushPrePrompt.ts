/**
 * pushPrePrompt — when the end-of-onboarding "turn on notifications?" sheet may show.
 *
 * The OS permission prompt is never shown at launch. After a journey onboarding a short sheet
 * explains why notifications help (Allow / Not now); Allow then asks the OS. The sheet only makes
 * sense while the OS hasn't been asked yet ('undetermined'), and "Not now" keeps it away for
 * 14 days (stored on the device). Pure — no React / native imports.
 */
import type { NotificationPermissionStatus } from './pushNotifications'

export const PUSH_PRE_PROMPT_SNOOZE_DAYS = 14

/** When a "Not now" tapped at `now` (ms) stops holding the sheet back. */
export function pushPrePromptSnoozedUntil(now: number): number {
  return now + PUSH_PRE_PROMPT_SNOOZE_DAYS * 86400000
}

export function shouldShowPushPrePrompt(input: {
  permission: NotificationPermissionStatus
  snoozedUntil: number | null
  now: number
}): boolean {
  if (input.permission !== 'undetermined') return false
  return input.snoozedUntil == null || input.now >= input.snoozedUntil
}
