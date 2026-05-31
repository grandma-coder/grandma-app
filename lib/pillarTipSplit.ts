/**
 * Pure tip-splitting logic for pillar screens — no React, no Supabase, no
 * stores. Kept dependency-free so it is unit-testable without booting the app
 * graph. `usePillarTipBuckets` (in pillarAdaptive.ts) supplies the live context.
 */

import type { PillarTip } from '../types'
import type { CyclePhase } from './cycleLogic'
import { sliceForCycleDay } from './cyclePhaseRotation'

export interface AdaptiveContext {
  cyclePhase?: CyclePhase
  cycleDay?: number
  pregnancyWeek?: number
  childAgeMonths?: number
}

/** Does this tip apply to the current adaptive context? */
export function matchesContext(tip: PillarTip, ctx: AdaptiveContext): boolean {
  // Cycle phase
  if (tip.phases && tip.phases.length > 0) {
    if (!ctx.cyclePhase) return false
    return tip.phases.includes(ctx.cyclePhase)
  }
  // Pregnancy week
  if (tip.weekRange) {
    if (ctx.pregnancyWeek === undefined) return false
    const [min, max] = tip.weekRange
    return ctx.pregnancyWeek >= min && ctx.pregnancyWeek <= max
  }
  // Kids age (months)
  if (tip.ageMonthsRange) {
    if (ctx.childAgeMonths === undefined) return false
    const [min, max] = tip.ageMonthsRange
    return ctx.childAgeMonths >= min && ctx.childAgeMonths <= max
  }
  return false
}

/**
 * `forYou` is a daily slice of the phase-matching pool (rotated by cycleDay);
 * everything else goes to `general` so the full tip library stays browsable
 * under "All tips". Daily rotation is a pre-pregnancy (cycle) concept — for
 * pregnancy/kids pillars (no cycle phase) `forYou` keeps the prior behavior of
 * surfacing all matching tips.
 */
export function splitTips(
  tips: PillarTip[],
  context: AdaptiveContext,
  cycleDay: number,
  sliceCount = 2,
): { forYou: PillarTip[]; general: PillarTip[] } {
  const matching = tips.filter((tip) => matchesContext(tip, context))
  const forYou = context.cyclePhase
    ? sliceForCycleDay(matching, cycleDay, sliceCount)
    : matching
  const forYouSet = new Set(forYou)
  const general = tips.filter((tip) => !forYouSet.has(tip))
  return { forYou, general }
}
