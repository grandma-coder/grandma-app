/**
 * Pure builders for the pillar screen's "where you are now" chips and the "For you" context line.
 *
 * Every chip is one whole, translated phrase ("Cycle day 16", "Luteal phase", "Period in 13 days")
 * built from a template — never a number glued to a separate label — so word order and plurals stay
 * right in every language and a wrapped line can never start with a "·" separator.
 * No React / stores here: callers pass the data and a `t`.
 */

import type { TranslationKey } from './i18n'
import type { CyclePhase } from './cycleLogic'

type T = (key: TranslationKey, params?: Record<string, string | number>) => string

function plural(t: T, base: string, n: number, extra?: Record<string, string | number>): string {
  return t(`${base}_${n === 1 ? 'one' : 'other'}` as TranslationKey, { n, ...extra })
}

export interface CycleMetaInput {
  cycleDay: number
  phaseLabel: string
  daysUntilPeriod: number
  daysUntilOvulation: number
  fertileStart: number
  fertileEnd: number
}

/** Fertility gets the ovulation-focused trio; every other cycle pillar gets day · phase · period. */
export function cycleMetaChips(t: T, pillarId: string, info: CycleMetaInput): string[] {
  const chips = [t('pillarMeta_cycleDay', { n: info.cycleDay })]
  if (pillarId === 'fertility') {
    const d = info.daysUntilOvulation
    chips.push(
      d > 0 ? plural(t, 'pillarMeta_ovulationIn', d)
      : d === 0 ? t('pillarMeta_ovulationToday')
      : plural(t, 'pillarMeta_sinceOvulation', Math.abs(d)),
    )
    if (info.fertileStart > 0 && info.fertileEnd >= info.fertileStart) {
      chips.push(t('pillarMeta_fertileWindow', { start: info.fertileStart, end: info.fertileEnd }))
    }
    return chips
  }
  if (info.phaseLabel) chips.push(info.phaseLabel)
  if (info.daysUntilPeriod > 0) chips.push(plural(t, 'pillarMeta_periodIn', info.daysUntilPeriod))
  return chips
}

export interface PregnancyMetaInput {
  week: number | null
  daysToGo: number | null
  /** Glasses logged today — only shown on the nutrition pillar. */
  water?: number | null
  /** Already-translated mood word — only shown on the mood-related pillars. */
  moodLabel?: string | null
}

export function pregnancyMetaChips(t: T, pillarId: string, m: PregnancyMetaInput): string[] {
  const chips: string[] = []
  if (m.week) chips.push(t('pillarMeta_week', { n: m.week }))
  if (pillarId === 'pregnancy-nutrition' && typeof m.water === 'number') {
    chips.push(plural(t, 'pillarMeta_water', m.water))
  }
  if ((pillarId === 'symptoms-relief' || pillarId === 'emotional-wellness') && m.moodLabel) {
    chips.push(t('pillarMeta_mood', { mood: m.moodLabel }))
  }
  if (m.daysToGo !== null && m.daysToGo > 0) chips.push(plural(t, 'pillarMeta_daysToGo', m.daysToGo))
  return chips
}

export function childAgeChip(t: T, ageMonths: number | null): string | null {
  if (ageMonths === null || ageMonths < 0) return null
  if (ageMonths < 24) return plural(t, 'pillarMeta_ageMonths', ageMonths)
  return plural(t, 'pillarMeta_ageYears', Math.floor(ageMonths / 12))
}

/** The small line under "For you right now": why these tips were picked. */
export function contextLine(
  t: T,
  journey: 'pre-pregnancy' | 'pregnancy' | 'kids' | undefined,
  ctx: { cyclePhase?: CyclePhase; pregnancyWeek?: number; childAgeMonths?: number },
): string | null {
  if (journey === 'pre-pregnancy' && ctx.cyclePhase) {
    switch (ctx.cyclePhase) {
      case 'menstruation': return t('pillarCtx_menstruation')
      case 'follicular': return t('pillarCtx_follicular')
      case 'ovulation': return t('pillarCtx_ovulation')
      case 'luteal': return t('pillarCtx_luteal')
    }
  }
  if (journey === 'pregnancy' && ctx.pregnancyWeek) return t('pillarCtx_week', { n: ctx.pregnancyWeek })
  if (journey === 'kids' && ctx.childAgeMonths !== undefined) return t('pillarCtx_age')
  return null
}
