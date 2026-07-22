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

// Picker/chip labels are the bare-noun `preg_ring_log_*` set (already translated
// across every locale) so the "What do you want to track?" list + the home
// "Log something" chips read as one consistent vocabulary — "Mood · Water ·
// Sleep · Meal · Weight …" — instead of a mix of "Log your X" / "New appointment"
// / bare nouns. The verbose log-SHEET titles (pregnancy_logTitle_* / preg_form_*)
// are left untouched; those are correct in their own context.
export const PREG_QUICK_LOGS: QuickLogDef[] = [
  { key: 'mood',   logType: 'mood',       labelKey: 'preg_ring_log_mood' },
  { key: 'water',  logType: 'water',      labelKey: 'preg_ring_log_water' },
  { key: 'sleep',  logType: 'sleep',      labelKey: 'preg_ring_log_sleep' },
  { key: 'meals',  logType: 'nutrition',  labelKey: 'preg_ring_log_nutrition' },
  { key: 'weight', logType: 'weight',     labelKey: 'preg_ring_log_weight' },
  { key: 'kicks',  logType: 'kick_count', labelKey: 'preg_ring_log_kicks', minWeek: 28 },
  // Gap types — full calendar parity. OFF by default (see DEFAULT_QUICK_LOG_KEYS).
  { key: 'symptom',     logType: 'symptom',     labelKey: 'preg_ring_log_symptom' },
  { key: 'exercise',    logType: 'exercise',    labelKey: 'preg_ring_log_exercise' },
  { key: 'vitamins',    logType: 'vitamins',    labelKey: 'preg_ring_log_vitamins' },
  { key: 'kegel',       logType: 'kegel',       labelKey: 'preg_ring_log_kegel' },
  { key: 'contraction', logType: 'contraction', labelKey: 'preg_ring_log_contraction', minWeek: 32 },
  { key: 'appointment', logType: 'appointment', labelKey: 'preg_ring_log_appointment' },
  // exam_result opens the working exam form but its chip never lights "done":
  // ExamResultForm delegates to ExamForm, which writes the separate `exams`
  // table (not pregnancy_logs), so todayLogs['exam_result'] is never populated.
  { key: 'exam_result', logType: 'exam_result', labelKey: 'preg_ring_log_examResult' },
  { key: 'nesting',     logType: 'nesting',     labelKey: 'preg_ring_log_nesting',    minWeek: 28 },
  { key: 'birth_prep',  logType: 'birth_prep',  labelKey: 'preg_ring_log_birthPrep',  minWeek: 28 },
]

// The default chips a new user sees before they customize.
export const DEFAULT_QUICK_LOG_KEYS = ['mood', 'water', 'sleep', 'meals']

export function quickLogByKey(key: string): QuickLogDef | undefined {
  return PREG_QUICK_LOGS.find((q) => q.key === key)
}
