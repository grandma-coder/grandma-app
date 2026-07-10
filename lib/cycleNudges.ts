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

/**
 * Content category for the daily mix. The general (non-override) pool is split
 * into categories so consecutive days show different *kinds* of content — a
 * phase tip, then a fertility fact, then a reflection prompt, etc. — instead of
 * cycling the same phase-tip carousel.
 */
export type NudgeCategory = 'phase' | 'fertility' | 'reflection' | 'nutrition' | 'education'

/** Fixed daily rotation order. Day N picks DAILY_CATEGORY_ORDER[N % 5]. */
export const DAILY_CATEGORY_ORDER: NudgeCategory[] = [
  'phase', 'fertility', 'reflection', 'nutrition', 'education',
]

export type CycleNudgeTemplate = {
  id: string
  /**
   * 'override' = log/signal-driven, wins by first-match priority.
   * 'general'  = phase fallback, picked by the daily category mix.
   */
  kind: 'override' | 'general'
  /** Category for general templates (ignored for overrides). */
  category?: NudgeCategory
  headlineKey: string
  bodyKey: string
  pillarId?: string
  logShortcut?: 'bbt' | 'lh' | 'cm' | 'intercourse' | 'mood' | 'symptom'
  /**
   * For broad TIME-based overrides (not signal-driven): the cycle day this
   * override should fire on. Without it the override would match every day of
   * its window and dominate the daily mix; with it, the override shows on
   * exactly that day, then the mix resumes. Signal-driven overrides (which
   * require a logged signal in their predicate) omit this — they are already
   * occasional and should fire whenever the signal is present.
   */
  firesOnDay?: number
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
  // 2. "Start LH testing" — a one-time reminder on day 8, not every day after.
  //    firesOnDay keeps it from dominating the whole follicular phase; the
  //    daily mix takes over from day 9.
  {
    id: 'follicular-start-lh',
    kind: 'override',
    headlineKey: 'cycle_nudge_follicular_lh_headline',
    bodyKey: 'cycle_nudge_follicular_lh_body',
    logShortcut: 'lh',
    firesOnDay: 8,
    predicate: (c) => c.phase === 'follicular' && c.cycleDay === 8 && !c.hasLHToday,
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

  // ── General templates, split by category for the daily mix ────────────────
  // ── PHASE — what's happening hormonally ───────────────────────────────────
  {
    id: 'menstruation-rest',
    kind: 'general', category: 'phase',
    headlineKey: 'cycle_nudge_menstruation_headline',
    bodyKey: 'cycle_nudge_menstruation_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'menstruation',
  },
  {
    id: 'menstruation-warmth',
    kind: 'general', category: 'phase',
    headlineKey: 'cycle_nudge_menstruation_warmth_headline',
    bodyKey: 'cycle_nudge_menstruation_warmth_body',
    pillarId: 'emotional-readiness',
    predicate: (c) => c.phase === 'menstruation',
  },
  {
    id: 'follicular-energy',
    kind: 'general', category: 'phase',
    headlineKey: 'cycle_nudge_follicular_headline',
    bodyKey: 'cycle_nudge_follicular_body',
    pillarId: 'nutrition-prep',
    predicate: (c) => c.phase === 'follicular',
  },
  {
    id: 'follicular-plan',
    kind: 'general', category: 'phase',
    headlineKey: 'cycle_nudge_follicular_plan_headline',
    bodyKey: 'cycle_nudge_follicular_plan_body',
    pillarId: 'emotional-readiness',
    predicate: (c) => c.phase === 'follicular',
  },
  {
    id: 'ovulation-window',
    kind: 'general', category: 'phase',
    headlineKey: 'cycle_nudge_ovulation_headline',
    bodyKey: 'cycle_nudge_ovulation_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'ovulation',
  },
  {
    id: 'luteal-care',
    kind: 'general', category: 'phase',
    headlineKey: 'cycle_nudge_luteal_headline',
    bodyKey: 'cycle_nudge_luteal_body',
    pillarId: 'emotional-readiness',
    predicate: (c) => c.phase === 'luteal',
  },
  {
    id: 'luteal-sleep',
    kind: 'general', category: 'phase',
    headlineKey: 'cycle_nudge_luteal_sleep_headline',
    bodyKey: 'cycle_nudge_luteal_sleep_body',
    pillarId: 'emotional-readiness',
    predicate: (c) => c.phase === 'luteal',
  },

  // ── FERTILITY — day-specific window awareness ─────────────────────────────
  {
    id: 'fertility-follicular-window',
    kind: 'general', category: 'fertility',
    headlineKey: 'cycle_nudge_fertility_follicular_headline',
    bodyKey: 'cycle_nudge_fertility_follicular_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'follicular',
  },
  {
    id: 'fertility-ovulation-timing',
    kind: 'general', category: 'fertility',
    headlineKey: 'cycle_nudge_ovulation_timing_headline',
    bodyKey: 'cycle_nudge_ovulation_timing_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'ovulation',
  },
  {
    id: 'fertility-luteal-closed',
    kind: 'general', category: 'fertility',
    headlineKey: 'cycle_nudge_fertility_luteal_headline',
    bodyKey: 'cycle_nudge_fertility_luteal_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'luteal',
  },
  {
    id: 'fertility-menstruation-reset',
    kind: 'general', category: 'fertility',
    headlineKey: 'cycle_nudge_fertility_menstruation_headline',
    bodyKey: 'cycle_nudge_fertility_menstruation_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'menstruation',
  },

  // ── REFLECTION — gentle check-ins that deep-link to logging ───────────────
  {
    id: 'reflect-mood',
    kind: 'general', category: 'reflection',
    headlineKey: 'cycle_nudge_reflect_mood_headline',
    bodyKey: 'cycle_nudge_reflect_mood_body',
    logShortcut: 'mood',
    predicate: () => true,
  },
  {
    id: 'reflect-symptoms',
    kind: 'general', category: 'reflection',
    headlineKey: 'cycle_nudge_reflect_symptom_headline',
    bodyKey: 'cycle_nudge_reflect_symptom_body',
    logShortcut: 'symptom',
    predicate: () => true,
  },
  {
    id: 'reflect-energy-luteal',
    kind: 'general', category: 'reflection',
    headlineKey: 'cycle_nudge_reflect_energy_headline',
    bodyKey: 'cycle_nudge_reflect_energy_body',
    logShortcut: 'mood',
    predicate: (c) => c.phase === 'luteal' || c.phase === 'menstruation',
  },

  // ── NUTRITION — phase-appropriate food guidance ───────────────────────────
  {
    id: 'nutrition-menstruation-iron',
    kind: 'general', category: 'nutrition',
    headlineKey: 'cycle_nudge_menstruation_iron_headline',
    bodyKey: 'cycle_nudge_menstruation_iron_body',
    pillarId: 'nutrition-prep',
    predicate: (c) => c.phase === 'menstruation',
  },
  {
    id: 'nutrition-follicular-hydrate',
    kind: 'general', category: 'nutrition',
    headlineKey: 'cycle_nudge_follicular_hydrate_headline',
    bodyKey: 'cycle_nudge_follicular_hydrate_body',
    pillarId: 'nutrition-prep',
    predicate: (c) => c.phase === 'follicular',
  },
  {
    id: 'nutrition-luteal-magnesium',
    kind: 'general', category: 'nutrition',
    headlineKey: 'cycle_nudge_nutrition_luteal_headline',
    bodyKey: 'cycle_nudge_nutrition_luteal_body',
    pillarId: 'nutrition-prep',
    predicate: (c) => c.phase === 'luteal',
  },
  {
    id: 'nutrition-ovulation-antiox',
    kind: 'general', category: 'nutrition',
    headlineKey: 'cycle_nudge_nutrition_ovulation_headline',
    bodyKey: 'cycle_nudge_nutrition_ovulation_body',
    pillarId: 'nutrition-prep',
    predicate: (c) => c.phase === 'ovulation',
  },

  // ── EDUCATION — short "did you know" tied to the phase ─────────────────────
  {
    id: 'edu-menstruation',
    kind: 'general', category: 'education',
    headlineKey: 'cycle_nudge_edu_menstruation_headline',
    bodyKey: 'cycle_nudge_edu_menstruation_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'menstruation',
  },
  {
    id: 'edu-follicular',
    kind: 'general', category: 'education',
    headlineKey: 'cycle_nudge_edu_follicular_headline',
    bodyKey: 'cycle_nudge_edu_follicular_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'follicular',
  },
  {
    id: 'edu-ovulation',
    kind: 'general', category: 'education',
    headlineKey: 'cycle_nudge_edu_ovulation_headline',
    bodyKey: 'cycle_nudge_edu_ovulation_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'ovulation',
  },
  {
    id: 'edu-luteal',
    kind: 'general', category: 'education',
    headlineKey: 'cycle_nudge_edu_luteal_headline',
    bodyKey: 'cycle_nudge_edu_luteal_body',
    pillarId: 'fertility',
    predicate: (c) => c.phase === 'luteal',
  },
]

/**
 * Pick today's nudge.
 *
 *  1. A log-driven override wins if any apply (first match) — the most personal.
 *  2. Otherwise the daily mix: today's category is DAILY_CATEGORY_ORDER keyed to
 *     cycleDay, so consecutive days show different *kinds* of content. Within the
 *     chosen category we rotate among the phase-eligible templates by cycleDay.
 *  3. If the day's category has no eligible template for this phase, fall through
 *     to the next category so the card never goes blank.
 */
export function pickCycleNudge(ctx: NudgeContext): CycleNudgeTemplate {
  const override = CYCLE_NUDGE_TEMPLATES.find((t) => t.kind === 'override' && t.predicate(ctx))
  if (override) return override

  const general = CYCLE_NUDGE_TEMPLATES.filter((t) => t.kind === 'general' && t.predicate(ctx))

  // Start at today's category and walk the rotation until one has an eligible
  // template. Day 1 → index 0, advancing each day through the 5 categories.
  const startIdx = (((ctx.cycleDay - 1) % DAILY_CATEGORY_ORDER.length) + DAILY_CATEGORY_ORDER.length) % DAILY_CATEGORY_ORDER.length
  for (let i = 0; i < DAILY_CATEGORY_ORDER.length; i++) {
    const category = DAILY_CATEGORY_ORDER[(startIdx + i) % DAILY_CATEGORY_ORDER.length]
    const pool = general.filter((t) => t.category === category)
    const picked = pickForCycleDay(pool, ctx.cycleDay)
    if (picked) return picked
  }

  // Last resort: any eligible general template, then the final override.
  return general[0] ?? CYCLE_NUDGE_TEMPLATES[CYCLE_NUDGE_TEMPLATES.length - 1]
}
