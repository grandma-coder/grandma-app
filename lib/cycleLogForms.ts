/**
 * cycleLogForms — copy tables + label helpers for the unified cycle log
 * forms. Pure functions, no React.
 */
import type { CyclePhase } from './cycleLogic'

export type FormId =
  | 'period_start'
  | 'period_end'
  | 'symptoms'
  | 'mood'
  | 'bbt'
  | 'lh'
  | 'cm'
  | 'intimacy'
  | 'ovulation'
  | 'pregnancy_test'
  | 'sex_drive'
  | 'clots'

const PHASE_PILL: Record<FormId, Record<CyclePhase, string>> = {
  period_start: {
    menstruation: 'Menstruation begins',
    follicular:   'Marking period start',
    ovulation:    'Unusual — period start mid-cycle',
    luteal:       'Period started early',
  },
  period_end: {
    menstruation: 'Last day of period',
    follicular:   'Marking period end',
    ovulation:    'Marking period end',
    luteal:       'Marking period end',
  },
  symptoms: {
    menstruation: 'Common in Menstruation',
    follicular:   'Common in Follicular',
    ovulation:    'Common in Ovulation',
    luteal:       'Common in Luteal',
  },
  mood: {
    menstruation: 'Menstruation · be gentle',
    follicular:   'Follicular · energy rising',
    ovulation:    'Ovulation · peak energy',
    luteal:       'Luteal · mood often softer',
  },
  bbt: {
    menstruation: 'Track every morning',
    follicular:   'Track every morning',
    ovulation:    'Track every morning',
    luteal:       'Track every morning',
  },
  lh: {
    menstruation: 'Predicts ovulation 24–36h ahead',
    follicular:   'Predicts ovulation 24–36h ahead',
    ovulation:    'Surge today?',
    luteal:       'Outside fertile window',
  },
  cm: {
    menstruation: 'Fertility signal',
    follicular:   'Fertility signal',
    ovulation:    'Egg-white = peak fertile',
    luteal:       'Fertility signal',
  },
  intimacy: {
    menstruation: 'Logged for cycle insights',
    follicular:   'Logged for cycle insights',
    ovulation:    'Peak fertile window',
    luteal:       'Logged for cycle insights',
  },
  ovulation: {
    menstruation: 'Unusual — confirm carefully',
    follicular:   'Early but possible',
    ovulation:    'Fertile window peak',
    luteal:       'Late confirmation',
  },
  pregnancy_test: {
    menstruation: 'Most reliable after a missed period',
    follicular:   'Most reliable after a missed period',
    ovulation:    'Too early — wait until your period is due',
    luteal:       'Most accurate once your period is late',
  },
  sex_drive: {
    menstruation: 'Libido often dips',
    follicular:   'Libido often rising',
    ovulation:    'Libido often peaks',
    luteal:       'Libido varies',
  },
  clots: {
    menstruation: 'Common on heavier days',
    follicular:   'Logged for your records',
    ovulation:    'Unusual outside a period',
    luteal:       'Logged for your records',
  },
}

export function phaseHint(form: FormId, phase: CyclePhase): string {
  return PHASE_PILL[form][phase]
}

const IDLE_LABEL: Record<FormId, string> = {
  period_start: 'Start period',
  period_end:   'Mark as ended',
  symptoms:     'Save symptoms',
  mood:         'Save mood',
  bbt:          'Save temperature',
  lh:           'Save result',
  cm:           'Save mucus',
  intimacy:     'Save',
  ovulation:    'Confirm ovulation',
  pregnancy_test: 'Save result',
  sex_drive:    'Save',
  clots:        'Save',
}

export function saveLabel(
  form: FormId,
  opts?: { count?: number; initialCount?: number },
): string {
  if (form === 'symptoms') {
    const count = opts?.count ?? 0
    const initial = opts?.initialCount ?? 0
    if (count === 0 && initial > 0) return 'Update symptoms'
    if (count > 0) return `Save ${count} symptom${count === 1 ? '' : 's'}`
    return IDLE_LABEL.symptoms
  }
  return IDLE_LABEL[form]
}
