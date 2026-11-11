/**
 * Menstrual Cycle Logic Engine
 *
 * A woman's cycle has 4 phases:
 * 1. MENSTRUATION (Days 1-5 avg) — Period bleeding
 * 2. FOLLICULAR (Days 6-13 avg) — Estrogen rises, follicle matures
 * 3. OVULATION (Days 14-16 avg) — Egg released, peak fertility
 * 4. LUTEAL (Days 17-28 avg) — Progesterone rises, preparing for implantation
 *
 * Fertile window: 5 days before ovulation + ovulation day + 1 day after
 * (sperm survives up to 5 days, egg survives 12-24 hours)
 *
 * Cycle length varies (ACOG: ~24–38 days typical; 21–35 also widely cited;
 * 28 average). The luteal phase is often ~14 days but ranges ~11–17 and varies
 * within the same person, so calendar prediction is an ESTIMATE — BBT, LH
 * tests and cervical mucus are more accurate. ovulation = cycleLength - luteal.
 */

import { brand, stickers } from '../constants/theme'
import { t } from './i18n'

export type CyclePhase = 'menstruation' | 'follicular' | 'ovulation' | 'luteal'

export interface CycleInfo {
  /** Current day in the cycle (1-based) */
  cycleDay: number
  /** Current phase name */
  phase: CyclePhase
  /** Display name for the phase */
  phaseLabel: string
  /** Phase description */
  phaseDescription: string
  /** Color associated with the phase */
  phaseColor: string
  /** Days until next period */
  daysUntilPeriod: number
  /** Days until ovulation (negative = already passed) */
  daysUntilOvulation: number
  /** Whether today is in the fertile window */
  isFertile: boolean
  /** Fertile window start day */
  fertileStart: number
  /** Fertile window end day */
  fertileEnd: number
  /** Ovulation day in cycle */
  ovulationDay: number
  /** Cycle length */
  cycleLength: number
  /** Period length */
  periodLength: number
  /** Progress through cycle (0-1) */
  cycleProgress: number
  /** Predicted next period date */
  nextPeriodDate: string
  /** Predicted ovulation date */
  ovulationDate: string
  /** Conception probability today */
  conceptionProbability: 'none' | 'low' | 'medium' | 'high' | 'peak'
  /** Tips for today's phase */
  dailyTips: string[]
  /** Recommended activities for this phase */
  activities: string[]
  /** Nutrition suggestions for this phase */
  nutritionTips: string[]
}

export interface CycleConfig {
  /** Last period start date (YYYY-MM-DD) */
  lastPeriodStart: string
  /** Average cycle length in days (default 28) */
  cycleLength: number
  /** Average period length in days (default 5) */
  periodLength: number
  /** Luteal phase length in days (default 14) */
  lutealPhase: number
}

