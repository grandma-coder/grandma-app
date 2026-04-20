/**
 * profileStatus — mode-aware subtitle generator used in ProfileHero.
 *
 * Pure functions that read from Zustand stores at call time
 * and return a short human-readable status line.
 */

import { getCycleInfo, toDateStr } from './cycleLogic'
import { useChildStore } from '../store/useChildStore'
import { usePregnancyStore } from '../store/usePregnancyStore'
import type { Behavior } from '../store/useBehaviorStore'

function formatAge(birthDate: string | undefined | null): string {
  if (!birthDate) return ''
  const born = new Date(birthDate)
  if (Number.isNaN(born.getTime())) return ''
  const now = new Date()
  const months =
    (now.getFullYear() - born.getFullYear()) * 12 +
    (now.getMonth() - born.getMonth())
  if (months < 1) return 'newborn'
  if (months < 12) return `${months}m`
  const y = Math.floor(months / 12)
  const m = months % 12
  return m > 0 ? `${y}y ${m}m` : `${y}y`
}

export function getCycleSubtitle(): string {
  const d = new Date()
  d.setDate(d.getDate() - 10)
  const info = getCycleInfo({
    lastPeriodStart: toDateStr(d),
    cycleLength: 28,
    periodLength: 5,
  })
  return `Day ${info.cycleDay} · ${info.phaseLabel}`
}

export function getPregnancySubtitle(): string {
  const week = usePregnancyStore.getState().weekNumber ?? 24
  const dueDate = usePregnancyStore.getState().dueDate
  if (!dueDate) return `Week ${week}`
  const due = new Date(dueDate + 'T00:00:00')
  const dueFmt = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `Week ${week} · due ${dueFmt}`
}

export function getKidsSubtitle(): string {
  const children = useChildStore.getState().children
  if (children.length === 0) return 'No children added'
  const active = useChildStore.getState().activeChild
  const child = active ?? children[0]
  const age = formatAge(child.birthDate)
  return age ? `${child.name} · ${age} old` : child.name
}

export function getSubtitleFor(behavior: Behavior): string {
  switch (behavior) {
    case 'pre-pregnancy':
      return getCycleSubtitle()
    case 'pregnancy':
      return getPregnancySubtitle()
    case 'kids':
      return getKidsSubtitle()
  }
}
