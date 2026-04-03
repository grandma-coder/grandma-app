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
 * Cycle length varies (21-35 days normal, 28 average).
 * Luteal phase is relatively constant (~14 days).
 * So ovulation = cycleLength - 14.
 */

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
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getCycleInfo(config: Partial<CycleConfig>, forDate?: string): CycleInfo {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const today = forDate ?? toDateStr(new Date())

  if (!cfg.lastPeriodStart) {
    return getEmptyCycleInfo(cfg)
  }

  // Calculate what cycle day we're on
  const daysSincePeriod = daysBetween(cfg.lastPeriodStart, today)

  // Handle if we're past the expected cycle length (new cycle predicted)
  const cycleDay = (daysSincePeriod % cfg.cycleLength) + 1

  // Ovulation typically happens cycleLength - lutealPhase days after period start
  const ovulationDay = cfg.cycleLength - cfg.lutealPhase

  // Fertile window: 5 days before ovulation through 1 day after
  const fertileStart = Math.max(1, ovulationDay - 5)
  const fertileEnd = ovulationDay + 1

  // Determine phase
  let phase: CyclePhase
  if (cycleDay <= cfg.periodLength) {
    phase = 'menstruation'
  } else if (cycleDay < ovulationDay - 1) {
    phase = 'follicular'
  } else if (cycleDay >= ovulationDay - 1 && cycleDay <= ovulationDay + 1) {
    phase = 'ovulation'
  } else {
    phase = 'luteal'
  }

  const isFertile = cycleDay >= fertileStart && cycleDay <= fertileEnd

  // Days until next period
  const daysUntilPeriod = cfg.cycleLength - cycleDay + 1
  const daysUntilOvulation = ovulationDay - cycleDay

  // Conception probability
  let conceptionProbability: CycleInfo['conceptionProbability'] = 'none'
  if (cycleDay === ovulationDay || cycleDay === ovulationDay - 1) {
    conceptionProbability = 'peak'
  } else if (cycleDay >= ovulationDay - 3 && cycleDay <= ovulationDay + 1) {
    conceptionProbability = 'high'
  } else if (cycleDay >= fertileStart && cycleDay < ovulationDay - 3) {
    conceptionProbability = 'medium'
  } else if (phase === 'follicular' && cycleDay >= cfg.periodLength + 1) {
    conceptionProbability = 'low'
  }

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

function getEmptyCycleInfo(cfg: CycleConfig): CycleInfo {
  return {
    cycleDay: 0,
    phase: 'follicular',
    phaseLabel: 'Not Tracking',
    phaseDescription: 'Log your last period start date to begin tracking your cycle.',
    phaseColor: '#C4B5FD',
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
    dailyTips: ['Log your last period start date to begin cycle tracking.'],
    activities: [],
    nutritionTips: [],
  }
}

function getPhaseLabel(phase: CyclePhase): string {
  switch (phase) {
    case 'menstruation': return 'Menstruation'
    case 'follicular': return 'Follicular Phase'
    case 'ovulation': return 'Ovulation'
    case 'luteal': return 'Luteal Phase'
  }
}

function getPhaseDescription(phase: CyclePhase): string {
  switch (phase) {
    case 'menstruation':
      return 'Your body is shedding the uterine lining. Rest, stay hydrated, and be gentle with yourself.'
    case 'follicular':
      return 'Estrogen is rising. Energy increases, mood lifts. Great time for planning and new activities.'
    case 'ovulation':
      return 'Peak fertility! The egg is released. Best time to conceive if trying.'
    case 'luteal':
      return 'Progesterone rises preparing for possible implantation. You may feel PMS symptoms toward the end.'
  }
}

function getPhaseColor(phase: CyclePhase): string {
  switch (phase) {
    case 'menstruation': return '#FF6B6B'
    case 'follicular': return '#FF8AD8'
    case 'ovulation': return '#A2FF86'
    case 'luteal': return '#B983FF'
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
      dots.push({ date: dateStr, color: '#FF6B6B', type: 'period' })
    } else if (info.cycleDay === info.ovulationDay) {
      dots.push({ date: dateStr, color: '#A2FF86', type: 'ovulation' })
    } else if (info.isFertile) {
      dots.push({ date: dateStr, color: '#F4FD50', type: 'fertile' })
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
  if (pct >= 100) return { percentage: pct, label: 'Great!', color: '#4D96FF', message: 'You hit your water goal! Keep it up.' }
  if (pct >= 75) return { percentage: pct, label: 'Almost there', color: '#4D96FF', message: 'Just a couple more glasses to go.' }
  if (pct >= 50) return { percentage: pct, label: 'Halfway', color: '#F4FD50', message: 'Keep drinking — hydration helps fertility.' }
  if (pct >= 25) return { percentage: pct, label: 'Low', color: '#FF6B35', message: 'You need more water. Dehydration affects your cycle.' }
  return { percentage: pct, label: 'Very low', color: '#FF6B6B', message: 'Drink water now! Hydration is crucial for conception.' }
}