const DEFAULT_CONFIG: CycleConfig = {
  lastPeriodStart: '',
  cycleLength: 28,
  periodLength: 5,
  lutealPhase: 14,
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00')
  const b = new Date(dateB + 'T00:00:00')
  // Round, not floor: across a spring-forward DST change two local midnights are 23h apart, and
  // floor turned that into one day less — every cycle day after the change was off by one.
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Days past the expected start of the next period (0 if not late, or no period logged). getCycleInfo
 * wraps forward into a new predicted cycle, so callers use this to say "later than expected"
 * instead of showing a fresh fertile window.
 */
export function getDaysLate(config: Partial<CycleConfig>, today: string = toDateStr(new Date())): number {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  if (!cfg.lastPeriodStart) return 0
  const cycleLength = Math.min(60, Math.max(21, cfg.cycleLength))
  return Math.max(0, daysBetween(cfg.lastPeriodStart, today) - cycleLength)
}

export function getCycleInfo(config: Partial<CycleConfig>, forDate?: string): CycleInfo {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  // Medical normal range is ~21–45 days. Below 15, ovulationDay = cycleLength
  // - lutealPhase becomes <= 1, putting ovulation inside the menstruation
  // window and breaking phase math. Clamp to a defensible lower bound so
  // the engine never produces a nonsensical phase from a partial / typo
  // value carried over from onboarding.
  if (cfg.cycleLength < 21) cfg.cycleLength = 21
  if (cfg.cycleLength > 60) cfg.cycleLength = 60
  // Settings allow combinations (e.g. cycle 21, luteal 18, period 7) that put ovulation inside the
  // period and showed "Peak" fertility on bleeding days. Keep ovulation after the period ends.
  cfg.lutealPhase = Math.min(cfg.lutealPhase, cfg.cycleLength - cfg.periodLength - 1)
  const today = forDate ?? toDateStr(new Date())

  if (!cfg.lastPeriodStart) {
    return getEmptyCycleInfo(cfg)
  }

  // Calculate what cycle day we're on
  const daysSincePeriod = daysBetween(cfg.lastPeriodStart, today)

  // Project the date onto a repeating cycle. Use a Euclidean modulo so dates
  // BEFORE lastPeriodStart wrap backward into prior cycles instead of going
  // negative — JS `%` keeps the sign (-23 % 28 === -23), which made every past
  // date land at cycleDay <= 0 and read as menstruation (painting the whole
  // calendar before the last logged period red).
  const dayInCycle = ((daysSincePeriod % cfg.cycleLength) + cfg.cycleLength) % cfg.cycleLength
  const cycleDay = dayInCycle + 1

  const { phase, isFertile, ovulationDay, fertileStart, fertileEnd, conceptionProbability } =
    phaseForCycleDay(cycleDay, cfg.cycleLength, cfg.periodLength, cfg.lutealPhase)

  // Days until next period
  const daysUntilPeriod = cfg.cycleLength - cycleDay + 1
  const daysUntilOvulation = ovulationDay - cycleDay

  // Predicted dates
  const currentCycleStart = addDays(cfg.lastPeriodStart, Math.floor(daysSincePeriod / cfg.cycleLength) * cfg.cycleLength)
  const nextPeriodDate = addDays(currentCycleStart, cfg.cycleLength)
  const ovulationDate = addDays(currentCycleStart, ovulationDay - 1)

  const cycleProgress = (cycleDay - 1) / cfg.cycleLength

  return {
    cycleDay,
    phase,
    phaseLabel: getPhaseLabel(phase),
    phaseDescription: getPhaseDescription(phase),
    phaseColor: getPhaseColor(phase),
    daysUntilPeriod,
    daysUntilOvulation,
    isFertile,
    fertileStart,
    fertileEnd,
    ovulationDay,
    cycleLength: cfg.cycleLength,
    periodLength: cfg.periodLength,
    cycleProgress,
    nextPeriodDate,
    ovulationDate,
    conceptionProbability,
    dailyTips: getPhaseTips(phase, cycleDay, cfg),
    activities: getPhaseActivities(phase),
    nutritionTips: getPhaseNutrition(phase),
  }
}

interface DayPhase {
  phase: CyclePhase
  isFertile: boolean
  ovulationDay: number
  fertileStart: number
  fertileEnd: number
  conceptionProbability: CycleInfo['conceptionProbability']
}

/** Settings clamped the way the engine needs them (cycle 21–60; ovulation after the period). */
function clampSettings(cycleLength: number, periodLength: number, lutealPhase: number) {
  const len = Math.min(60, Math.max(21, cycleLength))
  return { cycleLength: len, periodLength, lutealPhase: Math.min(lutealPhase, len - periodLength - 1) }
}

/**
 * Phase of one 1-based cycle day under the same clamping getCycleInfo applies (cycle 21–60,
 * ovulation after the period). Surfaces that draw a whole cycle (ring dots, PMS tagging) use this
 * so they never disagree with the day panel when settings combine a short cycle with a long period.
 */
export function phaseOnCycleDay(cycleDay: number, cycleLength: number, periodLength: number, lutealPhase: number): CyclePhase {
  const c = clampSettings(cycleLength, periodLength, lutealPhase)
  return phaseForCycleDay(cycleDay, c.cycleLength, c.periodLength, c.lutealPhase).phase
}

/** Phase math for one 1-based cycle day. Inputs are already clamped (see clampSettings). */
function phaseForCycleDay(cycleDay: number, cycleLength: number, periodLength: number, lutealPhase: number): DayPhase {
  // Ovulation typically happens cycleLength - lutealPhase days after period start
  const ovulationDay = cycleLength - lutealPhase

  // Fertile window: 5 days before ovulation through 1 day after. The clinical
  // "6-day window" (Wilcox) ends ON ovulation day; we extend one day for a
  // gentler display buffer — a UI choice, not a claim that day+1 is fertile.
  const fertileStart = Math.max(1, ovulationDay - 5)
  const fertileEnd = ovulationDay + 1

  let phase: CyclePhase
  if (cycleDay <= periodLength) {
    phase = 'menstruation'
  } else if (cycleDay < ovulationDay - 1) {
    phase = 'follicular'
  } else if (cycleDay >= ovulationDay - 1 && cycleDay <= ovulationDay + 1) {
    phase = 'ovulation'
  } else {
    phase = 'luteal'
  }

  const isFertile = cycleDay >= fertileStart && cycleDay <= fertileEnd

  let conceptionProbability: CycleInfo['conceptionProbability'] = 'none'
  if (cycleDay === ovulationDay || cycleDay === ovulationDay - 1) {
    conceptionProbability = 'peak'
  } else if (cycleDay >= ovulationDay - 3 && cycleDay <= ovulationDay + 1) {
    conceptionProbability = 'high'
  } else if (cycleDay >= fertileStart && cycleDay < ovulationDay - 3) {
    conceptionProbability = 'medium'
  } else if (phase === 'follicular' && cycleDay >= periodLength + 1) {
    conceptionProbability = 'low'
  }

  return { phase, isFertile, ovulationDay, fertileStart, fertileEnd, conceptionProbability }
}

function getEmptyCycleInfo(cfg: CycleConfig): CycleInfo {
  return {
    cycleDay: 0,
    phase: 'follicular',
    phaseLabel: t('cyc_phase_notTracking'),
    phaseDescription: t('cyc_phase_emptyDesc'),
    phaseColor: stickers.lilac,
    daysUntilPeriod: 0,
    daysUntilOvulation: 0,
    isFertile: false,
    fertileStart: 0,
    fertileEnd: 0,
    ovulationDay: cfg.cycleLength - cfg.lutealPhase,
    cycleLength: cfg.cycleLength,
    periodLength: cfg.periodLength,
    cycleProgress: 0,
    nextPeriodDate: '',
    ovulationDate: '',
    conceptionProbability: 'none',
    dailyTips: [t('cyc_phase_emptyDesc')],
    activities: [],
    nutritionTips: [],
  }
}

export function getPhaseLabel(phase: CyclePhase): string {
  switch (phase) {
    case 'menstruation': return t('cyc_phase_menstruation')
    case 'follicular': return t('cyc_phase_name_follicular')
    case 'ovulation': return t('cyc_phase_ovulation')
    case 'luteal': return t('cyc_phase_name_luteal')
  }
}

function getPhaseDescription(phase: CyclePhase): string {
  return t(`cyc_phase_desc_${phase}` as const)
}

function getPhaseColor(phase: CyclePhase): string {
  switch (phase) {
    case 'menstruation': return brand.phase.menstrual
    case 'follicular': return brand.phase.follicular
    case 'ovulation': return brand.phase.ovulation
    case 'luteal': return brand.phase.luteal
  }
}

function getPhaseTips(phase: CyclePhase, day: number, cfg: CycleConfig): string[] {
  switch (phase) {
    case 'menstruation':
      return [
        'Take it easy — your body is working hard. Rest is productive.',
        'Iron-rich foods (spinach, red meat, lentils) help replenish what you lose.',
        'Warm baths or a heating pad can ease cramps naturally.',
        'Stay hydrated — drink at least 8 glasses of water today.',
      ]
    case 'follicular':
      return [
        'Energy is rising — great time for exercise and social activities.',
        'Your skin tends to look its best this phase. Enjoy it!',
        'Start planning any fertility-related appointments or tests.',
        'Eat complex carbs and lean proteins to fuel your rising energy.',
      ]
    case 'ovulation':
      return [
        'Peak fertility window! If trying to conceive, this is the time.',
        'You may notice increased libido — this is completely normal.',
        'Egg-white cervical mucus is a sign of peak fertility.',
        'Light exercise is fine, but avoid extreme physical stress.',
      ]
    case 'luteal':
      if (day > cfg.cycleLength - 5) {
        return [
          'PMS symptoms may appear — bloating, mood changes, breast tenderness.',
          'Magnesium-rich foods (dark chocolate, nuts, bananas) can help with PMS.',
          'If trying to conceive, implantation may be happening now. Avoid alcohol.',
          'Practice self-care: yoga, meditation, or a quiet evening routine.',
        ]
      }
      return [
        'Progesterone is high. You may crave comfort foods — opt for healthy versions.',
        'This is a good time for focused, detail-oriented work.',
        'Keep up gentle exercise — walks and stretching are ideal.',
        'If you experience spotting around day 6-12 post-ovulation, it could be implantation.',
      ]
  }
}

function getPhaseActivities(phase: CyclePhase): string[] {
  switch (phase) {
    case 'menstruation':
      return ['Gentle yoga', 'Walking', 'Meditation', 'Journaling', 'Rest']
    case 'follicular':
      return ['HIIT workouts', 'Running', 'Strength training', 'Dancing', 'Social activities']
    case 'ovulation':
      return ['Moderate exercise', 'Swimming', 'Pilates', 'Partner time', 'Light cardio']
    case 'luteal':
      return ['Yoga', 'Walking', 'Stretching', 'Reading', 'Warm baths']
  }
}

function getPhaseNutrition(phase: CyclePhase): string[] {
  switch (phase) {
    case 'menstruation':
      return [
        'Iron: spinach, red meat, lentils, fortified cereals',
        'Vitamin C: citrus, berries (helps iron absorption)',
        'Omega-3: salmon, walnuts, chia seeds (anti-inflammatory)',
        'Hydration: water, herbal teas, bone broth',
      ]
    case 'follicular':
      return [
        'Lean proteins: chicken, fish, eggs, tofu',
        'Complex carbs: oats, quinoa, sweet potato',
        'Fermented foods: yogurt, kimchi, sauerkraut',
        'Fresh vegetables: broccoli, kale, peppers',
      ]
    case 'ovulation':
      return [
        'Antioxidants: berries, dark chocolate, green tea',
        'Zinc: pumpkin seeds, chickpeas, beef',
        'B vitamins: whole grains, eggs, leafy greens',
        'Light, easily digestible meals',
      ]
    case 'luteal':
      return [
        'Magnesium: dark chocolate, almonds, bananas',
        'Complex carbs: brown rice, whole wheat pasta',
        'Calcium: dairy, fortified plant milk, almonds',
        'Fiber: beans, oats, flaxseeds (helps with bloating)',
      ]
  }
}

// ─── Calendar days (logged history + estimates) ─────────────────────────────

/** One cycle from the logged history (see computeCycleHistory). */
export interface CycleSpan {
  /** Logged period start (YYYY-MM-DD). */
  startDate: string
  /** Days until the next logged start; null for the latest (still open) cycle. */
  lengthDays: number | null
  /** Logged period end inside this cycle, if any. */
  periodEnd?: string | null
}

export interface CycleCalendarInput {
  /** Chronological cycles from the logged period starts. */
  cycles: CycleSpan[]
  /** Expected cycle length (declared setting, else measured average, else 28). */
  cycleLength: number
  periodLength: number
  lutealPhase: number
}

export interface CycleCalendarDay {
  /** 1-based day of the cycle; null outside the tracked history. */
  cycleDay: number | null
  /** null when there is nothing to say (before tracking, late/paused, an implausible cycle). */
  phase: CyclePhase | null
  isPeriod: boolean
  isFertile: boolean
  isOvulation: boolean
  /** An estimate for a day that hasn't been confirmed by a logged period yet. */
  predicted: boolean
  /** Days past the expected start, for a day in a late, still-open cycle. */
  daysLate: number
  conceptionProbability: CycleInfo['conceptionProbability']
}

const EMPTY_CALENDAR_DAY: CycleCalendarDay = {
  cycleDay: null, phase: null, isPeriod: false, isFertile: false, isOvulation: false,
  predicted: false, daysLate: 0, conceptionProbability: 'none',
}

/**
 * Closed cycles outside this range are a missed or doubled log: show the period, not a fertile guess.
 * Same range as the measured average (cycleAnalytics AVG_RANGE): 45–60-day cycles are real.
 */
const PLAUSIBLE_CYCLE = { min: 15, max: 60 }

function calendarDay(
  cycleDay: number,
  cycleLength: number,
  periodLength: number,
  lutealPhase: number,
  predicted: boolean,
): CycleCalendarDay {
  const c = clampSettings(cycleLength, periodLength, lutealPhase)
  const p = phaseForCycleDay(cycleDay, c.cycleLength, c.periodLength, c.lutealPhase)
  const isPeriod = p.phase === 'menstruation'
  return {
    cycleDay,
    phase: p.phase,
    isPeriod,
    isFertile: !isPeriod && p.isFertile,
    isOvulation: !isPeriod && cycleDay === p.ovulationDay,
    predicted,
    daysLate: 0,
    conceptionProbability: p.conceptionProbability,
  }
}

/**
 * Bleeding days for a cycle: the logged end when there is a believable one, else the setting.
 * The home / analytics config uses this for the current cycle so a logged period end moves the
 * ring and day panel the same way it moves the calendar.
 */
export function periodLengthFor(cycle: Pick<CycleSpan, 'startDate' | 'periodEnd'>, fallback: number): number {
  if (!cycle.periodEnd) return fallback
  const n = daysBetween(cycle.startDate, cycle.periodEnd) + 1
  return n >= 1 && n <= 15 ? n : fallback
}

/**
 * What the calendar shows for one day, from the LOGGED cycles rather than one repeating pattern:
 *  - before the first logged period: nothing (no invented past);
 *  - inside a past cycle: that cycle's real length and logged period end;
 *  - the open cycle and later ones: estimates from the expected length (`predicted` once they
 *    haven't happened yet);
 *  - once the period is later than expected, estimates pause (same as the home): days up to today
 *    carry `daysLate`, later days stay blank until a new period is logged.
 */
export function getCycleCalendarDay(
  input: CycleCalendarInput,
  date: string,
  today: string = toDateStr(new Date()),
): CycleCalendarDay {
  const { cycles, periodLength, lutealPhase } = input
  if (cycles.length === 0 || date < cycles[0].startDate) return EMPTY_CALENDAR_DAY

  let idx = 0
  for (let i = 0; i < cycles.length; i++) if (cycles[i].startDate <= date) idx = i
  const cycle = cycles[idx]
  const since = daysBetween(cycle.startDate, date)
  const periodLen = periodLengthFor(cycle, periodLength)

  // A past cycle, closed by the next logged start.
  if (cycle.lengthDays !== null && idx < cycles.length - 1) {
    const len = cycle.lengthDays
    if (len < PLAUSIBLE_CYCLE.min || len > PLAUSIBLE_CYCLE.max) {
      return since < periodLen
        ? { ...EMPTY_CALENDAR_DAY, cycleDay: since + 1, phase: 'menstruation', isPeriod: true }
        : { ...EMPTY_CALENDAR_DAY, cycleDay: since + 1 }
    }
    return calendarDay(since + 1, len, periodLen, lutealPhase, false)
  }

  // The latest (open) cycle and the estimated ones after it.
  const expected = Math.min(60, Math.max(21, input.cycleLength))
  const lateToday = daysBetween(cycle.startDate, today) - expected
  if (since < expected) {
    return calendarDay(since + 1, expected, periodLen, lutealPhase, date > today)
  }
  if (lateToday > 0) {
    if (date > today) return EMPTY_CALENDAR_DAY
    return { ...EMPTY_CALENDAR_DAY, cycleDay: since + 1, daysLate: since - expected }
  }
  const dayInCycle = since % expected
  return calendarDay(dayInCycle + 1, expected, periodLength, lutealPhase, true)
}

/**
 * Get calendar dots for a full month showing period, fertile, and ovulation days
 */
export function getMonthCycleDots(
  config: Partial<CycleConfig>,
  year: number,
  month: number // 0-indexed
): { date: string; color: string; type: string }[] {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  if (!cfg.lastPeriodStart) return []

  const dots: { date: string; color: string; type: string }[] = []
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const info = getCycleInfo(cfg, dateStr)

    if (info.phase === 'menstruation') {
      dots.push({ date: dateStr, color: brand.phase.menstrual, type: 'period' })
    } else if (info.cycleDay === info.ovulationDay) {
      dots.push({ date: dateStr, color: brand.phase.ovulation, type: 'ovulation' })
    } else if (info.isFertile) {
      dots.push({ date: dateStr, color: stickers.yellow, type: 'fertile' })
    }
  }

  return dots
}

