/**
 * Home-screen widget and app-icon shortcut links:
 *   grandma-app://log/<journey>/<type>[?child=<id>]
 * `type` is a log type the journey's home can open as a sheet, or `home` to just open
 * that journey. Handled by app/log/[journey]/[type].tsx.
 */
import type { LogType } from '../../components/calendar/LogActivitySheet'
import type { PregnancyLogType } from '../../components/calendar/PregnancyLogRouter'
import type { KidsLogType } from '../../components/calendar/KidsLogRouter'
import type { MenopauseLogPick } from '../../components/menopause/MenopauseLogSheet'
import type { TranslationKeys } from '../i18n/keys'
import type { JourneyMode } from '../../types'

export type WidgetJourney = 'cycle' | 'pregnancy' | 'kids' | 'menopause'

export interface ParsedLink {
  journey: WidgetJourney
  mode: JourneyMode
  /** null = open the journey home without a sheet. */
  type: string | null
  childId: string | null
}

const MODE: Record<WidgetJourney, JourneyMode> = {
  cycle: 'pre-pregnancy',
  pregnancy: 'pregnancy',
  kids: 'kids',
  menopause: 'menopause',
}

const CYCLE_TYPES = [
  // No intercourse / sex_drive: any web page can send a link, and minors must never get those sheets.
  'period_start', 'period_end', 'symptom', 'mood', 'basal_temp', 'exam', 'pregnancy_test',
  'clots', 'weight', 'water', 'activity', 'lh', 'cm',
] as const satisfies readonly LogType[]
const PREGNANCY_TYPES = [
  'mood', 'weight', 'symptom', 'appointment', 'exam_result', 'kick_count', 'sleep', 'exercise', 'nutrition',
  'kegel', 'water', 'vitamins', 'nesting', 'birth_prep', 'contraction',
] as const satisfies readonly PregnancyLogType[]
const KIDS_TYPES = [
  'feeding', 'sleep', 'wake_up', 'health', 'mood', 'memory', 'activity', 'diaper', 'exam',
] as const satisfies readonly KidsLogType[]
const MENOPAUSE_TYPES = [
  'period', 'hot_flash', 'night_sweat', 'sleep', 'fatigue', 'low_mood', 'anxiety', 'brain_fog', 'joint_pain',
  'headache', 'palpitations', 'weight', 'vaginal_dryness', 'libido',
] as const satisfies readonly MenopauseLogPick[]

const ALLOWED: Record<WidgetJourney, readonly string[]> = {
  cycle: CYCLE_TYPES,
  pregnancy: PREGNANCY_TYPES,
  kids: KIDS_TYPES,
  menopause: MENOPAUSE_TYPES,
}

export interface WidgetButtonDef {
  type: string
  labelKey: keyof TranslationKeys
}

/** The four log buttons each journey's medium/large widget (and icon shortcuts) offer. */
export const WIDGET_BUTTONS: Record<WidgetJourney, WidgetButtonDef[]> = {
  cycle: [
    { type: 'period_start', labelKey: 'widget_btn_period' },
    { type: 'symptom', labelKey: 'widget_btn_symptoms' },
    { type: 'mood', labelKey: 'widget_btn_mood' },
    { type: 'basal_temp', labelKey: 'widget_btn_temp' },
  ],
  pregnancy: [
    { type: 'mood', labelKey: 'widget_btn_mood' },
    { type: 'symptom', labelKey: 'widget_btn_symptoms' },
    { type: 'kick_count', labelKey: 'widget_btn_kicks' },
    { type: 'water', labelKey: 'widget_btn_water' },
  ],
  kids: [
    { type: 'feeding', labelKey: 'widget_btn_feed' },
    { type: 'sleep', labelKey: 'widget_btn_sleep' },
    { type: 'diaper', labelKey: 'widget_btn_diaper' },
    { type: 'mood', labelKey: 'widget_btn_mood' },
  ],
  menopause: [
    { type: 'hot_flash', labelKey: 'widget_btn_hotFlash' },
    { type: 'night_sweat', labelKey: 'widget_btn_sweats' },
    { type: 'sleep', labelKey: 'widget_btn_sleep' },
    { type: 'low_mood', labelKey: 'widget_btn_mood' },
  ],
}

/** Every log type a widget button may open for this journey (the deep-link allow-list). */
export const widgetLogTypes = (j: WidgetJourney): readonly string[] => ALLOWED[j]

export const journeyToMode = (j: WidgetJourney): JourneyMode => MODE[j]
export const modeToJourney = (m: JourneyMode): WidgetJourney => (m === 'pre-pregnancy' ? 'cycle' : m)

export const buildLogUrl = (j: WidgetJourney, type: string, childId?: string): string =>
  `grandma-app://log/${j}/${type}${childId ? `?child=${encodeURIComponent(childId)}` : ''}`

export const buildHomeUrl = (j: WidgetJourney, childId?: string): string => buildLogUrl(j, 'home', childId)

export function parseWidgetLink(journey: string, type: string, child?: string): ParsedLink | null {
  if (!Object.prototype.hasOwnProperty.call(MODE, journey)) return null
  const j = journey as WidgetJourney
  if (type !== 'home' && !ALLOWED[j].includes(type)) return null
  return { journey: j, mode: MODE[j], type: type === 'home' ? null : type, childId: child || null }
}
