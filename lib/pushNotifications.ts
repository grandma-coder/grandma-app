/**
 * Push + local notifications foundation (Phase 0 / B3).
 *
 * This is the app-side engine a future internal "command center" will drive:
 *   - Registers each device's Expo push token → `push_tokens` table (the center
 *     reads these to send remote push).
 *   - Reads/writes the user's 7 notification prefs from `profiles.notification_prefs`
 *     (server-readable so both local scheduling AND server sends respect them).
 *   - Schedules on-device local notifications for the schedulable prefs
 *     (daily log reminder, weekly summary) so reminders fire even with no server.
 *
 * Remote push delivery (server → device when the app is closed, e.g. care-circle
 * updates) is sent from the command center via the Expo Push API using the tokens
 * this module registers. That send layer is a later phase.
 */

import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { requireOptionalNativeModule } from 'expo-modules-core'
import { supabase } from './supabase'
import type * as NotificationsType from 'expo-notifications'
import type * as DeviceType from 'expo-device'

// expo-notifications / expo-device resolve their NATIVE modules at import time,
// so a bare top-level `import` crashes any client that doesn't have them in the
// binary (e.g. an old dev client before an EAS rebuild). We probe for the native
// module with requireOptionalNativeModule (returns null instead of throwing),
// and only require the JS wrapper when the native side is actually present. So
// on an un-rebuilt client this is a clean no-op — no throw, no red error logs.
// Once the app is rebuilt with the config plugin, everything resolves normally.
let _notifs: typeof NotificationsType | null | undefined
let _device: typeof DeviceType | null | undefined

function getNotifs(): typeof NotificationsType | null {
  if (_notifs !== undefined) return _notifs
  _notifs = null
  try {
    // ExpoPushTokenManager is one of expo-notifications' native modules; if it's
    // absent, importing the package throws — so probe first, then require. Both
    // steps are guarded so nothing here can ever throw into a caller.
    if (requireOptionalNativeModule('ExpoPushTokenManager')) {
      _notifs = require('expo-notifications')
    }
  } catch {
    _notifs = null
  }
  return _notifs ?? null
}

function getDevice(): typeof DeviceType | null {
  if (_device !== undefined) return _device
  _device = null
  try {
    if (requireOptionalNativeModule('ExpoDevice')) {
      _device = require('expo-device')
    }
  } catch {
    _device = null
  }
  return _device ?? null
}

/** True only on a real device with the native module available. */
function isRealDevice(): boolean {
  return getDevice()?.isDevice === true
}

// ─── Preferences ───────────────────────────────────────────────────────────

export interface NotificationPrefs {
  daily_reminder: boolean
  daily_reminder_time: string // "HH:MM" 24h
  insights: boolean
  weekly_summary: boolean
  appointments: boolean
  cycle_predictions: boolean
  milestones: boolean
  care_circle: boolean
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  daily_reminder: true,
  daily_reminder_time: '20:00',
  insights: true,
  weekly_summary: false,
  appointments: true,
  cycle_predictions: true,
  milestones: false,
  care_circle: true,
}

/** Read prefs from profiles.notification_prefs, falling back to defaults. */
export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return DEFAULT_NOTIFICATION_PREFS
  const { data } = await supabase
    .from('profiles')
    .select('notification_prefs')
    .eq('id', session.user.id)
    .single()
  const stored = (data as { notification_prefs?: Partial<NotificationPrefs> } | null)?.notification_prefs
  return { ...DEFAULT_NOTIFICATION_PREFS, ...(stored ?? {}) }
}

/** Persist prefs, then re-sync local scheduling to match. Returns success. */
export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false
  const { error } = await supabase
    .from('profiles')
    .update({ notification_prefs: prefs })
    .eq('id', session.user.id)
  if (error) return false
  // Keep on-device schedule in lockstep with the saved prefs.
  await syncLocalSchedules(prefs)
  return true
}

// ─── Permission + token registration ───────────────────────────────────────

/** Ask for notification permission. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isRealDevice()) return false // simulators can't get a push token
  const Notifications = getNotifs()
  if (!Notifications) return false
  const { status: existing } = await Notifications.getPermissionsAsync()
  let status = existing
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync()
    status = req.status
  }
  return status === 'granted'
}

function easProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  )
}

/**
 * Register this device's Expo push token into `push_tokens` (idempotent upsert).
 * Safe to call on every launch/login. No-op on simulators or when permission is
 * denied. The command center reads these rows to send remote push.
 */
export async function registerPushToken(): Promise<string | null> {
  try {
    if (!isRealDevice()) return null
    const Notifications = getNotifs()
    const Device = getDevice()
    if (!Notifications || !Device) return null
    const granted = await requestNotificationPermission()
    if (!granted) return null

    const projectId = easProjectId()
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    )
    const token = tokenResp.data
    if (!token) return null

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    await supabase.from('push_tokens').upsert(
      {
        user_id: session.user.id,
        token,
        platform: Platform.OS,
        device_name: Device.deviceName ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    )
    return token
  } catch {
    // Best-effort — never block app launch on push registration.
    return null
  }
}

