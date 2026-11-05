/**
 * cycleSymptoms — symptom IDs, labels, and per-phase ordering for the
 * unified cycle log forms.
 */
import type { CyclePhase } from './cycleLogic'
import { t, type TranslationKey } from './i18n'

export type SymptomId =
  | 'cramps'
  | 'headache'
  | 'bloated'
  | 'fatigue'
  | 'nausea'
  | 'back-pain'
  | 'tender-breasts'
  | 'acne'
  | 'insomnia'
  | 'cravings'
  | 'low-mood'
  | 'spotting'
  | 'energetic'
  | 'restless'

/**
 * `label` is the legacy English label — kept ONLY so resolveSymptomId() still matches rows
 * written with it. Never show it: the UI reads symptomLabel() (translated via `labelKey`).
 * Stored values (ids) never change.
 */
export const ALL_SYMPTOMS: { id: SymptomId; label: string; labelKey: TranslationKey }[] = [
  { id: 'cramps', label: 'Cramps', labelKey: 'cycleSymptom_cramps' },
  { id: 'headache', label: 'Headache', labelKey: 'cycleSymptom_headache' },
  { id: 'bloated', label: 'Bloated', labelKey: 'cycleSymptom_bloated' },
  { id: 'fatigue', label: 'Fatigue', labelKey: 'cycleSymptom_fatigue' },
  { id: 'nausea', label: 'Nausea', labelKey: 'cycleSymptom_nausea' },
  { id: 'back-pain', label: 'Back pain', labelKey: 'cycleSymptom_backPain' },
  { id: 'tender-breasts', label: 'Tender', labelKey: 'cycleSymptom_tenderBreasts' },
  { id: 'acne', label: 'Acne', labelKey: 'cycleSymptom_acne' },
  { id: 'insomnia', label: 'Insomnia', labelKey: 'cycleSymptom_insomnia' },
  { id: 'cravings', label: 'Cravings', labelKey: 'cycleSymptom_cravings' },
  { id: 'low-mood', label: 'Low mood', labelKey: 'cycleSymptom_lowMood' },
  { id: 'spotting', label: 'Spotting', labelKey: 'cycleSymptom_spotting' },
  { id: 'energetic', label: 'Energetic', labelKey: 'cycleSymptom_energetic' },
  { id: 'restless', label: 'Restless', labelKey: 'cycleSymptom_restless' },
]

const SUGGESTED: Record<CyclePhase, SymptomId[]> = {
  menstruation: ['cramps', 'back-pain', 'fatigue', 'headache', 'low-mood', 'bloated'],
  follicular:   ['acne', 'energetic', 'restless', 'headache'],
  ovulation:    ['tender-breasts', 'cramps', 'cravings', 'spotting'],
  luteal:       ['bloated', 'tender-breasts', 'low-mood', 'cravings', 'acne', 'fatigue'],
}

export function suggestedForPhase(phase: CyclePhase): SymptomId[] {
  return SUGGESTED[phase]
}

/** Translated chip label for a symptom id (current app language). Unknown ids pass through. */
export function symptomLabel(id: SymptomId): string {
  const s = ALL_SYMPTOMS.find((x) => x.id === id)
  return s ? t(s.labelKey) : id
}

/**
 * Resolve a raw stored symptom string to its SymptomId, tolerant of the
 * several forms a value can take in `cycle_logs`:
 *  - the id itself ('cravings', 'back-pain')   ← what SymptomsForm saves
 *  - the legacy English label ('Bloated', 'Tender')
 *  - legacy/seed display labels ('Bloating', 'Breast tenderness')
 *    written by devSeed.ts, which don't match the canonical ids/labels.
 * Matching is case-insensitive and ignores spaces/hyphens so 'Back pain',
 * 'back-pain', and 'backpain' all resolve. Returns null for a genuinely
 * unknown (free-text 'Other') symptom.
 */
const NORMALIZE = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '')

// Extra aliases for seed/legacy label variants that don't equal id or label.
const SYMPTOM_ALIASES: Record<string, SymptomId> = {
  bloating: 'bloated',
  breasttenderness: 'tender-breasts',
  tenderbreasts: 'tender-breasts',
  lowmood: 'low-mood',
  backpain: 'back-pain',
}

export function resolveSymptomId(raw: string): SymptomId | null {
  const n = NORMALIZE(raw)
  // 1. direct id match (normalized)
  const byId = ALL_SYMPTOMS.find((s) => NORMALIZE(s.id) === n)
  if (byId) return byId.id
  // 2. canonical label match (normalized)
  const byLabel = ALL_SYMPTOMS.find((s) => NORMALIZE(s.label) === n)
  if (byLabel) return byLabel.id
  // 3. known alias
  return SYMPTOM_ALIASES[n] ?? null
}
