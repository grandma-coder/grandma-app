/**
 * Notification copy — every title/body the notification engine writes, in the
 * app language at generation time (rows are stored with their text).
 *
 * Tone (docs/compliance/2026-11-02-regras-saude.md): calm, no streak pressure or
 * hype, no scores or verdicts, estimates called estimates, health rows say what
 * was logged and point to the doctor/midwife — never diagnose.
 *
 * Also rewrites legacy wellness rows (written before the neutral-wording fix,
 * "needs attention" / "score is 3.2/10") at display time.
 */

import { t, type TranslationKey } from './i18n'
import { dateLoc } from './kpLocale'
import { getWeekData, localizedBabySize } from './pregnancyData'
import { useLanguageStore } from '../store/useLanguageStore'

export interface NotificationCopy {
  title: string
  body: string
}

type Params = Record<string, string | number>

function plural(n: number, one: TranslationKey, other: TranslationKey, params: Params = {}): string {
  return t(n === 1 ? one : other, { count: n, ...params })
}

function num(n: number, maxFractionDigits = 1): string {
  return n.toLocaleString(dateLoc(), { maximumFractionDigits: maxFractionDigits })
}

const childOr = (name: string | null | undefined) => name || t('notifEng_yourChild')

// ─── Kids: wellness ──────────────────────────────────────────────────────────

export type WellnessPillar = 'nutrition' | 'sleep' | 'mood' | 'health' | 'growth'

const PILLAR_KEY: Record<WellnessPillar, TranslationKey> = {
  nutrition: 'notifEng_pillar_nutrition',
  sleep: 'notifEng_pillar_sleep',
  mood: 'notifEng_pillar_mood',
  health: 'notifEng_pillar_health',
  growth: 'notifEng_pillar_growth',
}

export function wellnessDropCopy(child: string, pillar: WellnessPillar): NotificationCopy {
  return {
    title: t('notifEng_wellnessDrop_title', { child, pillar: t(PILLAR_KEY[pillar]) }),
    body: t('notifEng_wellnessDrop_body', { child }),
  }
}

export function wellnessImproveCopy(child: string, pillar: WellnessPillar): NotificationCopy {
  return {
    title: t('notifEng_wellnessImprove_title', { child, pillar: t(PILLAR_KEY[pillar]) }),
    body: t('notifEng_wellnessImprove_body'),
  }
}

export function kidsQuietCopy(child: string, days: number): NotificationCopy {
  return {
    title: plural(days, 'notifEng_kidsQuiet_title_one', 'notifEng_kidsQuiet_title_other', { child }),
    body: t('notifEng_kidsQuiet_body'),
  }
}

// ─── Kids: routines ──────────────────────────────────────────────────────────

/** "08:00" / "08:00:00" (Postgres time) → locale clock time; raw string if unparseable. */
export function formatClock(hhmm: string): string {
  const [h, m] = (hhmm || '').split(':').map((n) => parseInt(n, 10))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(dateLoc(), { hour: 'numeric', minute: '2-digit' })
}

export function routineMissedCopy(child: string | null, routine: string, time: string): NotificationCopy {
  return {
    title: t('notifEng_routine_title', { child: childOr(child), routine }),
    body: t('notifEng_routine_body', { time: formatClock(time) }),
  }
}

export function routinesMissedCopy(child: string | null, routines: string[]): NotificationCopy {
  return {
    title: t('notifEng_routines_title', { child: childOr(child), count: routines.length }),
    body: t('notifEng_routines_body', { list: routines.join(', ') }),
  }
}

// ─── Kids: health ────────────────────────────────────────────────────────────

/** Factual: what was logged + "talk to your pediatrician if worried". No verdict. */
export function temperatureCopy(child: string | null, tempC: number, date: Date): NotificationCopy {
  return {
    title: t('notifEng_temp_title', { child: childOr(child), temp: num(tempC) }),
    body: t('notifEng_temp_body', { date: date.toLocaleDateString(dateLoc(), { month: 'short', day: 'numeric' }) }),
  }
}