// ─── Local scheduling ──────────────────────────────────────────────────────
//
// We tag every locally-scheduled notification with an identifier so we can
// cancel + reschedule idempotently when prefs change. Only prefs that are
// time-based + schedulable on-device live here; event-driven ones (insights,
// appointments, cycle predictions, care-circle) are delivered by the
// server/command center via remote push.

const LOCAL_IDS = {
  dailyReminder: 'local-daily-reminder',
  weeklySummary: 'local-weekly-summary',
} as const

function parseTime(hhmm: string): { hour: number; minute: number } {
  const [h, m] = (hhmm || '20:00').split(':').map((n) => parseInt(n, 10))
  return {
    hour: Number.isFinite(h) ? Math.max(0, Math.min(23, h)) : 20,
    minute: Number.isFinite(m) ? Math.max(0, Math.min(59, m)) : 0,
  }
}

async function cancelById(identifier: string): Promise<void> {
  try {
    await getNotifs()?.cancelScheduledNotificationAsync(identifier)
  } catch {
    // not scheduled — fine
  }
}

/**
 * Reconcile on-device scheduled notifications with the given prefs. Cancels then
 * (re)schedules the daily reminder + weekly summary based on their toggles.
 * Idempotent — safe to call whenever prefs change or on launch.
 */
export async function syncLocalSchedules(prefs: NotificationPrefs): Promise<void> {
  if (!isRealDevice()) return
  const Notifications = getNotifs()
  if (!Notifications) return

  try {
    // Daily log reminder
    await cancelById(LOCAL_IDS.dailyReminder)
    if (prefs.daily_reminder) {
      const { hour, minute } = parseTime(prefs.daily_reminder_time)
      await Notifications.scheduleNotificationAsync({
        identifier: LOCAL_IDS.dailyReminder,
        content: {
          title: 'Time to check in 🌿',
          body: 'Log today so Grandma can keep your insights fresh.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      })
    }

    // Weekly summary — Sunday at 9:00 (weekday 1 = Sunday in expo-notifications)
    await cancelById(LOCAL_IDS.weeklySummary)
    if (prefs.weekly_summary) {
      await Notifications.scheduleNotificationAsync({
        identifier: LOCAL_IDS.weeklySummary,
        content: {
          title: 'Your week with Grandma 📖',
          body: 'See this week\'s activity and what to focus on next.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 1,
          hour: 9,
          minute: 0,
        },
      })
    }
  } catch {
    // Native module unavailable (old dev client pre-rebuild) — prefs still
    // persist to the DB; scheduling resumes once the app is rebuilt.
  }
}

// ─── Open tracking (feeds the command center's Push → Analytics funnel) ──────
//
// The command center stamps each remote push's data payload with an opaque
// `recipientId`. When the user taps the notification, we POST that id to the
// `notification-opened` edge function, which marks the recipient opened + bumps
// the campaign's opened_count. Best-effort + idempotent (only the first tap
// counts, server-side). Never blocks or throws into the app.

async function reportNotificationOpen(data: unknown): Promise<void> {
  try {
    const recipientId = (data as { recipientId?: unknown } | null)?.recipientId
    if (typeof recipientId !== 'string' || !recipientId) return
    await supabase.functions.invoke('notification-opened', { body: { recipientId } })
  } catch {
    // best-effort — analytics must never affect the tap's navigation
  }
}

let openTrackingSet = false

/**
 * Report notification taps for analytics: a live listener for taps while the app
 * is running, plus a one-shot check for the notification that cold-launched the
 * app. Guarded + lazy so a missing native module can't crash launch. Idempotent
 * — safe to call once from initNotifications().
 */
function registerOpenTracking(): void {
  if (openTrackingSet) return
  const Notifications = getNotifs()
  if (!Notifications) return
  try {
    // Live taps (foreground/background, app already running).
    Notifications.addNotificationResponseReceivedListener((response) => {
      void reportNotificationOpen(response.notification.request.content.data)
    })
    // Cold start: the tap that launched the app isn't delivered to the listener.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) void reportNotificationOpen(response.notification.request.content.data)
      })
      .catch(() => {})
    openTrackingSet = true
  } catch {
    // native module unavailable — degrade silently
  }
}

let handlerSet = false

/**
 * Set how notifications present while the app is foregrounded. Guarded + lazy so
 * a missing native module (e.g. running an old dev client before an EAS rebuild)
 * never crashes the app at launch.
 */
function ensureForegroundHandler(): void {
  if (handlerSet) return
  const Notifications = getNotifs()
  if (!Notifications) return
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    })
    handlerSet = true
  } catch {
    // native module unavailable — degrade silently
  }
}

/**
 * One-shot bootstrap: set the foreground handler, register the push token, and
 * sync local schedules from the user's saved prefs. Call after auth is ready.
 * Never throws — if the native module is missing (old dev client), it no-ops.
 */
export async function initNotifications(): Promise<void> {
  try {
    ensureForegroundHandler()
    registerOpenTracking()
    await registerPushToken()
    const prefs = await getNotificationPrefs()
    await syncLocalSchedules(prefs)
  } catch {
    // best-effort
  }
}
