/**
 * Period reminder: a local "Your period may start soon" notification, N days
 * (1–3, default 2) before the estimated next period, at 9:00 local time.
 *
 *   1. Pure planning (tested): cycle config + settings + now → fire date or null.
 *   2. Thin scheduler: cancel the previous reminder by a stable identifier, then
 *      schedule the new one. Never prompts for permission (no-op if not granted).
 *   3. useCycleReminderSync(): re-plans when the cycle config / settings /
 *      language change and on app foreground, while Cycle is an enrolled journey.
 *
 * Wording: always an estimate ("Grandma's estimate"), never "safe days", no
 * fertile-window/ovulation reminder here (docs/compliance/2026-11-02-regras-saude.md).
 */

import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { getCycleInfo, toDateStr, type CycleConfig } from './cycleLogic'
import { useCycleHistory, type CycleHistory } from './cycleAnalytics'
import { cancelLocalNotification, scheduleLocalNotificationAt } from './pushNotifications'
import { t } from './i18n'
import { useLanguageStore } from '../store/useLanguageStore'
import { useBehaviorStore } from '../store/useBehaviorStore'
import { useCycleSettingsStore, type ReminderDaysBefore } from '../store/useCycleSettingsStore'

export const PERIOD_REMINDER_ID = 'local-cycle-period-reminder'
export const PERIOD_REMINDER_CHANNEL = 'cycle-reminders'
export const PERIOD_REMINDER_HOUR = 9
export const DEFAULT_REMINDER_DAYS_BEFORE: ReminderDaysBefore = 2

// ─── Pure planning ────────────────────────────────────────────────────────────

export interface PeriodReminderSettings {
  enabled: boolean
  daysBefore: number
}

export interface PeriodReminderPlan {
  /** Local date/time the notification fires. Always after `now`. */
  fireAt: Date
  /** Estimated period start this reminder is about (YYYY-MM-DD). */
  periodDate: string
  daysBefore: ReminderDaysBefore
}

/** The subset of useCycleSettingsStore the planner reads. */
export interface ReminderSettingsState {
  cycleLength: number | null
  periodLength: number
  lutealPhase: number
  periodReminder: boolean | null
  periodReminderDaysBefore: number
}

function clampDaysBefore(n: number): ReminderDaysBefore {
  if (!Number.isFinite(n)) return DEFAULT_REMINDER_DAYS_BEFORE
  return Math.min(3, Math.max(1, Math.round(n))) as ReminderDaysBefore
}

/** YYYY-MM-DD shifted by `days`, at `hour`:00 local time. */
function localDateAt(dateStr: string, days: number, hour: number): Date {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10))
  return new Date(y, m - 1, d + days, hour, 0, 0, 0)
}

/** Default: ON for users with cycle history, unless they chose otherwise. */
export function resolvePeriodReminderEnabled(pref: boolean | null | undefined, hasHistory: boolean): boolean {
  return pref ?? hasHistory
}

/**
 * Same derivation as CycleHome: declared cycle length → measured average → 28,
 * anchored on the latest logged period. undefined = history still loading,
 * null = loaded but no period logged (no fake "today − 10" anchor here).
 */
export function buildReminderCycleConfig(
  history: Pick<CycleHistory, 'cycles' | 'avg'> | undefined,
  settings: Pick<ReminderSettingsState, 'cycleLength' | 'periodLength' | 'lutealPhase'>,
): CycleConfig | null | undefined {
  if (!history) return undefined
  const latest = history.cycles[history.cycles.length - 1]
  if (!latest) return null
  return {
    lastPeriodStart: latest.startDate,
    cycleLength: settings.cycleLength ?? history.avg ?? 28,
    periodLength: settings.periodLength,
    lutealPhase: settings.lutealPhase,
  }
}

/**
 * Next reminder: `daysBefore` days before the estimated next period, at 9:00
 * local. If that moment has already passed this cycle, roll to the following
 * estimated period. null when disabled or there is no cycle history.
 */
export function planPeriodReminder(
  config: Partial<CycleConfig> | null | undefined,
  settings: PeriodReminderSettings,
  now: Date,
): PeriodReminderPlan | null {
  if (!settings.enabled || !config?.lastPeriodStart) return null
  const daysBefore = clampDaysBefore(settings.daysBefore)
  const info = getCycleInfo(config, toDateStr(now))
  let periodDate = info.nextPeriodDate
  // nextPeriodDate is ≥ tomorrow and cycleLength ≥ 21 > 3, so the second
  // candidate is always in the future; the bound just keeps this obviously finite.
  for (let i = 0; i < 2; i++) {
    const fireAt = localDateAt(periodDate, -daysBefore, PERIOD_REMINDER_HOUR)
    if (fireAt.getTime() > now.getTime()) return { fireAt, periodDate, daysBefore }
    periodDate = toDateStr(localDateAt(periodDate, info.cycleLength, 0))
  }
  return null
}

