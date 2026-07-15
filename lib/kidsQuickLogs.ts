// kidsQuickLogs.ts — the catalog of quick-log chips available on the kids home
// "Today at a glance" card. Single source of truth shared by the card
// (KidsTodaySummaryCard) and the customization picker (KidsQuickLogPicker).
//
// Mirrors lib/pregnancyQuickLogs.ts / lib/cycleQuickLogs.ts. Kids has no
// week/stage gating for v1, but each chip does need to know which child_logs
// `type` strings count as "logged today" (feeding covers both 'feeding' and
// 'food'), so the card can render the green-done state + progress line.
import type { TranslationKey } from './i18n'

export interface KidsQuickLogDef {
  key: string          // stable id, stored in the user's enabled list
  logType: string      // the log sheet this chip opens (KidsHome logSheetType)
  labelKey: TranslationKey // display label on the chip + in the picker
  doneTypes: string[]  // child_logs.type values that mark this chip done today
}

export const KIDS_QUICK_LOGS: KidsQuickLogDef[] = [
  { key: 'sleep',    logType: 'sleep',    labelKey: 'kids_logForm_labelSleep',    doneTypes: ['sleep'] },
  { key: 'mood',     logType: 'mood',     labelKey: 'kids_logForm_labelMood',     doneTypes: ['mood'] },
  { key: 'feeding',  logType: 'feeding',  labelKey: 'kids_logForm_labelFeeding',  doneTypes: ['feeding', 'food'] },
  { key: 'activity', logType: 'activity', labelKey: 'kids_logForm_labelActivity', doneTypes: ['activity'] },
  { key: 'diaper',   logType: 'diaper',   labelKey: 'kids_logForm_labelDiaper',   doneTypes: ['diaper'] },
]

// The default chips a new user sees before they customize (the 4 hero metrics).
export const DEFAULT_KIDS_QUICK_LOG_KEYS = ['sleep', 'mood', 'feeding', 'activity']

export function kidsQuickLogByKey(key: string): KidsQuickLogDef | undefined {
  return KIDS_QUICK_LOGS.find((q) => q.key === key)
}
