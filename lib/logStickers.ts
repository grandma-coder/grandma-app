/**
 * One sticker per log type, per journey — the single source for every surface that shows
 * a log (home dock, log sheet title, calendar timeline, detail sheets). Change it here.
 */
import type { SiteStickerName } from '../components/stickers/SiteSticker'

export const KIDS_LOG_STICKER: Record<string, SiteStickerName> = {
  feeding: 'bottle', food: 'avocado', sleep: 'moon', wake_up: 'sun', mood: 'face3', activity: 'shoe',
  diaper: 'diaper', health: 'thermo', medicine: 'pill', vaccine: 'syringe', growth: 'ruler',
  memory: 'camera', exam: 'doc', bath: 'drop', potty: 'diaper',
}

export const PREGNANCY_LOG_STICKER_MAP: Record<string, SiteStickerName> = {
  mood: 'face3', water: 'glass', sleep: 'moon', meals: 'avocado', nutrition: 'avocado', weight: 'scale',
  kicks: 'foot', kick_count: 'foot', symptom: 'headache', exercise: 'dumbbell', vitamins: 'pill',
  kegel: 'flower', contraction: 'stopwatch', appointment: 'cal', exam_result: 'doc', exam: 'doc',
  nesting: 'crib', birth_prep: 'backpack', ultrasound: 'camera',
}

export const CYCLE_LOG_STICKER: Record<string, SiteStickerName> = {
  period_start: 'drop', period_end: 'leaf', mood: 'face3', symptom: 'headache', symptoms: 'headache',
  bbt: 'thermo', basal_temp: 'thermo', lh: 'otest', pregnancy_test: 'otest', cm: 'egg', clots: 'drop', intimacy: 'love',
  intercourse: 'love', sex_drive: 'flower', water: 'glass', weight: 'scale', activity: 'dumbbell',
  ovulation: 'egg', exam: 'doc', meds: 'pill',
}

export const MENOPAUSE_LOG_STICKER: Record<string, SiteStickerName> = {
  hot_flash: 'flame', night_sweat: 'thermo', sleep: 'moon', low_mood: 'face1', brain_fog: 'brain',
  fatigue: 'cloud', anxiety: 'bubble', palpitations: 'heart', joint_pain: 'foot', headache: 'headache',
  weight: 'scale', vaginal_dryness: 'leaf', libido: 'flower', period: 'drop', hrt: 'pill', note: 'pencil',
}


/**
 * Calendar day marks — which logged types earn a mini sticker under the day, most telling first.
 * Anything logged but not listed still shows as a small dot (via DayMarks overflow).
 */
const CYCLE_MARK_ORDER = ['intercourse', 'intimacy', 'pregnancy_test', 'lh', 'period_start', 'period_end', 'clots', 'symptom', 'symptoms', 'mood']
const PREGNANCY_MARK_ORDER = ['appointment', 'contraction', 'kicks', 'kick_count', 'exam_result', 'exam', 'ultrasound', 'symptom', 'mood']

function marksFor(types: Iterable<string>, order: string[], map: Record<string, SiteStickerName>): SiteStickerName[] {
  const set = new Set(types)
  const out: SiteStickerName[] = []
  for (const t of order) if (set.has(t) && map[t]) out.push(map[t])
  // Logged things outside the list still count, so the overflow dot appears.
  for (const t of set) if (!order.includes(t) && map[t]) out.push(map[t])
  return out
}

export function cycleDayMarks(types: Iterable<string>): SiteStickerName[] {
  return marksFor(types, CYCLE_MARK_ORDER, CYCLE_LOG_STICKER)
}

export function pregnancyDayMarks(types: Iterable<string>): SiteStickerName[] {
  return marksFor(types, PREGNANCY_MARK_ORDER, PREGNANCY_LOG_STICKER_MAP)
}
