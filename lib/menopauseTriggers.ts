/**
 * menopauseTriggers — optional "What might have set it off?" tags on hot flash
 * and night sweat logs.
 *
 * Storage (no migration): triggers live in the existing `menopause_logs.value`
 * text column as JSON, e.g. `{"triggers":["coffee","stress"]}`. Symptom rows
 * had `value = null` before, and `period` rows keep their plain flow word
 * ("light" / "medium" / "heavy"), so anything that isn't that JSON shape simply
 * reads as "no triggers". Pure — no supabase/React imports.
 */

import type { SiteStickerName } from '../components/stickers/SiteSticker'

export const MENOPAUSE_TRIGGERS = [
  'coffee',
  'alcohol',
  'spicy_food',
  'stress',
  'warm_room',
  'poor_sleep',
  'other',
] as const

export type MenopauseTrigger = (typeof MENOPAUSE_TRIGGERS)[number]

/** Symptom types that offer the trigger row. */
export const TRIGGER_SYMPTOMS = new Set(['hot_flash', 'night_sweat'])

export const TRIGGER_STICKER: Record<MenopauseTrigger, SiteStickerName> = {
  coffee: 'glass',
  alcohol: 'drop',
  spicy_food: 'flame',
  stress: 'brain',
  warm_room: 'sun',
  poor_sleep: 'moon',
  other: 'pencil',
}

/** i18n key for each trigger's label (sentence-start capitalised, e.g. "Coffee"). */
export const TRIGGER_LABEL_KEY = {
  coffee: 'meno_trigger_coffee',
  alcohol: 'meno_trigger_alcohol',
  spicy_food: 'meno_trigger_spicy_food',
  stress: 'meno_trigger_stress',
  warm_room: 'meno_trigger_warm_room',
  poor_sleep: 'meno_trigger_poor_sleep',
  other: 'meno_trigger_other',
} as const satisfies Record<MenopauseTrigger, string>

const KNOWN = new Set<string>(MENOPAUSE_TRIGGERS)

/** `value` to store for a set of triggers; null when none were picked. */
export function encodeMenopauseTriggers(triggers: readonly string[]): string | null {
  const clean = MENOPAUSE_TRIGGERS.filter((t) => triggers.includes(t))
  return clean.length ? JSON.stringify({ triggers: clean }) : null
}

/** Triggers stored on a log's `value`; [] for old logs, period flow words, or junk. */
export function parseMenopauseTriggers(value: string | null | undefined): MenopauseTrigger[] {
  if (!value || value[0] !== '{') return []
  try {
    const parsed = JSON.parse(value) as { triggers?: unknown }
    if (!Array.isArray(parsed.triggers)) return []
    return parsed.triggers.filter((t): t is MenopauseTrigger => typeof t === 'string' && KNOWN.has(t))
  } catch {
    return []
  }
}

/**
 * How often each trigger was noted on hot flash / night sweat rows, most first
 * (ties keep the list order). Also returns how many of those rows had any trigger.
 */
export function countMenopauseTriggers(
  rows: readonly { type: string; value: string | null }[],
  opts: { includeOther?: boolean } = {},
): { tagged: number; counts: { id: MenopauseTrigger; count: number }[] } {
  const acc = new Map<MenopauseTrigger, number>()
  let tagged = 0
  for (const r of rows) {
    if (!TRIGGER_SYMPTOMS.has(r.type)) continue
    const ts = parseMenopauseTriggers(r.value)
    if (!ts.length) continue
    tagged += 1
    for (const t of new Set(ts)) acc.set(t, (acc.get(t) ?? 0) + 1)
  }
  const counts = MENOPAUSE_TRIGGERS
    .filter((id) => (opts.includeOther ?? false) || id !== 'other')
    .map((id) => ({ id, count: acc.get(id) ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count) // Array.sort is stable → list order on ties
  return { tagged, counts }
}
