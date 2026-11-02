import {
  planPeriodReminder,
  computePeriodReminderPlan,
  buildReminderCycleConfig,
  resolvePeriodReminderEnabled,
  periodReminderContent,
  PERIOD_REMINDER_HOUR,
} from '../cycleReminders'
import { toDateStr } from '../cycleLogic'

// Local-time helper so tests don't depend on the machine's timezone.
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min, 0, 0)
const cfg = (lastPeriodStart: string, cycleLength = 28) => ({ lastPeriodStart, cycleLength, periodLength: 5, lutealPhase: 14 })
const on = (daysBefore = 2) => ({ enabled: true, daysBefore })

describe('planPeriodReminder', () => {
  it('defaults to 2 days before the estimated period at 9:00 local', () => {
    // Period 2026-11-01, 28-day cycle → next estimated 2026-11-29.
    const plan = planPeriodReminder(cfg('2026-11-01'), on(), at(2026, 11, 2))
    expect(plan?.periodDate).toBe('2026-11-29')
    expect(plan?.fireAt).toEqual(at(2026, 11, 27, PERIOD_REMINDER_HOUR))
    expect(plan?.daysBefore).toBe(2)
  })

  it.each([
    [21, '2026-11-22', at(2026, 11, 20, 9)],
    [28, '2026-11-29', at(2026, 11, 27, 9)],
    [35, '2026-12-06', at(2026, 12, 4, 9)],
    [45, '2026-12-16', at(2026, 12, 14, 9)],
  ])('cycle length %i → period %s', (len, period, fireAt) => {
    const plan = planPeriodReminder(cfg('2026-11-01', len), on(), at(2026, 11, 2))
    expect(plan?.periodDate).toBe(period)
    expect(plan?.fireAt).toEqual(fireAt)
  })

  it.each([
    [1, at(2026, 11, 28, 9)],
    [2, at(2026, 11, 27, 9)],
    [3, at(2026, 11, 26, 9)],
  ])('%i day(s) before', (daysBefore, fireAt) => {
    const plan = planPeriodReminder(cfg('2026-11-01'), on(daysBefore), at(2026, 11, 2))
    expect(plan?.fireAt).toEqual(fireAt)
    expect(plan?.daysBefore).toBe(daysBefore)
  })

  it('clamps out-of-range daysBefore to 1..3', () => {
    expect(planPeriodReminder(cfg('2026-11-01'), on(0), at(2026, 11, 2))?.daysBefore).toBe(1)
    expect(planPeriodReminder(cfg('2026-11-01'), on(9), at(2026, 11, 2))?.daysBefore).toBe(3)
  })

  it('same day before 9:00 still schedules for today', () => {
    const plan = planPeriodReminder(cfg('2026-11-01'), on(), at(2026, 11, 27, 8, 30))
    expect(plan?.fireAt).toEqual(at(2026, 11, 27, 9))
  })

  it('reminder already passed this cycle → rolls to the next estimated period', () => {
    // 9:00 on the 27th has passed; the period is the 29th.
    const late = planPeriodReminder(cfg('2026-11-01'), on(), at(2026, 11, 27, 9, 1))
    expect(late?.periodDate).toBe('2026-12-27')
    expect(late?.fireAt).toEqual(at(2026, 12, 25, 9))
    // Day before the period with 3 days' notice → also next cycle.
    const dayBefore = planPeriodReminder(cfg('2026-11-01'), on(3), at(2026, 11, 28, 7))
    expect(dayBefore?.periodDate).toBe('2026-12-27')
  })

  it('never returns a time in the past', () => {
    const start = at(2026, 11, 1, 0)
    for (let h = 0; h < 24 * 60; h += 7) {
      const now = new Date(start.getTime() + h * 3600_000)
      for (const d of [1, 2, 3]) {
        for (const len of [21, 28, 33]) {
          const plan = planPeriodReminder(cfg('2026-11-01', len), on(d), now)
          expect(plan).not.toBeNull()
          expect(plan!.fireAt.getTime()).toBeGreaterThan(now.getTime())
          expect(plan!.fireAt.getHours()).toBe(9)
        }
      }
    }
  })

  it('late period (no new log) follows the projected next cycle', () => {
    // Last period 2026-09-01, 28 days → projected 09-29, 10-27, 11-24.
    const plan = planPeriodReminder(cfg('2026-09-01'), on(), at(2026, 11, 2))
    expect(plan?.periodDate).toBe('2026-11-24')
  })

  it('no history → nothing', () => {
    expect(planPeriodReminder(null, on(), at(2026, 11, 2))).toBeNull()
    expect(planPeriodReminder(undefined, on(), at(2026, 11, 2))).toBeNull()
    expect(planPeriodReminder({ lastPeriodStart: '' }, on(), at(2026, 11, 2))).toBeNull()
  })

  it('disabled → nothing', () => {
    expect(planPeriodReminder(cfg('2026-11-01'), { enabled: false, daysBefore: 2 }, at(2026, 11, 2))).toBeNull()
  })
})

