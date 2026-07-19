/**
 * cycleSymptoms — symptom IDs, labels, and per-phase ordering for the
 * unified cycle log forms.
 */
import type { CyclePhase } from './cycleLogic'

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

export const ALL_SYMPTOMS: { id: SymptomId; label: string }[] = [
  { id: 'cramps', label: 'Cramps' },
  { id: 'headache', label: 'Headache' },
  { id: 'bloated', label: 'Bloated' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'nausea', label: 'Nausea' },
  { id: 'back-pain', label: 'Back pain' },
  { id: 'tender-breasts', label: 'Tender' },
  { id: 'acne', label: 'Acne' },
  { id: 'insomnia', label: 'Insomnia' },
  { id: 'cravings', label: 'Cravings' },
  { id: 'low-mood', label: 'Low mood' },
  { id: 'spotting', label: 'Spotting' },
  { id: 'energetic', label: 'Energetic' },
  { id: 'restless', label: 'Restless' },
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

export function symptomLabel(id: SymptomId): string {
  return ALL_SYMPTOMS.find((s) => s.id === id)?.label ?? id
}

/**
 * Resolve a raw stored symptom string to its SymptomId, tolerant of the
 * several forms a value can take in `cycle_logs`:
 *  - the id itself ('cravings', 'back-pain')   ← what SymptomsForm saves
 *  - the canonical label ('Bloated', 'Tender') ← symptomLabel()
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