// ─── Kids: goals + streaks ───────────────────────────────────────────────────

export function sleepGoalCopy(child: string, hours: number, goal: number): NotificationCopy {
  return {
    title: t('notifEng_goalSleep_title', { child }),
    body: t('notifEng_goalSleep_body', { hours: num(hours), goal: num(goal) }),
  }
}

export function activityGoalCopy(child: string, count: number): NotificationCopy {
  return {
    title: t('notifEng_goalActivity_title', { child }),
    body: plural(count, 'notifEng_goalActivity_body_one', 'notifEng_goalActivity_body_other'),
  }
}

export function streakCopy(child: string, days: number): NotificationCopy {
  return {
    title: t('notifEng_streak_title', { child, count: days }),
    body: t('notifEng_streak_body', { child, count: days }),
  }
}

export function streakPausedCopy(child: string): NotificationCopy {
  return {
    title: t('notifEng_streakPaused_title', { child }),
    body: t('notifEng_streakPaused_body'),
  }
}

// ─── Kids: summaries ─────────────────────────────────────────────────────────

const KIDS_LOG_TYPE_KEY: Record<string, TranslationKey> = {
  feeding: 'kids_calendar_labelFeeding',
  food: 'kids_calendar_labelFood',
  sleep: 'kids_calendar_labelSleep',
  wake_up: 'kids_calendar_labelWakeUp',
  health: 'kids_calendar_labelHealth',
  temperature: 'kids_calendar_labelTemperature',
  medicine: 'kids_calendar_labelMedicine',
  vaccine: 'kids_calendar_labelVaccine',
  mood: 'kids_calendar_labelMood',
  memory: 'kids_calendar_labelMemory',
  photo: 'kids_calendar_labelPhoto',
  diaper: 'kids_calendar_labelDiaper',
  growth: 'kids_calendar_labelGrowth',
  milestone: 'kids_calendar_labelMilestone',
  activity: 'kids_calendar_labelActivity',
  note: 'kids_calendar_labelNote',
  skipped: 'kids_calendar_labelSkipped',
  exam: 'kids_calendar_labelExam',
}

/** child_logs.type → label in the app language (raw type if unknown). */
export function kidsLogTypeLabel(type: string): string {
  const key = KIDS_LOG_TYPE_KEY[type]
  return key ? t(key) : type
}

/** `counts`: [type, count] pairs, already sorted/sliced by the caller. */
export function dailySummaryCopy(total: number, counts: [string, number][]): NotificationCopy {
  const parts = counts.map(([type, n]) => `${kidsLogTypeLabel(type)} ${n}`).join(' · ')
  return {
    title: plural(total, 'notifEng_daily_title_one', 'notifEng_daily_title_other'),
    body: t('notifEng_daily_body', { parts }),
  }
}

export function caregiverActivityCopy(
  caregiver: string | null,
  count: number,
  types: string[],
  children: (string | null)[],
): NotificationCopy {
  const name = caregiver || t('notifEng_aCaregiver')
  return {
    title: plural(count, 'notifEng_caregiver_title_one', 'notifEng_caregiver_title_other', { name }),
    body: t('notifEng_caregiver_body', {
      types: types.map(kidsLogTypeLabel).join(', '),
      children: children.map((c) => c || t('notifEng_yourChildInline')).join(' & '),
    }),
  }
}

// ─── Insights, appointments, channels ────────────────────────────────────────

export function insightCopy(title: string, body: string | null | undefined): NotificationCopy {
  return {
    title: t('notifEng_insight_title', { title }),
    body: body?.slice(0, 120) || t('notifEng_insight_bodyFallback'),
  }
}