describe('buildReminderCycleConfig / computePeriodReminderPlan', () => {
  const settings = { cycleLength: null, periodLength: 5, lutealPhase: 14, periodReminder: null, periodReminderDaysBefore: 2 }
  const history = {
    cycles: [
      { startDate: '2026-09-04', endDate: '2026-10-03', lengthDays: 30 },
      { startDate: '2026-10-04', endDate: null, lengthDays: null },
    ],
    avg: 30,
  }

  it('loading → undefined, no periods → null', () => {
    expect(buildReminderCycleConfig(undefined, settings)).toBeUndefined()
    expect(buildReminderCycleConfig({ cycles: [], avg: null }, settings)).toBeNull()
  })

  it('anchors on the latest period and uses measured average unless declared', () => {
    expect(buildReminderCycleConfig(history, settings)).toEqual({ lastPeriodStart: '2026-10-04', cycleLength: 30, periodLength: 5, lutealPhase: 14 })
    expect(buildReminderCycleConfig(history, { ...settings, cycleLength: 26 })?.cycleLength).toBe(26)
    expect(buildReminderCycleConfig({ cycles: history.cycles, avg: null }, settings)?.cycleLength).toBe(28)
  })

  it('default is ON with history, OFF without; explicit choice wins', () => {
    expect(resolvePeriodReminderEnabled(null, true)).toBe(true)
    expect(resolvePeriodReminderEnabled(null, false)).toBe(false)
    expect(resolvePeriodReminderEnabled(false, true)).toBe(false)
    expect(resolvePeriodReminderEnabled(true, false)).toBe(true)
  })

  it('plans from history + settings', () => {
    const plan = computePeriodReminderPlan(history, settings, at(2026, 11, 2))
    // 2026-10-04 + 30 = 2026-11-03; 2 days before = 11-01 (passed) → next 12-03.
    expect(plan?.periodDate).toBe('2026-12-03')
    expect(toDateStr(plan!.fireAt)).toBe('2026-12-01')
    expect(computePeriodReminderPlan(history, { ...settings, periodReminder: false }, at(2026, 11, 2))).toBeNull()
    expect(computePeriodReminderPlan({ cycles: [], avg: null }, { ...settings, periodReminder: true }, at(2026, 11, 2))).toBeNull()
  })
})

describe('periodReminderContent', () => {
  it('uses the singular body for 1 day and the {{days}} body otherwise', () => {
    // Keys may not be merged into lib/i18n yet — assert on key fallback or text.
    const one = periodReminderContent(1)
    const two = periodReminderContent(2)
    expect(one.title).toBeTruthy()
    expect(one.body).not.toEqual(two.body)
    expect(two.body).not.toContain('{{days}}')
  })
})
