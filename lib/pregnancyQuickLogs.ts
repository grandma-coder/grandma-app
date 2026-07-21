// pregnancyQuickLogs.ts — the catalog of quick-log chips available on the
// pregnancy home "Log something" card. Single source of truth shared by the
// card (TodaySummaryCard) and the customization picker (QuickLogPicker).
import type { TranslationKey } from './i18n'

export interface QuickLogDef {
  key: string          // stable id, stored in the user's enabled list
  logType: string      // the inline log sheet this chip opens (onLogMetric)
  labelKey: TranslationKey // display label in the picker
  minWeek?: number     // only offered from this pregnancy week onward
}

export const PREG_QUICK_LOGS: QuickLogDef[] = [
  { key: 'mood',   logType: 'mood',       labelKey: 'kids_logForm_labelMood' },
  { key: 'water',  logType: 'water',      labelKey: 'preg_form_water_title' },
  { key: 'sleep',  logType: 'sleep',      labelKey: 'kids_logForm_labelSleep' },
  { key: 'meals',  logType: 'nutrition',  labelKey: 'preg_form_nutrition_title' },
  { key: 'weight', logType: 'weight',     labelKey: 'preg_form_weight_title' },
  { key: 'kicks',  logType: 'kick_count', labelKey: 'preg_form_kick_title', minWeek: 28 },
  // Gap types — full calendar parity. OFF by default (see DEFAULT_QUICK_LOG_KEYS).
  { key: 'symptom',     logType: 'symptom',     labelKey: 'pregnancy_logTitle_symptom' },
  { key: 'exercise',    logType: 'exercise',    labelKey: 'pregnancy_logTitle_exercise' },
  { key: 'vitamins',    logType: 'vitamins',    labelKey: 'pregnancy_logTitle_vitamins' },
  { key: 'kegel',       logType: 'kegel',       labelKey: 'pregnancy_logTitle_kegel' },
  { key: 'contraction', logType: 'contraction', labelKey: 'pregnancy_logTitle_contraction', minWeek: 32 },
  { key: 'appointment', logType: 'appointment', labelKey: 'pregnancy_logTitle_appointment' },
  // exam_result opens the working exam form but its chip never lights "done":
  // ExamResultForm delegates to ExamForm, which writes the separate `exams`
  // table (not pregnancy_logs), so todayLogs['exam_result'] is never populated.
  { key: 'exam_result', logType: 'exam_result', labelKey: 'pregnancy_logTitle_examResult' },
  { key: 'nesting',     logType: 'nesting',     labelKey: 'pregnancy_logTitle_nesting',    minWeek: 28 },
  { key: 'birth_prep',  logType: 'birth_prep',  labelKey: 'pregnancy_logTitle_birthPrep',  minWeek: 28 },
]

// The default chips a new user sees before they customize.
export const DEFAULT_QUICK_LOG_KEYS = ['mood', 'water', 'sleep', 'meals']

export function quickLogByKey(key: string): QuickLogDef | undefined {
  return PREG_QUICK_LOGS.find((q) => q.key === key)
}
