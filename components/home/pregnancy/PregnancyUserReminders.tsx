/**
 * PregnancyUserReminders — pregnancy entry point for the shared UserReminders.
 *
 * The full implementation lives in components/home/UserReminders (mode-agnostic,
 * parameterized by `context`). This wrapper preserves the existing import path
 * and pins context to pregnancy — the storage key stays
 * `grandma-reminders-pregnancy-${userId}`, so existing reminders are untouched.
 */
import { UserReminders } from '../UserReminders'

interface Props {
  userId: string | null
  bare?: boolean
}

export function PregnancyUserReminders({ userId, bare }: Props) {
  return <UserReminders userId={userId} context="pregnancy" bare={bare} />
}
