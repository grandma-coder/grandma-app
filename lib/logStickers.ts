/**
 * One sticker per log type, per journey — the single source for every surface that shows
 * a log (home dock, log sheet title, calendar timeline, detail sheets). Change it here.
 */
import type { SiteStickerName } from '../components/stickers/SiteSticker'
import { resolveMenopauseSymptomId } from './menopauseSymptoms'

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
 *
 * Principle: mark what is SPECIAL, not routine. Cycle (shipped first) still lets unlisted types
 * count toward the overflow dot; the other journeys list ONLY special types, so feeds, diapers,
 * water, sleep, daily mood or kicks never become a mark nor the overflow dot.
 */
const CYCLE_MARK_ORDER = ['intercourse', 'intimacy', 'pregnancy_test', 'lh', 'period_start', 'period_end', 'clots', 'symptom', 'symptoms', 'mood']
const PREGNANCY_MARK_ORDER = ['appointment', 'exam_result', 'exam', 'ultrasound', 'contraction', 'birth_prep', 'nesting', 'symptom']

function marksFor(types: Iterable<string>, order: string[], map: Record<string, SiteStickerName>): SiteStickerName[] {
  const set = new Set(types)
  const out: SiteStickerName[] = []
  for (const t of order) if (set.has(t) && map[t]) out.push(map[t])
  // Logged things outside the list still count, so the overflow dot appears.
  for (const t of set) if (!order.includes(t) && map[t]) out.push(map[t])
  return out
}

/** Special-only marks: listed types in order, deduped by sticker; anything else is ignored. */
function specialMarksFor(types: Iterable<string>, order: string[], map: Record<string, SiteStickerName>): SiteStickerName[] {
  const set = new Set(types)
  const out: SiteStickerName[] = []
  for (const t of order) {
    const sticker = map[t]
    if (set.has(t) && sticker && !out.includes(sticker)) out.push(sticker)
  }
  return out
}

export function cycleDayMarks(types: Iterable<string>): SiteStickerName[] {
  return marksFor(types, CYCLE_MARK_ORDER, CYCLE_LOG_STICKER)
}

/** Pregnancy: visits, exams, scans, contractions, birth prep, symptoms. Kicks / mood / water never mark. */
export function pregnancyDayMarks(types: Iterable<string>): SiteStickerName[] {
  return specialMarksFor(types, PREGNANCY_MARK_ORDER, PREGNANCY_LOG_STICKER_MAP)
}

/**
 * Kids (`child_logs.type`): vaccine, fever reading, medicine, doctor visit / health note, exam,
 * growth measurement, milestone. Feeds, diapers, sleep, mood, activity, photos never mark.
 * (`note` is what the health form saves for Doctor visit / Injury / Other; `health` is legacy.)
 */
export const KIDS_MARK_ORDER = ['vaccine', 'temperature', 'health', 'medicine', 'note', 'exam', 'growth', 'milestone'] as const
const KIDS_MARK_STICKER: Record<(typeof KIDS_MARK_ORDER)[number], SiteStickerName> = {
  vaccine: 'syringe', temperature: 'thermo', health: 'thermo', medicine: 'pill',
  note: 'doc', exam: 'doc', growth: 'ruler', milestone: 'star',
}

export function kidsDayMarks(types: Iterable<string>): SiteStickerName[] {
  return specialMarksFor(types, [...KIDS_MARK_ORDER], KIDS_MARK_STICKER)
}

/**
 * Menopause (`menopause_logs` rows): period first (it resets the "months since last period"
 * counter), then HRT, then the day's single strongest symptom (highest intensity; first logged
 * wins a tie). Other symptoms of the day show through the day tint, not as marks.
 */
export function menopauseDayMarks(rows: readonly { type: string; severity: number | null }[]): SiteStickerName[] {
  const out: SiteStickerName[] = []
  if (rows.some((r) => r.type === 'period')) out.push('drop')
  if (rows.some((r) => r.type === 'hrt')) out.push('pill')
  let strongest: { id: string; sev: number } | null = null
  for (const r of rows) {
    const id = resolveMenopauseSymptomId(r.type)
    if (!id) continue
    const sev = r.severity ?? 0
    if (!strongest || sev > strongest.sev) strongest = { id, sev }
  }
  if (strongest) {
    const sticker = MENOPAUSE_LOG_STICKER[strongest.id]
    if (sticker && !out.includes(sticker)) out.push(sticker)
  }
  return out
}
