/**
 * pillarAdaptive — picks the subset of a pillar's tips that are most relevant
 * "right now" based on the user's cycle phase / pregnancy week / child age.
 *
 * The hook returns two arrays: `forYou` (tagged + matching) and `general`
 * (everything else, including all untagged tips). The pillar screen renders
 * them as separate sections.
 */

import { useEffect, useState } from 'react'
import type { PillarTip, PillarId } from '../types'
import { useCycleHistory } from './cycleAnalytics'
import { getCycleInfo, toDateStr, type CycleConfig } from './cycleLogic'
import { useChildStore } from '../store/useChildStore'
import { usePregnancyStore } from '../store/usePregnancyStore'
import { splitTips, type AdaptiveContext } from './pillarTipSplit'

export { splitTips }
export type { AdaptiveContext }

const PRE_PREG_IDS = new Set<string>([
  'fertility',
  'nutrition-prep',
  'emotional-readiness',
  'financial-planning',
  'partner-journey',
  'health-checkups',
])

const PREG_IDS = new Set<string>([
  'week-by-week',
  'symptoms-relief',
  'birth-planning',
  'breastfeeding-prep',
  'baby-gear',
  'partner-support',
  'postpartum-prep',
  'pregnancy-nutrition',
  'emotional-wellness',
])

const KIDS_IDS = new Set<string>([
  'milk', 'food', 'nutrition', 'vaccines', 'clothes',
  'recipes', 'habits', 'medicine', 'milestones',
])

export interface PillarTipBuckets {
  forYou: PillarTip[]
  general: PillarTip[]
  context: AdaptiveContext
  /** Human-readable label shown on the "For you" section header. */
  contextLabel: string | null
}

/**
 * Returns the adaptive split of a pillar's tips. Renders nothing special when
 * there's no context (e.g. no cycle history yet) — all tips go to `general`.
 */
export function usePillarTipBuckets(
  pillarId: PillarId,
  tips: PillarTip[],
): PillarTipBuckets {
  const context = useAdaptiveContext(pillarId)
  const cycleDay = context.cycleDay ?? 1
  const { forYou, general } = splitTips(tips, context, cycleDay)
  const contextLabel = buildContextLabel(pillarId, context)

  return { forYou, general, context, contextLabel }
}

function buildContextLabel(pillarId: PillarId, ctx: AdaptiveContext): string | null {
  if (PRE_PREG_IDS.has(pillarId) && ctx.cyclePhase && ctx.cycleDay) {
    const phase = ctx.cyclePhase
    const label =
      phase === 'menstruation' ? 'Menstrual phase'
      : phase === 'follicular' ? 'Follicular phase'
      : phase === 'ovulation' ? 'Ovulation window'
      : 'Luteal phase'
    return `${label} · day ${ctx.cycleDay}`
  }
  if (PREG_IDS.has(pillarId) && ctx.pregnancyWeek) {
    return `Week ${ctx.pregnancyWeek}`
  }
  if (KIDS_IDS.has(pillarId) && ctx.childAgeMonths !== undefined) {
    if (ctx.childAgeMonths < 24) return `${ctx.childAgeMonths} months old`
    const years = Math.floor(ctx.childAgeMonths / 12)
    return `${years} year${years === 1 ? '' : 's'} old`
  }
  return null
}

// ─── Context source ────────────────────────────────────────────────────────

function useAdaptiveContext(pillarId: PillarId): AdaptiveContext {
  const cycle = useCycleContext(PRE_PREG_IDS.has(pillarId))
  const preg = usePregnancyContext(PREG_IDS.has(pillarId))
  const kids = useKidsContext(KIDS_IDS.has(pillarId))
  return { ...cycle, ...preg, ...kids }
}

function useCycleContext(enabled: boolean): AdaptiveContext {
  const { data: history } = useCycleHistory()
  if (!enabled) return {}
  const latest = history?.cycles[history.cycles.length - 1]
  if (!latest) return {}
  const cfg: CycleConfig = {
    lastPeriodStart: latest.startDate,
    cycleLength: history?.avg ?? 28,
    periodLength: 5,
    lutealPhase: 14,
  }
  const info = getCycleInfo(cfg, toDateStr(new Date()))
  return { cyclePhase: info.phase, cycleDay: info.cycleDay }
}

function usePregnancyContext(enabled: boolean): AdaptiveContext {
  const week = usePregnancyStore((s) => s.weekNumber)
  if (!enabled) return {}
  return week ? { pregnancyWeek: week } : {}
}

function useKidsContext(enabled: boolean): AdaptiveContext {
  const activeChild = useChildStore((s) => s.activeChild)
  if (!enabled) return {}
  if (!activeChild?.birthDate) return {}
  const d = new Date(activeChild.birthDate)
  if (isNaN(d.getTime())) return {}
  const now = new Date()
  const months = Math.max(
    0,
    (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()),
  )
  return { childAgeMonths: months }
}
