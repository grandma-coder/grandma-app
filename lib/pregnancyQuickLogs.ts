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
]

// The default chips a new user sees before they customize.
export const DEFAULT_QUICK_LOG_KEYS = ['mood', 'water', 'sleep', 'meals']

export function quickLogByKey(key: string): QuickLogDef | undefined {
  return PREG_QUICK_LOGS.find((q) => q.key === key)
}
