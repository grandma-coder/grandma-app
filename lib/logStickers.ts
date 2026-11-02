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
  kicks: 'foot', kick_count: 'foot', symptom: 'thermo', exercise: 'dumbbell', vitamins: 'pill',
  kegel: 'flower', contraction: 'stopwatch', appointment: 'cal', exam_result: 'doc', exam: 'doc',
  nesting: 'crib', birth_prep: 'backpack', ultrasound: 'camera',
}

export const CYCLE_LOG_STICKER: Record<string, SiteStickerName> = {
  period_start: 'drop', period_end: 'drop', mood: 'face3', symptom: 'thermo', symptoms: 'thermo',
  bbt: 'thermo', basal_temp: 'thermo', lh: 'otest', pregnancy_test: 'otest', cm: 'egg', clots: 'drop', intimacy: 'heart',
  intercourse: 'heart', sex_drive: 'flower', water: 'glass', weight: 'scale', activity: 'dumbbell',
  ovulation: 'egg', exam: 'doc', meds: 'pill',
}

export const MENOPAUSE_LOG_STICKER: Record<string, SiteStickerName> = {
  hot_flash: 'flame', night_sweat: 'thermo', sleep: 'moon', low_mood: 'face1', brain_fog: 'brain',
  fatigue: 'cloud', anxiety: 'bubble', palpitations: 'heart', joint_pain: 'foot', headache: 'headache',
  weight: 'scale', vaginal_dryness: 'leaf', libido: 'flower', period: 'drop', hrt: 'pill', note: 'pencil',
}