export function insightsCopy(titles: string[]): NotificationCopy {
  return {
    title: t('notifEng_insights_title', { count: titles.length }),
    body: t('notifEng_insights_body', { titles: titles.join(', ') }),
  }
}

/** Calendar-day difference (local), not a 24h window: 23:00 → 09:00 next day is "tomorrow". */
function dayDiff(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime()
  return Math.round((b - a) / 86400000)
}

export function appointmentCopy(appt: {
  date: Date
  now: Date
  type?: string | null
  doctor?: string | null
  location?: string | null
  notes?: string | null
}): NotificationCopy {
  const time = appt.date.toLocaleTimeString(dateLoc(), { hour: 'numeric', minute: '2-digit' })
  const diff = dayDiff(appt.now, appt.date)
  const when = diff <= 0
    ? t('notifEng_appt_today', { time })
    : diff === 1
      ? t('notifEng_appt_tomorrow', { time })
      : t('notifEng_appt_onDate', { time, date: appt.date.toLocaleDateString(dateLoc(), { weekday: 'short', month: 'short', day: 'numeric' }) })
  const type = appt.type || t('notifEng_appt_defaultType')
  return {
    title: appt.doctor
      ? t('notifEng_appt_titleDoctor', { type, doctor: appt.doctor, when })
      : t('notifEng_appt_title', { type, when }),
    body: appt.location
      ? t('notifEng_appt_location', { location: appt.location })
      : (appt.notes || t('notifEng_appt_bodyFallback')),
  }
}

export function channelActivityCopy(count: number, channel: string | null | undefined): NotificationCopy {
  return {
    title: t('notifEng_channel_title', { count, channel: channel || t('notifEng_channel_fallback') }),
    body: t('notifEng_channel_body'),
  }
}

// ─── Pregnancy ───────────────────────────────────────────────────────────────

/** Week title uses the localized baby size; the development fact only exists in English. */
export function pregnancyWeekCopy(week: number): NotificationCopy {
  const english = useLanguageStore.getState().language === 'en'
  return {
    title: t('notifEng_pregWeek_title', { week, size: localizedBabySize(week) }),
    body: english ? getWeekData(week).developmentFact : t('notifEng_pregWeek_bodyFallback'),
  }
}

export function dueDateCopy(daysToDue: number): NotificationCopy {
  return {
    title: daysToDue === 0
      ? t('notifEng_due_today')
      : plural(daysToDue, 'notifEng_due_title_one', 'notifEng_due_title_other'),
    body: daysToDue <= 3 ? t('notifEng_due_bodySoon') : t('notifEng_due_body'),
  }
}

export function pregnancyQuietCopy(days: number): NotificationCopy {
  return { title: t('notifEng_pregQuiet_title', { count: days }), body: t('notifEng_pregQuiet_body') }
}

// Pregnancy symptom form stores English ids (comma-joined) — see PregnancyLogForms.
const PREG_SYMPTOM_KEY: Record<string, TranslationKey> = {
  'Nausea': 'preg_symptom_nausea',
  'Fatigue': 'preg_symptom_fatigue',
  'Back pain': 'preg_symptom_backPain',
  'Headache': 'preg_symptom_headache',
  'Swelling': 'preg_symptom_swelling',
  'Heartburn': 'preg_symptom_heartburn',
  'Insomnia': 'preg_symptom_insomnia',
  'Cramps': 'preg_symptom_cramps',
  'Mood swings': 'preg_symptom_moodSwings',
  'Cravings': 'preg_symptom_cravings',
  'Braxton Hicks': 'preg_symptom_braxtonHicks',
  'Shortness of breath': 'preg_symptom_shortBreath',
}

/** Symptom log values ("Nausea, Back pain") → unique localized names. Unknown/custom values pass through. */
export function localizedSymptomNames(values: (string | null | undefined)[]): string[] {
  const out: string[] = []
  for (const v of values) {
    for (const raw of (v ?? '').split(',')) {
      const s = raw.trim()
      if (!s) continue
      const key = PREG_SYMPTOM_KEY[s]
      const label = key ? t(key) : s
      if (!out.includes(label)) out.push(label)
    }
  }
  return out
}