/** Full plan straight from the cycle history + settings store state. */
export function computePeriodReminderPlan(
  history: Pick<CycleHistory, 'cycles' | 'avg'> | undefined,
  settings: ReminderSettingsState,
  now: Date,
): PeriodReminderPlan | null {
  const config = buildReminderCycleConfig(history, settings)
  const enabled = resolvePeriodReminderEnabled(settings.periodReminder, !!history?.cycles.length)
  return planPeriodReminder(config, { enabled, daysBefore: settings.periodReminderDaysBefore }, now)
}

/** Localized notification copy. */
export function periodReminderContent(daysBefore: number): { title: string; body: string } {
  const days = clampDaysBefore(daysBefore)
  return {
    title: t('cycleReminder_title'),
    body: days === 1 ? t('cycleReminder_bodyOne') : t('cycleReminder_body', { days }),
  }
}

// ─── Scheduler (thin wrapper over expo-notifications) ─────────────────────────

// Serialize cancel → schedule so overlapping syncs (store change + foreground)
// can't interleave. The stable identifier also makes a re-schedule a replace.
let queue: Promise<unknown> = Promise.resolve()

/**
 * Cancel the current period reminder, then schedule `plan` (if any). Never
 * prompts: returns false when permission isn't granted or the module is absent.
 */
export function syncPeriodReminder(plan: PeriodReminderPlan | null): Promise<boolean> {
  const run = async (): Promise<boolean> => {
    await cancelLocalNotification(PERIOD_REMINDER_ID)
    if (!plan) return false
    const { title, body } = periodReminderContent(plan.daysBefore)
    return scheduleLocalNotificationAt({
      identifier: PERIOD_REMINDER_ID,
      title,
      body,
      date: plan.fireAt,
      data: { kind: 'cycle_period_reminder', periodDate: plan.periodDate },
      channel: { id: PERIOD_REMINDER_CHANNEL, name: t('cycleSettings_reminderLabel') },
    })
  }
  const next = queue.then(run, run)
  queue = next.catch(() => {})
  return next.catch(() => false)
}

/** Re-plan from the current settings store state (used by the settings screen). */
export function resyncPeriodReminder(history: Pick<CycleHistory, 'cycles' | 'avg'> | undefined): Promise<boolean> {
  if (!history) return Promise.resolve(false)
  const plan = computePeriodReminderPlan(history, useCycleSettingsStore.getState(), new Date())
  return syncPeriodReminder(plan)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Keep the period reminder in sync. Mount once (CycleHome). Re-plans when the
 * latest period / cycle settings / reminder prefs / language change, and when
 * the app returns to the foreground. Inert while history or stores are loading,
 * when Cycle isn't an enrolled journey, or when `disabled` (caregiver viewing
 * someone else's cycle — never schedule their reminder on this device).
 */
export function useCycleReminderSync({ disabled = false }: { disabled?: boolean } = {}): void {
  const { data: history } = useCycleHistory()
  const cycleLength = useCycleSettingsStore((s) => s.cycleLength)
  const periodLength = useCycleSettingsStore((s) => s.periodLength)
  const lutealPhase = useCycleSettingsStore((s) => s.lutealPhase)
  const periodReminder = useCycleSettingsStore((s) => s.periodReminder)
  const daysBefore = useCycleSettingsStore((s) => s.periodReminderDaysBefore)
  const settingsHydrated = useCycleSettingsStore((s) => s.hydrated)
  const cycleEnrolled = useBehaviorStore((s) => s.hydrated && s.enrolledBehaviors.includes('pre-pregnancy'))
  const language = useLanguageStore((s) => s.language)

  const settings: ReminderSettingsState = { cycleLength, periodLength, lutealPhase, periodReminder, periodReminderDaysBefore: daysBefore }
  const config = buildReminderCycleConfig(history, settings)
  const active = !disabled && settingsHydrated && cycleEnrolled && config !== undefined

  // Latest inputs for the foreground listener (avoids a stale closure).
  const latest = useRef({ history, settings })
  latest.current = { history, settings }

  // Primitive key: useCycleHistory() returns a fresh object every render.
  const key = active
    ? [config?.lastPeriodStart ?? '', config?.cycleLength ?? '', periodLength, lutealPhase, periodReminder, daysBefore, language].join('|')
    : null

  useEffect(() => {
    if (key === null) return
    const sync = () => {
      const { history: h, settings: s } = latest.current
      void syncPeriodReminder(computePeriodReminderPlan(h, s, new Date()))
    }
    sync()
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync()
    })
    return () => sub.remove()
  }, [key])
}
