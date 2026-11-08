/**
 * profileStatus — mode-aware subtitle generator used in ProfileHero.
 *
 * Pure functions that read from Zustand stores at call time and return a short
 * human-readable, localized status line. Cycle data lives in React Query (not a
 * store), so the caller passes today's real cycle info in — never a placeholder
 * cycle (the old version invented "Day 11" from a period 10 days ago).
 */

import { parseLocalDate } from './localDate'
import { useChildStore } from '../store/useChildStore'
import { usePregnancyStore } from '../store/usePregnancyStore'
import { getCurrentWeekFromDueDate } from './pregnancyData'
import type { Behavior } from '../store/useBehaviorStore'
import { dateLoc } from './kpLocale'
import { t } from './i18n'

function formatAge(birthDate: string | undefined | null): string {
  if (!birthDate) return ''
  const born = parseLocalDate(birthDate)
  if (Number.isNaN(born.getTime())) return ''
  const now = new Date()
  const months =
    (now.getFullYear() - born.getFullYear()) * 12 +
    (now.getMonth() - born.getMonth())
  if (months < 1) return t('profile_sub_newborn')
  if (months < 12) return t('profile_sub_ageMonths', { m: months })
  const y = Math.floor(months / 12)
  const m = months % 12
  return m > 0 ? t('profile_sub_ageYearsMonths', { y, m }) : t('profile_sub_ageYears', { y })
}

/** Today's cycle position, from the same config the Home ring uses. null = no period logged yet. */
export interface CycleSubtitleInput {
  cycleDay: number
  phaseLabel: string
}

export function getCycleSubtitle(info: CycleSubtitleInput | null | undefined): string {
  if (!info || info.cycleDay < 1) return t('profile_sub_cycleNoPeriod')
  return t('profile_sub_cycleDay', { day: info.cycleDay, phase: info.phaseLabel })
}

export function getPregnancySubtitle(): string {
  const dueDate = usePregnancyStore.getState().dueDate
  const storedWeek = usePregnancyStore.getState().weekNumber
  if (!dueDate) return t('app_settings_weekN', { n: storedWeek ?? 1 })
  const week = getCurrentWeekFromDueDate(dueDate)
  const due = new Date(dueDate + 'T00:00:00')
  const dueFmt = due.toLocaleDateString(dateLoc(), { month: 'short', day: 'numeric' })
  return t('profile_sub_weekDue', { n: week, date: dueFmt })
}

export function getKidsSubtitle(): string {
  const children = useChildStore.getState().children
  if (children.length === 0) return t('profile_sub_noChildren')
  const active = useChildStore.getState().activeChild
  const child = active ?? children[0]
  const age = formatAge(child.birthDate)
  return age ? t('profile_sub_childAge', { name: child.name, age }) : child.name
}

export function getSubtitleFor(behavior: Behavior, cycle?: CycleSubtitleInput | null): string {
  switch (behavior) {
    case 'pre-pregnancy':
      return getCycleSubtitle(cycle)
    case 'pregnancy':
      return getPregnancySubtitle()
    case 'kids':
      return getKidsSubtitle()
    // Menopause foundation (U1): no dedicated subtitle helper yet (E1 later
    // tasks add the home surface). Neutral placeholder keeps the switch total.
    case 'menopause':
      return ''
  }
}
