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
import { pickForCycleDay } from './cyclePhaseRotation'

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
  /**
   * 'override' = log/signal-driven, wins by first-match priority.
   * 'general'  = phase fallback, rotated by cycle day among eligible peers.
   */
  kind: 'override' | 'general'
  headlineKey: string
  bodyKey: string
  pillarId?: string
  logShortcut?: 'bbt' | 'lh' | 'cm' | 'intercourse'
  /** Returns true if this template applies to the given context. */
  predicate: (ctx: NudgeContext) => boolean
}

export const CYCLE_NUDGE_TEMPLATES: CycleNudgeTemplate[] = [
  // ── Log / signal-driven overrides (first-match priority) ──────────────────
  // 1. Day 32+ / late
  {
    id: 'late',
    kind: 'override',
    headlineKey: 'cycle_nudge_late_headline',
    bodyKey: 'cycle_nudge_late_body',
    logShortcut: 'lh',
    predicate: (c) => c.daysLate >= 2,
  },
  // 2. Day 8+ / follicular / no LH yet
  {
    id: 'follicular-start-lh',
    kind: 'override',
    headlineKey: 'cycle_nudge_follicular_lh_headline',
    bodyKey: 'cycle_nudge_follicular_lh_body',
    logShortcut: 'lh',
    predicate: (c) => c.phase === 'follicular' && c.cycleDay >= 8 && !c.hasLHToday,
  },
  // 3. Day 12–14 / high fertility / BBT logged
  {
    id: 'window-opens-tomorrow',
    kind: 'override',
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
    kind: 'override',
    headlineKey: 'cycle_nudge_ovulation_confirmed_headline',
    bodyKey: 'cycle_nudge_ovulation_confirmed_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'luteal' && c.bbtShiftConfirmed,
  },
  // 5. Luteal / low mood logged
  {
    id: 'luteal-pms',
    kind: 'override',
    headlineKey: 'cycle_nudge_luteal_pms_headline',
    bodyKey: 'cycle_nudge_luteal_pms_body',
    pillarId: 'nutrition-prep',
    predicate: (c) => c.phase === 'luteal' && c.moodToday !== null && parseInt(c.moodToday) <= 2,
  },

  // ── General phase templates (rotated by cycle day) ────────────────────────
  // Menstruation
  {
    id: 'menstruation-rest',
    kind: 'general',
    headlineKey: 'cycle_nudge_menstruation_headline',
    bodyKey: 'cycle_nudge_menstruation_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'menstruation',
  },
  {
    id: 'menstruation-iron',
    kind: 'general',
    headlineKey: 'cycle_nudge_menstruation_iron_headline',
    bodyKey: 'cycle_nudge_menstruation_iron_body',
    pillarId: 'nutrition-prep',
    predicate: (c) => c.phase === 'menstruation',
  },
  {
    id: 'menstruation-warmth',
    kind: 'general',
    headlineKey: 'cycle_nudge_menstruation_warmth_headline',
    bodyKey: 'cycle_nudge_menstruation_warmth_body',
    pillarId: 'emotional-readiness',
    predicate: (c) => c.phase === 'menstruation',
  },
  // Follicular
  {
    id: 'follicular-energy',
    kind: 'general',
    headlineKey: 'cycle_nudge_follicular_headline',
    bodyKey: 'cycle_nudge_follicular_body',
    pillarId: 'nutrition-prep',
    predicate: (c) => c.phase === 'follicular',
  },
  {
    id: 'follicular-plan',
    kind: 'general',
    headlineKey: 'cycle_nudge_follicular_plan_headline',
    bodyKey: 'cycle_nudge_follicular_plan_body',
    pillarId: 'emotional-readiness',
    predicate: (c) => c.phase === 'follicular',
  },
  {
    id: 'follicular-hydrate',
    kind: 'general',
    headlineKey: 'cycle_nudge_follicular_hydrate_headline',
    bodyKey: 'cycle_nudge_follicular_hydrate_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'follicular',
  },
  // Ovulation
  {
    id: 'ovulation-window',
    kind: 'general',
    headlineKey: 'cycle_nudge_ovulation_headline',
    bodyKey: 'cycle_nudge_ovulation_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'ovulation',
  },
  {
    id: 'ovulation-timing',
    kind: 'general',
    headlineKey: 'cycle_nudge_ovulation_timing_headline',
    bodyKey: 'cycle_nudge_ovulation_timing_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'ovulation',
  },
  // Luteal
  {
    id: 'luteal-care',
    kind: 'general',
    headlineKey: 'cycle_nudge_luteal_headline',
    bodyKey: 'cycle_nudge_luteal_body',
    pillarId: 'emotional-readiness',
    predicate: (c) => c.phase === 'luteal',
  },
  {
    id: 'luteal-sleep',
    kind: 'general',
    headlineKey: 'cycle_nudge_luteal_sleep_headline',
    bodyKey: 'cycle_nudge_luteal_sleep_body',
    pillarId: 'emotional-readiness',
    predicate: (c) => c.phase === 'luteal',
  },
  {
    id: 'luteal-move',
    kind: 'general',
    headlineKey: 'cycle_nudge_luteal_move_headline',
    bodyKey: 'cycle_nudge_luteal_move_body',
    pillarId: 'emotional-readiness',
    predicate: (c) => c.phase === 'luteal',
  },
]

/**
 * Pick today's nudge: a log-driven override wins if any apply (first match);
 * otherwise rotate among the general templates eligible for this phase, keyed
 * to cycle day.
 */
export function pickCycleNudge(ctx: NudgeContext): CycleNudgeTemplate {
  const override = CYCLE_NUDGE_TEMPLATES.find((t) => t.kind === 'override' && t.predicate(ctx))
  if (override) return override

  const general = CYCLE_NUDGE_TEMPLATES.filter((t) => t.kind === 'general' && t.predicate(ctx))
  const picked = pickForCycleDay(general, ctx.cycleDay)
  return picked ?? CYCLE_NUDGE_TEMPLATES[CYCLE_NUDGE_TEMPLATES.length - 1]
}
