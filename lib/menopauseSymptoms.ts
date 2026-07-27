/**
 * menopauseSymptoms — curated symptom IDs, labels, and groups for the
 * Menopause behavior log forms. `period` and `note` are log events, not
 * symptoms, and live in the log sheet — not here.
 */

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

export function menopauseSymptomLabel(id: MenopauseSymptomId): string {
  return ALL_MENOPAUSE_SYMPTOMS.find((s) => s.id === id)?.label ?? id
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
