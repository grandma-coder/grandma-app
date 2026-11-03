/**
 * cycleLogForms — copy tables + label helpers for the unified cycle log
 * forms. Pure functions, no React.
 */
import type { CyclePhase } from './cycleLogic'
import { t, type TranslationKey } from './i18n'
import { useLanguageStore } from '../store/useLanguageStore'

/** BCP-47 locale for Intl/toLocale*String from the current app language. */
export function appIntlLocale(): string {
  const lang = useLanguageStore.getState().language
  return lang === 'en' ? 'en-US' : lang
}

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
  | 'weight'
  | 'water'
  | 'activity'

// Phase pills are context, never a verdict: no "unusual", "normal", "early/late" or fertility
// claims (the phase is a prediction, and before a logged period it was an invented one).
const PHASE_PILL: Record<FormId, Record<CyclePhase, TranslationKey>> = {
  period_start: {
    menstruation: 'cyc_pill_ps_menstruation',
    follicular:   'cyc_pill_ps_other',
    ovulation:    'cyc_pill_ps_other',
    luteal:       'cyc_pill_ps_other',
  },
  period_end: {
    menstruation: 'cyc_pill_pe_menstruation',
    follicular:   'cyc_pill_pe_other',
    ovulation:    'cyc_pill_pe_other',
    luteal:       'cyc_pill_pe_other',
  },
  symptoms: {
    menstruation: 'cyc_pill_symptoms_menstruation',
    follicular:   'cyc_pill_symptoms_follicular',
    ovulation:    'cyc_pill_symptoms_ovulation',
    luteal:       'cyc_pill_symptoms_luteal',
  },
  mood: {
    menstruation: 'cyc_pill_mood_menstruation',
    follicular:   'cyc_pill_mood_follicular',
    ovulation:    'cyc_pill_mood_ovulation',
    luteal:       'cyc_pill_mood_luteal',
  },
  bbt: {
    menstruation: 'cyc_pill_bbt',
    follicular:   'cyc_pill_bbt',
    ovulation:    'cyc_pill_bbt',
    luteal:       'cyc_pill_bbt',
  },
  lh: {
    menstruation: 'cyc_pill_lh_before',
    follicular:   'cyc_pill_lh_before',
    ovulation:    'cyc_pill_lh_today',
    luteal:       'cyc_pill_records',
  },
  cm: {
    menstruation: 'cyc_pill_cm',
    follicular:   'cyc_pill_cm',
    ovulation:    'cyc_pill_cm',
    luteal:       'cyc_pill_cm',
  },
  intimacy: {
    menstruation: 'cyc_pill_insights',
    follicular:   'cyc_pill_insights',
    ovulation:    'cyc_pill_insights',
    luteal:       'cyc_pill_insights',
  },
  ovulation: {
    menstruation: 'cyc_pill_records',
    follicular:   'cyc_pill_records',
    ovulation:    'cyc_pill_records',
    luteal:       'cyc_pill_records',
  },
  pregnancy_test: {
    menstruation: 'cyc_pill_preg_early',
    follicular:   'cyc_pill_preg_early',
    ovulation:    'cyc_pill_preg_early',
    luteal:       'cyc_pill_preg_late',
  },
  sex_drive: {
    menstruation: 'cyc_pill_sexdrive_menstruation',
    follicular:   'cyc_pill_sexdrive_follicular',
    ovulation:    'cyc_pill_sexdrive_ovulation',
    luteal:       'cyc_pill_sexdrive_luteal',
  },
  clots: {
    menstruation: 'cyc_pill_clots_menstruation',
    follicular:   'cyc_pill_records',
    ovulation:    'cyc_pill_records',
    luteal:       'cyc_pill_records',
  },
  weight: {
    menstruation: 'cyc_pill_weight',
    follicular:   'cyc_pill_weight',
    ovulation:    'cyc_pill_weight',
    luteal:       'cyc_pill_weight',
  },
  water: {
    menstruation: 'cyc_pill_water_menstruation',
    follicular:   'cyc_pill_water_steady',
    ovulation:    'cyc_pill_water_steady',
    luteal:       'cyc_pill_water_luteal',
  },
  activity: {
    menstruation: 'cyc_pill_activity_menstruation',
    follicular:   'cyc_pill_activity_follicular',
    ovulation:    'cyc_pill_activity_ovulation',
    luteal:       'cyc_pill_activity_luteal',
  },
}

export function phaseHint(form: FormId, phase: CyclePhase): string {
  return t(PHASE_PILL[form][phase])
}

const IDLE_LABEL: Record<FormId, TranslationKey> = {
  period_start: 'cyc_save_startPeriod',
  period_end:   'cyc_save_markEnded',
  symptoms:     'cyc_save_symptoms',
  mood:         'cyc_save_mood',
  bbt:          'cyc_save_temperature',
  lh:           'cyc_save_result',
  cm:           'cyc_save_mucus',
  intimacy:     'common_save',
  ovulation:    'cyc_save_confirmOvulation',
  pregnancy_test: 'cyc_save_result',
  sex_drive:    'common_save',
  clots:        'common_save',
  weight:       'cyc_save_weight',
  water:        'cyc_save_water',
  activity:     'common_save',
}

export function saveLabel(
  form: FormId,
  opts?: { count?: number; initialCount?: number },
): string {
  if (form === 'symptoms') {
    const count = opts?.count ?? 0
    const initial = opts?.initialCount ?? 0
    if (count === 0 && initial > 0) return t('cyc_save_updateSymptoms')
    if (count > 0) return count === 1 ? t('cyc_save_symptoms_one') : t('cyc_save_symptoms_other', { count })
    return t(IDLE_LABEL.symptoms)
  }
  return t(IDLE_LABEL[form])
}
