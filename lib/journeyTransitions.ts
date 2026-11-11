/**
 * Journey transitions — pure rules for moving between journeys:
 *
 *   • Baby arrived (pregnancy → kids): when to offer it, which birth dates are
 *     plausible, and when pregnancy-timed notifications stop ("week 42 forever").
 *   • Positive pregnancy test (cycle → pregnancy): what counts as positive, when
 *     to offer pregnancy tracking (once per test log), and which LMP to prefill.
 *   • Ending a journey: which on-device alerts belong to it.
 *
 * No React, no Supabase — side effects live in lib/journeyTransitionActions.ts.
 */

import type { Behavior } from '../store/useBehaviorStore'
import { getCurrentWeekFromDueDate } from './pregnancyData'
import { parseLocalDate } from './localDate'
import { reminderNotificationPrefix } from './reminders'
import { PERIOD_REMINDER_ID } from './cycleReminders'

/** "Baby arrived" is offered from this completed week on (term). */
export const BABY_ARRIVED_MIN_WEEK = 37
/** Earliest plausible birth: the start of week 22 of this pregnancy. */
export const EARLIEST_BIRTH_WEEK = 22
/** Pregnancy-timed nudges stop at 42w0d — two weeks past the due date. */
export const STOP_PREGNANCY_NOTIFS_DAYS_PAST_DUE = 14

const DAY_MS = 86_400_000

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(d: Date, days: number): Date {
  // Calendar days (not ms) so a DST change can't shift the result by a day.
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)
}

function isIsoDay(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseLocalDate(s).getTime())
}

// ─── Baby arrived ────────────────────────────────────────────────────────────

/** Whole calendar days since the due date: negative before it, 0 on it. */
export function daysPastDue(dueDate: string, now: Date = new Date()): number {
  const due = parseLocalDate(dueDate)
  return Math.round((startOfDay(now).getTime() - startOfDay(due).getTime()) / DAY_MS)
}

export function isPastDueDate(dueDate: string | null | undefined, now: Date = new Date()): boolean {
  if (!dueDate || !isIsoDay(dueDate)) return false
  return daysPastDue(dueDate, now) > 0
}

/** Offer "Baby arrived" from week 37 on — including past the due date / week 42. */
export function canOfferBabyArrived(dueDate: string | null | undefined, now: Date = new Date()): boolean {
  if (!dueDate || !isIsoDay(dueDate)) return false
  return getCurrentWeekFromDueDate(dueDate, now) >= BABY_ARRIVED_MIN_WEEK
}

export interface BirthDateBounds {
  /** Earliest allowed birth date, YYYY-MM-DD. */
  min: string
  /** Latest allowed birth date (today), YYYY-MM-DD. */
  max: string
}

/**
 * Birth date bounds: not in the future, not before week 22 of this pregnancy
 * (due date − (40 − 22) × 7 days). Without a due date, one year back.
 */
export function birthDateBounds(dueDate: string | null | undefined, now: Date = new Date()): BirthDateBounds {
  const today = startOfDay(now)
  const max = toIso(today)
  if (!dueDate || !isIsoDay(dueDate)) {
    return { min: toIso(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())), max }
  }
  const earliest = addDays(parseLocalDate(dueDate), -(40 - EARLIEST_BIRTH_WEEK) * 7)
  // A due date far in the future must still leave today selectable.
  return { min: earliest.getTime() > today.getTime() ? max : toIso(earliest), max }
}

export function isBirthDateAllowed(date: string, bounds: BirthDateBounds): boolean {
  if (!isIsoDay(date)) return false
  return date >= bounds.min && date <= bounds.max
}

/** Week milestones, due-date countdowns, kick and "quiet" nudges stop at 42w0d. */
export function pregnancyTimedNotificationsAllowed(dueDate: string | null | undefined, now: Date = new Date()): boolean {
  if (!dueDate || !isIsoDay(dueDate)) return true
  return daysPastDue(dueDate, now) < STOP_PREGNANCY_NOTIFS_DAYS_PAST_DUE
}

export interface JourneyNotificationGates {
  /** Run the pregnancy generator at all (journey enrolled). */
  pregnancy: boolean
  /** Pregnancy-timed nudges (milestones, due date, kicks, quiet) — off past 42 weeks. */
  pregnancyTimed: boolean
  /** Run the cycle generator (journey enrolled). */
  cycle: boolean
}

/** Which journey notification generators may run on this device. */
export function journeyNotificationGates(
  enrolled: readonly Behavior[],
  dueDate: string | null | undefined,
  now: Date = new Date(),
): JourneyNotificationGates {
  const pregnancy = enrolled.includes('pregnancy')
  return {
    pregnancy,
    pregnancyTimed: pregnancy && pregnancyTimedNotificationsAllowed(dueDate, now),
    cycle: enrolled.includes('pre-pregnancy'),
  }
}

// ─── Ending a journey ────────────────────────────────────────────────────────

/**
 * The scheduled local alerts that belong to `behavior`: its personal reminders
 * (`reminder-<journey>-…`) and, for cycle, the period reminder. Account-wide
 * schedules (daily log reminder, weekly summary) are never included.
 */
export function journeyAlertIdsToCancel(behavior: Behavior, scheduledIds: readonly string[]): string[] {
  const prefix = reminderNotificationPrefix(behavior)
  return scheduledIds.filter((id) =>
    id.startsWith(prefix) || (behavior === 'pre-pregnancy' && id === PERIOD_REMINDER_ID),
  )
}

// ─── Positive pregnancy test ─────────────────────────────────────────────────

/** Only a clear positive result offers pregnancy tracking (a faint line may be a retest). */
export function isPositivePregnancyTest(value: string | null | undefined): boolean {
  return value === 'positive'
}

/** A test log is one row per user + day (the form replaces the day's result). */
export function positiveTestKey(userId: string, date: string): string {
  return `${userId}:${date}`
}

export function shouldOfferPregnancyFromTest(input: {
  value: string | null | undefined
  pregnancyEnrolled: boolean
  prompted: readonly string[]
  key: string
}): boolean {
  return isPositivePregnancyTest(input.value) && !input.pregnancyEnrolled && !input.prompted.includes(input.key)
}

/** Last logged period start on or before the test day (the LMP to prefill). */
export function lmpFromPeriodStarts(periodStarts: readonly string[], testDate: string): string | null {
  let best: string | null = null
  for (const d of periodStarts) {
    if (!isIsoDay(d) || d > testDate) continue
    if (best === null || d > best) best = d
  }
  return best
}

// ─── Baby prefill ────────────────────────────────────────────────────────────

export type ChildSex = 'male' | 'female' | 'other' | ''

/** profiles.birth_preferences.babySex ('Boy' | 'Girl' | 'Other' | 'Not revealed') → children.sex. */
export function childSexFromBabySex(babySex: string | null | undefined): ChildSex {
  switch (babySex) {
    case 'Boy': return 'male'
    case 'Girl': return 'female'
    case 'Other': return 'other'
    default: return ''
  }
}

/** children.name is required; an empty name gets a placeholder the parent can edit later. */
export function resolveBabyName(name: string | null | undefined, fallback: string): string {
  const trimmed = (name ?? '').trim()
  return trimmed || fallback
}