export function strongSymptomsCopy(values: (string | null | undefined)[]): NotificationCopy {
  const list = localizedSymptomNames(values).slice(0, 3).join(', ')
  return {
    title: t('notifEng_pregStrong_title'),
    body: t('notifEng_pregStrong_body', { list: list || t('notifEng_pregStrong_fallback') }),
  }
}

export function kickCountCopy(today: number, avg: number): NotificationCopy {
  return {
    title: t('notifEng_kicks_title'),
    body: t('notifEng_kicks_body', { today: num(today, 0), avg: num(avg, 0) }),
  }
}

// ─── Cycle ───────────────────────────────────────────────────────────────────

export function fertileWindowCopy(start: number, end: number, ovulation: number): NotificationCopy {
  return {
    title: t('notifEng_fertile_title'),
    body: t('notifEng_fertile_body', { start, end, ovulation }),
  }
}

export function ovulationCopy(tryingToConceive: boolean, cycleDay: number): NotificationCopy {
  return {
    title: t('notifEng_ovulation_title'),
    body: tryingToConceive ? t('notifEng_ovulation_bodyTtc') : t('notifEng_ovulation_body', { day: cycleDay }),
  }
}

export function periodSoonCopy(days: number): NotificationCopy {
  return {
    title: plural(days, 'notifEng_periodSoon_title_one', 'notifEng_periodSoon_title_other'),
    body: t('notifEng_periodSoon_body'),
  }
}

export function latePeriodCopy(days: number, tryingToConceive: boolean): NotificationCopy {
  return {
    title: t('notifEng_late_title', { count: days }),
    body: tryingToConceive ? t('notifEng_late_bodyTtc') : t('notifEng_late_body'),
  }
}

export function cycleQuietCopy(days: number): NotificationCopy {
  return { title: t('notifEng_cycleQuiet_title', { count: days }), body: t('notifEng_cycleQuiet_body') }
}

// ─── Legacy wellness rows (display-time rewrite) ─────────────────────────────

export interface NotificationText {
  type: string
  title: string
  body: string | null
  data?: Record<string, unknown> | null
}

const SCORE_RE = /\d+(\.\d+)?\s*\/\s*10|\bscore\b|needs attention/i

export function displayNotificationText(n: NotificationText): { title: string; body: string | null } {
  // Mention rows are stored with an English title; rebuild it in the reader's
  // language from the structured fields (newer rows carry channelName/authorName).
  if (n.type === 'mention' && typeof n.data?.channelName === 'string' && n.data.channelName) {
    const author = typeof n.data.authorName === 'string' && n.data.authorName ? n.data.authorName : t('notif_mention_someone')
    return { title: t('notif_mention_title', { name: author, channel: n.data.channelName }), body: n.body }
  }
  const isWellness = n.type === 'wellness_drop' || n.type === 'wellness_improve'
  if (!isWellness || !(SCORE_RE.test(n.title) || SCORE_RE.test(n.body ?? ''))) {
    return { title: n.title, body: n.body }
  }
  // Old titles: "Kenji's Nutrition needs attention" / "Kenji's Sleep is improving!"
  const m = n.title.match(/^(.+?)['’]s\s+(\w+)/)
  const child = m?.[1]?.trim()
  const pillar = m?.[2]?.toLowerCase()
  if (!child || !pillar || !Object.prototype.hasOwnProperty.call(PILLAR_KEY, pillar)) {
    return { title: n.title.replace(SCORE_RE, '').trim(), body: null }
  }
  return n.type === 'wellness_improve'
    ? wellnessImproveCopy(child, pillar as WellnessPillar)
    : wellnessDropCopy(child, pillar as WellnessPillar)
}
