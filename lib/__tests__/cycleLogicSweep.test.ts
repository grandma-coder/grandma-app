// Pre-release logic sweep — cycle journey regressions.
// The machine zone matters for the DST cases (America/New_York: Mar 8 / Nov 1 2026).
jest.mock('../supabase', () => ({ supabase: {} }))
import { getCycleCalendarDay, getCycleInfo, phaseOnCycleDay } from '../cycleLogic'
import { buildReminderCycleConfig } from '../cycleReminders'
import {
  computeCycleHistory,
  computeFertileWindow,
  computeIntercourseStats,
  computePMSStats,
  type CycleHistory,
  type CycleLogRow,
} from '../cycleAnalytics'
import { buildCycleNote } from '../grandmaNotes/cycle'
import { tEn } from '../grandmaNotes/testing'

function row(type: CycleLogRow['type'], date: string, value: string | null = null): CycleLogRow {
  return { id: `${type}-${date}`, user_id: 'u', date, type, value, notes: null, created_at: '' }
}

const SETTINGS = { cycleLength: null, periodLength: 5, lutealPhase: 14 }

describe('phaseOnCycleDay — ring dots agree with the day panel', () => {
  it.each([
    [21, 7, 14],
    [21, 7, 18],
    [24, 7, 17],
    [28, 5, 14],
    [45, 10, 9],
    [60, 5, 14],
  ])('cycle %i / period %i / luteal %i', (cycleLength, periodLength, lutealPhase) => {
    const cfg = { lastPeriodStart: '2026-05-01', cycleLength, periodLength, lutealPhase }
    for (let day = 1; day <= cycleLength; day++) {
      const date = new Date(2026, 4, day)
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      expect(phaseOnCycleDay(day, cycleLength, periodLength, lutealPhase)).toBe(getCycleInfo(cfg, iso).phase)
    }
  })
})

describe('computeIntercourseStats — fertile window across DST', () => {
  it('counts the first fertile day after a spring-forward change', () => {
    // Start Mar 1, 28/14 → ovulation day 14, fertile days 9–15 = Mar 9–15. DST began Mar 8.
    const history: CycleHistory = { cycles: [{ startDate: '2026-03-01', endDate: null, lengthDays: null }], avg: 28, min: 28, max: 28 }
    const r = computeIntercourseStats([row('intercourse', '2026-03-09', 'unprotected')], history, SETTINGS, '2026-03-20')
    expect(r.inFertileWindow).toBe(1)
  })
})

describe('computePMSStats', () => {
  it('counts a symptom on the first day of the 7-day PMS window across a fall-back change', () => {
    // Cycle Oct 9 → Nov 5 (28 days); the last 7 days are Oct 30 … Nov 5. DST ended Nov 1.
    const history: CycleHistory = {
      cycles: [
        { startDate: '2026-10-09', endDate: '2026-11-05', lengthDays: 28 },
        { startDate: '2026-11-06', endDate: null, lengthDays: null },
      ],
      avg: 28, min: 28, max: 28,
    }
    const r = computePMSStats([row('symptom', '2026-10-30', 'cramps')], history)
    expect(r.avgDays).toBe(1)
  })

  it('never reports negative "days before period" for symptoms logged while late', () => {
    const history: CycleHistory = { cycles: [{ startDate: '2026-07-01', endDate: null, lengthDays: null }], avg: 28, min: 28, max: 28 }
    // Day 35 of an open 28-day cycle: the period is a week late.
    const r = computePMSStats([row('symptom', '2026-08-04', 'cramps')], history)
    expect(r.avgDaysBeforePeriod).toBeNull()
  })

  it('tags phases with the user\'s period / luteal settings, like the ring', () => {
    const history: CycleHistory = {
      cycles: [
        { startDate: '2026-07-01', endDate: '2026-07-28', lengthDays: 28 },
        { startDate: '2026-07-29', endDate: null, lengthDays: null },
      ],
      avg: 28, min: 28, max: 28,
    }
    // Day 6 with a 7-day period setting is still menstruation.
    const r = computePMSStats([row('symptom', '2026-07-06', 'cramps')], history, { periodLength: 7, lutealPhase: 14 })
    expect(r.topSymptoms[0].dominantPhase).toBe('menstruation')
  })
})

describe('computeFertileWindow', () => {
  const history: CycleHistory = { cycles: [{ startDate: '2026-07-01', endDate: null, lengthDays: null }], avg: null, min: null, max: null }

  it('shows this cycle\'s window when on time', () => {
    const r = computeFertileWindow(history, SETTINGS, '2026-07-05')
    expect(r.current).toEqual({ start: '2026-07-09', end: '2026-07-15', daysLeft: 10 })
  })

  it('has no current window while the period is late (home and calendar pause estimates)', () => {
    // 28-day cycle from Jul 1 → expected Jul 29; Aug 2 is 4 days late.
    const r = computeFertileWindow(history, SETTINGS, '2026-08-02')
    expect(r.current).toBeNull()
  })
})

describe('buildCycleNote — late period', () => {
  it('says the period is late instead of estimating a new cycle', () => {
    const history = { cycles: [{ startDate: '2026-07-01', endDate: null, lengthDays: null }], avg: null, min: null, max: null }
    const l = buildCycleNote({
      history,
      info: { cycleDay: 5, phase: 'menstruation', daysUntilPeriod: 24, cycleLength: 28 },
      daysLate: 4,
      today: new Date(2026, 7, 2, 12),
    }, tEn)
    const today = l.notes.find((n) => n.id === 'today')
    expect(today?.title).toBe(tEn('gn_cycle_day_title', { day: 32 }))
    expect(today?.body).toBe(tEn('cycleHome_late_title', { count: 4 }))
    expect(l.suggestion?.text).toBe(tEn('gn_sug_cycle_log'))
  })
})

describe('home config follows a logged period end, like the calendar', () => {
  it.each([
    ['ended early (day 3 of a 5-day setting)', '2026-07-03', '2026-07-04'],
    ['ran long (day 7 of a 5-day setting)', '2026-07-07', '2026-07-06'],
  ])('%s', (_label, end, probe) => {
    const h = computeCycleHistory([row('period_start', '2026-07-01'), row('period_end', end)])
    const cfg = buildReminderCycleConfig(h, { cycleLength: 28, periodLength: 5, lutealPhase: 14 })
    const cal = getCycleCalendarDay({ cycles: h.cycles, cycleLength: 28, periodLength: 5, lutealPhase: 14 }, probe, '2026-07-10')
    expect(getCycleInfo(cfg!, probe).phase).toBe(cal.phase)
  })
})