/**
 * Hydration tracking helpers
 */
export const DAILY_WATER_GOAL = 8 // glasses (250ml each = 2L)
export const DAILY_WATER_ML = 2000

export function getHydrationLevel(glassesConsumed: number): {
  percentage: number
  label: string
  color: string
  message: string
} {
  const pct = Math.min(100, Math.round((glassesConsumed / DAILY_WATER_GOAL) * 100))
  if (pct >= 100) return { percentage: pct, label: 'Great!', color: stickers.blue, message: 'You hit your water goal! Keep it up.' }
  if (pct >= 75) return { percentage: pct, label: 'Almost there', color: stickers.blue, message: 'Just a couple more glasses to go.' }
  if (pct >= 50) return { percentage: pct, label: 'Halfway', color: stickers.yellow, message: 'Keep drinking — hydration supports your overall wellbeing.' }
  if (pct >= 25) return { percentage: pct, label: 'Low', color: stickers.coral, message: 'You need more water. Dehydration affects your cycle.' }
  return { percentage: pct, label: 'Very low', color: brand.phase.menstrual, message: 'Drink water now! Staying hydrated supports your overall wellbeing.' }
}

/**
 * Daily conception probability curve for a full cycle (1-indexed days).
 *
 * Returns an array of length `cycleLength` where index 0 = day 1.
 * Values are 0–100, representing the published day-specific probability of
 * conception from a single cycle (Wilcox NEJM 1995 / Dunson Hum Reprod 2002):
 * peak ~33% the day before/of ovulation, sharp drop-off either side, low
 * baseline during menstruation + early follicular. This is a population
 * estimate, not a personal prediction.
 */
