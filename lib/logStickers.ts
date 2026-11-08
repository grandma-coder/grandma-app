/**
 * One sticker per log type, per journey — the single source for every surface that shows
 * a log (home dock, log sheet title, calendar timeline, detail sheets). Change it here.
 */
import type { SiteStickerName } from '../components/stickers/SiteSticker'
import { resolveMenopauseSymptomId } from './menopauseSymptoms'

export const KIDS_LOG_STICKER: Record<string, SiteStickerName> = {
  feeding: 'bottle', food: 'avocado', sleep: 'moon', wake_up: 'sun', mood: 'face3', activity: 'shoe',
  diaper: 'diaper', health: 'thermo', medicine: 'pill', vaccine: 'syringe', growth: 'ruler',
  memory: 'camera', exam: 'doc', bath: 'drop', potty: 'drop',
  // stored child_logs.type values that map onto a canonical log
  temperature: 'thermo', photo: 'camera', milestone: 'star', note: 'pencil',
}

/**
 * Pregnancy: ONE sticker per log type, never shared between two different types. Used by the home
 * quick-log row, the "what do you want to track?" picker, every log sheet header, the quick-access
 * tiles, the calendar day marks and the day detail. Keys cover the quick-log key, the sheet id and
 * the stored `pregnancy_logs.log_type` (`meals` → `nutrition`, `kicks` → `kick_count`; `exam` is the
 * legacy name of `exam_result`).
 */
export const PREGNANCY_LOG_STICKER: Record<string, SiteStickerName> = {
  mood: 'face3', water: 'glass', sleep: 'moon', meals: 'avocado', nutrition: 'avocado', weight: 'scale',
  kicks: 'foot', kick_count: 'foot', symptom: 'headache', exercise: 'dumbbell', vitamins: 'pill',
  kegel: 'flower', contraction: 'stopwatch', appointment: 'cal', exam_result: 'doc', exam: 'doc',
  nesting: 'crib', birth_prep: 'backpack', ultrasound: 'camera',
}
export const PREGNANCY_LOG_STICKER_MAP = PREGNANCY_LOG_STICKER

/** Pregnancy mood options (form + day detail): five moods, five different stickers. */
export const PREGNANCY_MOOD_STICKER: Record<string, SiteStickerName> = {
  excited: 'face4', happy: 'face3', okay: 'face2', anxious: 'face1', energetic: 'star', sad: 'face1',
  // Moods the pregnancy onboarding saves (same faces as its picker).
  calm: 'leaf', tired: 'zz', nauseous: 'face2',
}

/**
 * Cycle: ONE sticker per thing, never shared between two different log types. Used by the home
 * dock, the "what do you want to track?" picker, every log sheet header, the log launcher, the
 * calendar day marks and the day detail. Keys cover both the quick-log key, the sheet id and the
 * stored `cycle_logs.type` (e.g. `cm` sheet → `cervical_mucus` rows).
 * `ovulation` (legacy, no form) shares the egg with LH on purpose: both mean "ovulation".
 */
export const CYCLE_LOG_STICKER: Record<string, SiteStickerName> = {
  period_start: 'drop', period_end: 'leaf', mood: 'face3', symptom: 'headache', symptoms: 'headache',
  bbt: 'thermo', basal_temp: 'thermo', lh: 'egg', pregnancy_test: 'otest',
  cm: 'pee', cervical_mucus: 'pee', clots: 'rasp', intimacy: 'love', intercourse: 'love',
  sex_drive: 'flame', water: 'glass', weight: 'scale', activity: 'dumbbell',
  ovulation: 'egg', exam: 'doc', meds: 'pill',
}

/** Cycle mood value → face. Five distinct stickers for the five moods (low ≠ down). */
export const CYCLE_MOOD_STICKER: Record<string, SiteStickerName> = {
  low: 'face1', down: 'cloud', okay: 'face2', good: 'face3', great: 'face4',
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
