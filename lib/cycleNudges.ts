/**
 * Cycle nudge template bank — picks today's headline + body + CTA based on
 * the user's cycle phase.
 *
 * v1 (Slice 1): phase-only. Slice 3 adds log-aware predicates.
 *
 * Each template has:
 *   - headlineKey:  Fraunces serif headline (one italic phrase wrapped in *…*)
 *   - bodyKey:      muted body copy
 *   - pillarId?:    pre-preg pillar id for the "Read more →" CTA
 *   - logShortcut?: log type to open ('bbt' | 'lh' | 'cm' | 'intercourse')
 */

import type { CyclePhase } from './cycleLogic'

export type CycleNudgeTemplate = {
  id: string
  headlineKey: string
  bodyKey: string
  pillarId?: string
  logShortcut?: 'bbt' | 'lh' | 'cm' | 'intercourse'
}

export const CYCLE_NUDGE_TEMPLATES: CycleNudgeTemplate[] = [
  {
    id: 'menstruation-rest',
    headlineKey: 'cycle_nudge_menstruation_headline',
    bodyKey: 'cycle_nudge_menstruation_body',
    pillarId: 'fertility',
  },
  {
    id: 'follicular-energy',
    headlineKey: 'cycle_nudge_follicular_headline',
    bodyKey: 'cycle_nudge_follicular_body',
    pillarId: 'nutrition-prep',
  },
  {
    id: 'ovulation-window',
    headlineKey: 'cycle_nudge_ovulation_headline',
    bodyKey: 'cycle_nudge_ovulation_body',
    pillarId: 'fertility',
  },
  {
    id: 'luteal-care',
    headlineKey: 'cycle_nudge_luteal_headline',
    bodyKey: 'cycle_nudge_luteal_body',
    pillarId: 'emotional-readiness',
  },
]

/** Pick today's nudge for the given phase. Phase-only in Slice 1. */
export function pickCycleNudge(phase: CyclePhase): CycleNudgeTemplate {
  switch (phase) {
    case 'menstruation': return CYCLE_NUDGE_TEMPLATES[0]
    case 'follicular':   return CYCLE_NUDGE_TEMPLATES[1]
    case 'ovulation':    return CYCLE_NUDGE_TEMPLATES[2]
    case 'luteal':       return CYCLE_NUDGE_TEMPLATES[3]
  }
}