export function dailyFertilityCurve(cycleLength: number, lutealPhase = 14): number[] {
  const len = Math.max(21, Math.min(60, Math.round(cycleLength)))
  const ovulationDay = len - lutealPhase
  const arr: number[] = []
  for (let day = 1; day <= len; day++) {
    arr.push(probabilityForDay(day, ovulationDay))
  }
  return arr
}

// CLINICAL-REVIEW: pending sign-off — Wilcox NEJM 1995 / Dunson Hum Reprod 2002.
// Day-specific conception probabilities; peak ~33% (was 70 — overstated ~2x).
function probabilityForDay(day: number, ovulationDay: number): number {
  const diff = day - ovulationDay
  // Peak: days ovulation−1 and ovulation
  if (diff === -1 || diff === 0) return 33
  // High: ovulation−2, and ovulation+1 (early-luteal estimate — clinician: verify ovulation+1 against Wilcox Table 2; literature suggests ~8–12%)
  if (diff === 1 || diff === -2) return 22
  // Medium: ovulation−3, ovulation+2
  if (diff === -3 || diff === 2) return 12
  // Low: ovulation−4, ovulation−5
  if (diff === -4 || diff === -5) return 7
  // Tail: ovulation−6 / ovulation+3 (sperm survival edge / very early luteal)
  if (diff === -6 || diff === 3) return 4
  // Baseline outside the window: 1–2% depending on phase
  if (diff < -6) return 2
  return 1
}
