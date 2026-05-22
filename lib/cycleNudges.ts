/**
 * Cycle nudge template bank — picks today's headline + body + CTA based on
 * the user's cycle context (phase + logged signals).
 *
 * v1 (Slice 1): phase-only switch.
 * v3 (Slice 3): log-aware predicates — reads BBT/LH/CM/mood + BBT-shift.
 *
 * Each template has:
 *   - headlineKey:  Fraunces serif headline (one italic phrase wrapped in *…*)
 *   - bodyKey:      muted body copy
 *   - pillarId?:    pre-preg pillar id for the "Read more →" CTA
 *   - logShortcut?: log type to open ('bbt' | 'lh' | 'cm' | 'intercourse')
 *   - predicate:    returns true if this template applies to the given context
 */

import type { CyclePhase } from './cycleLogic'

export type NudgeContext = {
  phase: CyclePhase
  cycleDay: number
  hasBBTToday: boolean
  hasLHToday: boolean
  hasCMToday: boolean
  moodToday: string | null   // '1'..'5' or null
  daysLate: number           // ≥1 if cycle has run past expected length
  bbtShiftConfirmed: boolean
}

export type CycleNudgeTemplate = {
  id: string
  headlineKey: string
  bodyKey: string
  pillarId?: string
  logShortcut?: 'bbt' | 'lh' | 'cm' | 'intercourse'
  /** Returns true if this template applies to the given context. */
  predicate: (ctx: NudgeContext) => boolean
}

export const CYCLE_NUDGE_TEMPLATES: CycleNudgeTemplate[] = [
  // 1. Day 32+ / late
  {
    id: 'late',
    headlineKey: 'cycle_nudge_late_headline',
    bodyKey: 'cycle_nudge_late_body',
    logShortcut: 'lh',
    predicate: (c) => c.daysLate >= 2,
  },
  // 2. Day 8+ / follicular / no LH yet
  {
    id: 'follicular-start-lh',
    headlineKey: 'cycle_nudge_follicular_lh_headline',
    bodyKey: 'cycle_nudge_follicular_lh_body',
    logShortcut: 'lh',
    predicate: (c) => c.phase === 'follicular' && c.cycleDay >= 8 && !c.hasLHToday,
  },
  // 3. Day 12–14 / high fertility / BBT logged
  {
    id: 'window-opens-tomorrow',
    headlineKey: 'cycle_nudge_window_open_headline',
    bodyKey: 'cycle_nudge_window_open_body',
    pillarId: 'fertility',
    predicate: (c) =>
      (c.phase === 'follicular' || c.phase === 'ovulation') &&
      c.cycleDay >= 12 && c.cycleDay <= 14 && c.hasBBTToday,
  },
  // 4. Luteal / BBT shift confirmed
  {
    id: 'ovulation-confirmed',
    headlineKey: 'cycle_nudge_ovulation_confirmed_headline',
    bodyKey: 'cycle_nudge_ovulation_confirmed_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'luteal' && c.bbtShiftConfirmed,
  },
  // 5. Luteal / low mood logged
  {
    id: 'luteal-pms',
    headlineKey: 'cycle_nudge_luteal_pms_headline',
    bodyKey: 'cycle_nudge_luteal_pms_body',
    pillarId: 'nutrition-prep',
    predicate: (c) => c.phase === 'luteal' && c.moodToday !== null && parseInt(c.moodToday) <= 2,
  },
  // 6. Day 1 / period / nothing logged — phase fallback for menstruation
  {
    id: 'menstruation-rest',
    headlineKey: 'cycle_nudge_menstruation_headline',
    bodyKey: 'cycle_nudge_menstruation_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'menstruation',
  },
  // Per-phase fallbacks (always last)
  {
    id: 'follicular-energy',
    headlineKey: 'cycle_nudge_follicular_headline',
    bodyKey: 'cycle_nudge_follicular_body',
    pillarId: 'nutrition-prep',
    predicate: (c) => c.phase === 'follicular',
  },
  {
    id: 'ovulation-window',
    headlineKey: 'cycle_nudge_ovulation_headline',
    bodyKey: 'cycle_nudge_ovulation_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'ovulation',
  },
  {
    id: 'luteal-care',
    headlineKey: 'cycle_nudge_luteal_headline',
    bodyKey: 'cycle_nudge_luteal_body',
    pillarId: 'emotional-readiness',
    predicate: (c) => c.phase === 'luteal',
  },
]

/** Pick the first template whose predicate matches. */
export function pickCycleNudge(ctx: NudgeContext): CycleNudgeTemplate {
  for (const t of CYCLE_NUDGE_TEMPLATES) {
    if (t.predicate(ctx)) return t
  }
  return CYCLE_NUDGE_TEMPLATES[CYCLE_NUDGE_TEMPLATES.length - 1]
}
