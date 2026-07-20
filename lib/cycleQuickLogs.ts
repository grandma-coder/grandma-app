// cycleQuickLogs.ts — the catalog of quick-log chips available on the cycle
// (pre-pregnancy) home "Log something" card. Single source of truth shared by
// the card (CycleTodaySummaryCard) and the customization picker
// (CycleQuickLogPicker). Mirrors lib/pregnancyQuickLogs.ts for the pregnancy
// home; cycle keys differ so it uses its own store (useCycleQuickLogStore).
import type { TranslationKey } from './i18n'

/** The cycle log sheet a chip opens (matches CycleTodaySummaryCard's sheetType). */
export type CycleQuickLogSheet =
  | 'mood' | 'symptom' | 'basal_temp' | 'lh' | 'cm' | 'intercourse' | 'period_start'
  | 'period_end' | 'pregnancy_test' | 'sex_drive' | 'clots' | 'weight' | 'water' | 'activity'

export interface CycleQuickLogDef {
  key: string                 // stable id, stored in the user's enabled list
  sheet: CycleQuickLogSheet   // the log sheet this chip opens
  labelKey: TranslationKey    // display label in the picker
}

export const CYCLE_QUICK_LOGS: CycleQuickLogDef[] = [
  { key: 'mood',           sheet: 'mood',           labelKey: 'cycleQuickLog_mood' },
  { key: 'symptoms',       sheet: 'symptom',        labelKey: 'cycleQuickLog_symptoms' },
  { key: 'bbt',            sheet: 'basal_temp',     labelKey: 'cycleQuickLog_bbt' },
  { key: 'lh',             sheet: 'lh',             labelKey: 'cycleQuickLog_lh' },
  { key: 'cm',             sheet: 'cm',             labelKey: 'cycleQuickLog_cm' },
  { key: 'intimacy',       sheet: 'intercourse',    labelKey: 'cycleQuickLog_intimacy' },
  { key: 'period_start',   sheet: 'period_start',   labelKey: 'cycleQuickLog_periodStart' },
  { key: 'period_end',     sheet: 'period_end',     labelKey: 'cycleCalendar_logEntry_periodEnd' },
  { key: 'pregnancy_test', sheet: 'pregnancy_test', labelKey: 'cycleCalendar_logEntry_pregTest' },
  { key: 'sex_drive',      sheet: 'sex_drive',      labelKey: 'cycleCalendar_logEntry_sexDrive' },
  { key: 'clots',          sheet: 'clots',          labelKey: 'cycleCalendar_logEntry_clots' },
  { key: 'weight',         sheet: 'weight',         labelKey: 'cycleCalendar_logEntry_weight' },
  { key: 'water',          sheet: 'water',          labelKey: 'cycleCalendar_logEntry_water' },
  { key: 'activity',       sheet: 'activity',       labelKey: 'cycleCalendar_logEntry_activity' },
]

// The default chips a new user sees before they customize.
export const DEFAULT_CYCLE_QUICK_LOG_KEYS = ['mood', 'symptoms', 'bbt', 'lh']

export function cycleQuickLogByKey(key: string): CycleQuickLogDef | undefined {
  return CYCLE_QUICK_LOGS.find((q) => q.key === key)
}
