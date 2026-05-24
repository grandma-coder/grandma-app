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
