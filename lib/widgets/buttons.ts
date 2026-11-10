/**
 * Widget log buttons: the four defaults per journey and the full list people can pick from in
 * "Edit Widget". Labels and stickers are the app's own (quick-log short labels, lib/logStickers),
 * so a log looks the same on the home screen as inside the app.
 */
import { t } from '../i18n'
import type { TranslationKey } from '../i18n'
import { CYCLE_QUICK_LOGS } from '../cycleQuickLogs'
import { PREG_QUICK_LOGS } from '../pregnancyQuickLogs'
import { KIDS_QUICK_LOGS } from '../kidsQuickLogs'
import { CYCLE_LOG_STICKER, KIDS_LOG_STICKER, MENOPAUSE_LOG_STICKER, PREGNANCY_LOG_STICKER } from '../logStickers'
import { menopauseSymptomLabel, type MenopauseSymptomId } from '../menopauseSymptoms'
import { WIDGET_BUTTONS, buildLogUrl, widgetLogTypes, type WidgetJourney } from './deepLinks'
import type { WidgetButton } from './types'

const STICKERS: Record<WidgetJourney, Record<string, string>> = {
  cycle: CYCLE_LOG_STICKER,
  pregnancy: PREGNANCY_LOG_STICKER,
  kids: KIDS_LOG_STICKER,
  menopause: MENOPAUSE_LOG_STICKER,
}

const CYCLE_EXTRA: Record<string, TranslationKey> = { exam: 'cycleCalendar_logEntry_exam' }

/** The app's short label for a log type, or null when the app has none (then it isn't offered). */
export function logLabel(journey: WidgetJourney, type: string): string | null {
  switch (journey) {
    case 'cycle': {
      const def = CYCLE_QUICK_LOGS.find((q) => q.sheet === type)
      const key = def?.shortKey ?? CYCLE_EXTRA[type]
      return key ? t(key) : null
    }
    case 'pregnancy': {
      const def = PREG_QUICK_LOGS.find((q) => q.logType === type)
      return def ? t(def.shortKey) : null
    }
    case 'kids': {
      const def = KIDS_QUICK_LOGS.find((q) => q.logType === type)
      return def ? t(def.shortKey) : null
    }
    case 'menopause':
      return type === 'period' ? t('meno_s_period') : menopauseSymptomLabel(type as MenopauseSymptomId)
  }
}

export function logSticker(journey: WidgetJourney, type: string): string {
  return STICKERS[journey][type] ?? 'star'
}

function button(journey: WidgetJourney, type: string, label: string, childId?: string): WidgetButton {
  return { type, label, sticker: logSticker(journey, type), url: buildLogUrl(journey, type, childId) }
}

/** The four buttons a widget shows until the person picks their own. */
export function buttonsFor(journey: WidgetJourney, childId?: string): WidgetButton[] {
  return WIDGET_BUTTONS[journey].map((b) => button(journey, b.type, logLabel(journey, b.type) ?? t(b.labelKey), childId))
}

/** Everything the person can put on a button, in the app's order. Intimate types are never here. */
export function choicesFor(journey: WidgetJourney, childId?: string): WidgetButton[] {
  const out: WidgetButton[] = []
  for (const type of widgetLogTypes(journey)) {
    const label = logLabel(journey, type)
    if (label) out.push(button(journey, type, label, childId))
  }
  return out
}
