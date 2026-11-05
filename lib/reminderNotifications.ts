/**
 * Local alerts for personal reminders — a thin, idempotent reconciler over
 * expo-notifications. The reminder list is the source of truth: after any
 * change (or on load) we schedule every open future reminder under a stable
 * identifier (re-scheduling replaces, so edits move the alert and there are
 * never duplicates) and cancel this journey's alerts the list no longer wants.
 *
 * Never prompts for permission — the composer asks, on a user action, before
 * saving a dated reminder. Without permission this quietly schedules nothing;
 * the reminder itself is always saved.
 */

import type { JourneyMode } from '../types'
import { t } from './i18n'
import {
  cancelLocalNotification,
  getNotificationPermissionStatus,
  listScheduledLocalNotificationIds,
  requestNotificationPermission,
  scheduleLocalNotificationAt,
  type NotificationPermissionStatus,
} from './pushNotifications'
import {
  planReminderAlerts,
  staleReminderIds,
  REMINDER_NOTIF_PREFIX,
  type Reminder,
} from './reminders'

export const REMINDER_CHANNEL_ID = 'reminders'

// One queue for every journey: syncs must not interleave their list → cancel → schedule steps.
let queue: Promise<unknown> = Promise.resolve()
function enqueue<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  const next = queue.then(run, run)
  queue = next.catch(() => {})
  return next.catch(() => fallback)
}

/** Bring this journey's scheduled alerts in line with `list`. */
export function syncReminderNotifications(context: JourneyMode, list: Reminder[]): Promise<void> {
  return enqueue(async () => {
    const planned = planReminderAlerts(context, list, new Date())
    const scheduled = await listScheduledLocalNotificationIds()
    for (const id of staleReminderIds(context, scheduled, planned)) await cancelLocalNotification(id)
    if (planned.length === 0) return
    if ((await getNotificationPermissionStatus()) !== 'granted') return
    const channel = { id: REMINDER_CHANNEL_ID, name: t('wallet_reminders_title') }
    for (const p of planned) {
      await scheduleLocalNotificationAt({
        identifier: p.identifier,
        title: p.reminder.text,
        body: p.reminder.notes?.trim() || t('reminders_notifBody'),
        date: p.fireAt,
        data: { kind: 'user_reminder', context, reminderId: p.reminder.id },
        channel,
      })
    }
  }, undefined)
}

/** Cancel every reminder alert on this device (sign-out: they belong to the account, not the phone). */
export function cancelAllReminderNotifications(): Promise<void> {
  return enqueue(async () => {
    const scheduled = await listScheduledLocalNotificationIds()
    for (const id of scheduled) if (id.startsWith(REMINDER_NOTIF_PREFIX)) await cancelLocalNotification(id)
  }, undefined)
}

/**
 * Ask for notification permission from a user action (saving a dated reminder).
 * Prompts only while undetermined. Resolves to the status after asking.
 */
export async function ensureReminderPermission(): Promise<NotificationPermissionStatus> {
  const status = await getNotificationPermissionStatus()
  if (status !== 'undetermined') return status
  await requestNotificationPermission().catch(() => false)
  return getNotificationPermissionStatus()
}
