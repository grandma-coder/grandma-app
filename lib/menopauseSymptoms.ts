/**
 * menopauseSymptoms — curated symptom IDs, labels, and groups for the
 * Menopause behavior log forms. `period` and `note` are log events, not
 * symptoms, and live in the log sheet — not here.
 */

import { t, type TranslationKey } from './i18n'

export type MenopauseGroup = 'vasomotor' | 'sleep' | 'mood' | 'physical' | 'genitourinary'

export type MenopauseSymptomId =
  | 'hot_flash' | 'night_sweat'
  | 'sleep' | 'fatigue'
  | 'low_mood' | 'anxiety' | 'brain_fog'
  | 'joint_pain' | 'headache' | 'palpitations' | 'weight'
  | 'vaginal_dryness' | 'libido'

export interface MenopauseSymptom { id: MenopauseSymptomId; label: string; group: MenopauseGroup }

export const ALL_MENOPAUSE_SYMPTOMS: MenopauseSymptom[] = [
  { id: 'hot_flash',       label: 'Hot flashes',     group: 'vasomotor' },
  { id: 'night_sweat',     label: 'Night sweats',    group: 'vasomotor' },
  { id: 'sleep',           label: 'Sleep trouble',   group: 'sleep' },
  { id: 'fatigue',         label: 'Fatigue',         group: 'sleep' },
  { id: 'low_mood',        label: 'Low mood',        group: 'mood' },
  { id: 'anxiety',         label: 'Anxiety',         group: 'mood' },
  { id: 'brain_fog',       label: 'Brain fog',       group: 'mood' },
  { id: 'joint_pain',      label: 'Joint aches',     group: 'physical' },
  { id: 'headache',        label: 'Headache',        group: 'physical' },
  { id: 'palpitations',    label: 'Palpitations',    group: 'physical' },
  { id: 'weight',          label: 'Weight change',   group: 'physical' },
  { id: 'vaginal_dryness', label: 'Vaginal dryness', group: 'genitourinary' },
  { id: 'libido',          label: 'Low libido',      group: 'genitourinary' },
]

/** Display label in the current language. `label` above stays English — it is only
 *  a matching key for resolveMenopauseSymptomId, never shown to the user. */
export function menopauseSymptomLabel(id: MenopauseSymptomId): string {
  return ALL_MENOPAUSE_SYMPTOMS.some((s) => s.id === id) ? t(`gn_meno_sym_${id}` as TranslationKey) : id
}

const NORMALIZE = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '')

const ALIASES: Record<string, MenopauseSymptomId> = {
  hotflash: 'hot_flash', hotflashes: 'hot_flash',
  nightsweat: 'night_sweat', nightsweats: 'night_sweat',
  sleeptrouble: 'sleep', insomnia: 'sleep',
  lowmood: 'low_mood', brainfog: 'brain_fog',
  jointaches: 'joint_pain', jointpain: 'joint_pain',
  weightchange: 'weight', vaginaldryness: 'vaginal_dryness',
  lowlibido: 'libido',
}

export function resolveMenopauseSymptomId(raw: string): MenopauseSymptomId | null {
  const n = NORMALIZE(raw)
  const byId = ALL_MENOPAUSE_SYMPTOMS.find((s) => NORMALIZE(s.id) === n)
  if (byId) return byId.id
  const byLabel = ALL_MENOPAUSE_SYMPTOMS.find((s) => NORMALIZE(s.label) === n)
  if (byLabel) return byLabel.id
  return ALIASES[n] ?? null
}

// ─── Entries per day ─────────────────────────────────────────────────────────

/**
 * Log types that may be saved several times on the same day: hot flashes and night sweats come
 * in bursts (each log is its own entry with its own time and intensity), and free notes stack.
 * Every other type is one row per day — saving it again replaces that day's row.
 */
const MULTI_PER_DAY_TYPES = new Set<string>(['hot_flash', 'night_sweat', 'note'])

export function isMultiPerDayType(type: string): boolean {
  return MULTI_PER_DAY_TYPES.has(type)
}

/**
 * The saved row a log form should pre-fill (and replace on save). One-per-day types: that day's
 * row. Stacking types: only the entry being edited (`editId`) — a new hot flash starts blank.
 */
export function editableEntryFor<R extends { id?: string; date: string; type: string }>(
  rows: readonly R[] | undefined,
  date: string,
  type: string,
  editId?: string | null,
): R | undefined {
  if (!rows) return undefined
  if (editId) return rows.find((r) => r.id === editId)
  if (isMultiPerDayType(type)) return undefined
  return rows.find((r) => r.date === date && r.type === type)
}

/**
 * Local clock time an entry was logged, when it was logged on the day it describes (a
 * back-dated entry's save time says nothing about when the hot flash happened).
 */
export function menopauseEntryTime(row: { date: string; created_at?: string | null }): { hours: number; minutes: number } | null {
  if (!row.created_at) return null
  const at = new Date(row.created_at)
  if (Number.isNaN(at.getTime())) return null
  const local = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`
  if (local !== row.date) return null
  return { hours: at.getHours(), minutes: at.getMinutes() }
}

// ─── Home quick-log dock seeded from onboarding ──────────────────────────────

/** Pins the home quick-log dock holds (the size of the default set). */
export const MENOPAUSE_QUICK_LOG_MAX = 8

/**
 * Dock pins from the symptoms picked in onboarding: the picks (catalog order, known ids only,
 * capped at the dock size); no picks → the defaults.
 */
export function seedMenopauseQuickLog(picked: readonly MenopauseSymptomId[], defaults: readonly string[]): string[] {
  const ids = ALL_MENOPAUSE_SYMPTOMS.map((s) => s.id).filter((id) => picked.includes(id))
  return ids.length ? ids.slice(0, MENOPAUSE_QUICK_LOG_MAX) : [...defaults]
}
