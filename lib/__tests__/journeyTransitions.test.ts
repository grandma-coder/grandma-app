import {
  BABY_ARRIVED_MIN_WEEK,
  daysPastDue,
  canOfferBabyArrived,
  isPastDueDate,
  birthDateBounds,
  isBirthDateAllowed,
  pregnancyTimedNotificationsAllowed,
  journeyNotificationGates,
  journeyAlertIdsToCancel,
  isPositivePregnancyTest,
  positiveTestKey,
  shouldOfferPregnancyFromTest,
  childSexFromBabySex,
  resolveBabyName,
  lmpFromPeriodStarts,
} from '../journeyTransitions'
import { PERIOD_REMINDER_ID } from '../cycleReminders'

// Local-time helper so the tests don't depend on the machine's timezone.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0, 0, 0)

// Due 2026-12-01. Week = 40 - ceil(daysLeft / 7).
const DUE = '2026-12-01'

describe('daysPastDue / isPastDueDate', () => {
  it('is negative before the due date, 0 on it, positive after', () => {
    expect(daysPastDue(DUE, at(2026, 11, 24))).toBe(-7)
    expect(daysPastDue(DUE, at(2026, 12, 1, 23))).toBe(0)
    expect(daysPastDue(DUE, at(2026, 12, 4))).toBe(3)
  })
  it('past due only after the due day', () => {
    expect(isPastDueDate(DUE, at(2026, 12, 1))).toBe(false)
    expect(isPastDueDate(DUE, at(2026, 12, 2))).toBe(true)
    expect(isPastDueDate(null, at(2026, 12, 2))).toBe(false)
  })
})

describe('canOfferBabyArrived', () => {
  it('starts at week 37', () => {
    expect(BABY_ARRIVED_MIN_WEEK).toBe(37)
    // 22 days left → week 36
    expect(canOfferBabyArrived(DUE, at(2026, 11, 9))).toBe(false)
    // 21 days left → week 37
    expect(canOfferBabyArrived(DUE, at(2026, 11, 10))).toBe(true)
  })
  it('stays on past the due date and past week 42', () => {
    expect(canOfferBabyArrived(DUE, at(2026, 12, 20))).toBe(true)
    expect(canOfferBabyArrived(DUE, at(2027, 2, 1))).toBe(true)
  })
  it('is off without a due date', () => {
    expect(canOfferBabyArrived(null, at(2026, 12, 20))).toBe(false)
  })
})

describe('birthDateBounds', () => {
  it('max is today, min is the start of week 22 (due − 126 days)', () => {
    const b = birthDateBounds(DUE, at(2026, 11, 20, 22))
    expect(b.max).toBe('2026-11-20')
    expect(b.min).toBe('2026-07-28')
  })
  it('without a due date the floor is one year back', () => {
    const b = birthDateBounds(null, at(2026, 11, 20))
    expect(b).toEqual({ min: '2025-11-20', max: '2026-11-20' })
  })
  it('isBirthDateAllowed rejects future and too-early dates', () => {
    const b = birthDateBounds(DUE, at(2026, 11, 20))
    expect(isBirthDateAllowed('2026-11-20', b)).toBe(true)
    expect(isBirthDateAllowed('2026-07-28', b)).toBe(true)
    expect(isBirthDateAllowed('2026-11-21', b)).toBe(false)
    expect(isBirthDateAllowed('2026-07-27', b)).toBe(false)
    expect(isBirthDateAllowed('', b)).toBe(false)
    expect(isBirthDateAllowed('not-a-date', b)).toBe(false)
  })
})

describe('pregnancyTimedNotificationsAllowed', () => {
  it('stops two weeks past the due date (42w0d)', () => {
    expect(pregnancyTimedNotificationsAllowed(DUE, at(2026, 12, 14))).toBe(true)
    expect(pregnancyTimedNotificationsAllowed(DUE, at(2026, 12, 15))).toBe(false)
    expect(pregnancyTimedNotificationsAllowed(DUE, at(2027, 3, 1))).toBe(false)
  })
  it('allowed when the due date is unknown', () => {
    expect(pregnancyTimedNotificationsAllowed(null, at(2026, 12, 15))).toBe(true)
  })
})

describe('journeyNotificationGates', () => {
  it('only runs a journey generator while that journey is enrolled', () => {
    expect(journeyNotificationGates(['kids'], DUE, at(2026, 11, 20))).toEqual({ pregnancy: false, pregnancyTimed: false, cycle: false })
    expect(journeyNotificationGates(['pregnancy', 'pre-pregnancy'], DUE, at(2026, 11, 20))).toEqual({ pregnancy: true, pregnancyTimed: true, cycle: true })
  })
  it('keeps pregnancy health alerts but drops timed ones past 42 weeks', () => {
    expect(journeyNotificationGates(['pregnancy'], DUE, at(2026, 12, 20))).toEqual({ pregnancy: true, pregnancyTimed: false, cycle: false })
  })
})

describe('journeyAlertIdsToCancel', () => {
  const scheduled = [
    'reminder-pregnancy-a1',
    'reminder-pregnancy-b2',
    'reminder-pre-pregnancy-c3',
    'reminder-kids-d4',
    PERIOD_REMINDER_ID,
    'local-daily-reminder',
    'local-weekly-summary',
  ]
  it('pregnancy: only the pregnancy reminder alerts', () => {
    expect(journeyAlertIdsToCancel('pregnancy', scheduled)).toEqual(['reminder-pregnancy-a1', 'reminder-pregnancy-b2'])
  })
  it('cycle: its reminder alerts and the period reminder', () => {
    expect(journeyAlertIdsToCancel('pre-pregnancy', scheduled)).toEqual(['reminder-pre-pregnancy-c3', PERIOD_REMINDER_ID])
  })
  it('never touches account-wide schedules', () => {
    for (const b of ['pregnancy', 'pre-pregnancy', 'kids', 'menopause'] as const) {
      const out = journeyAlertIdsToCancel(b, scheduled)
      expect(out).not.toContain('local-daily-reminder')
      expect(out).not.toContain('local-weekly-summary')
    }
  })
})

describe('positive pregnancy test', () => {
  it('detects only a positive result', () => {
    expect(isPositivePregnancyTest('positive')).toBe(true)
    expect(isPositivePregnancyTest('faint')).toBe(false)
    expect(isPositivePregnancyTest('negative')).toBe(false)
    expect(isPositivePregnancyTest(null)).toBe(false)
  })
  it('keys a test by user + day (one test log per day)', () => {
    expect(positiveTestKey('u1', '2026-11-10')).toBe('u1:2026-11-10')
  })
  it('offers once per test, never when already pregnant', () => {
    const key = positiveTestKey('u1', '2026-11-10')
    expect(shouldOfferPregnancyFromTest({ value: 'positive', pregnancyEnrolled: false, prompted: [], key })).toBe(true)
    expect(shouldOfferPregnancyFromTest({ value: 'positive', pregnancyEnrolled: false, prompted: [key], key })).toBe(false)
    expect(shouldOfferPregnancyFromTest({ value: 'positive', pregnancyEnrolled: true, prompted: [], key })).toBe(false)
    expect(shouldOfferPregnancyFromTest({ value: 'negative', pregnancyEnrolled: false, prompted: [], key })).toBe(false)
  })
})

describe('lmpFromPeriodStarts', () => {
  it('latest period start on or before the test day', () => {
    expect(lmpFromPeriodStarts(['2026-09-01', '2026-10-01', '2026-11-20'], '2026-11-10')).toBe('2026-10-01')
    expect(lmpFromPeriodStarts(['2026-10-01', '2026-09-01'], '2026-10-01')).toBe('2026-10-01')
  })
  it('null when nothing qualifies', () => {
    expect(lmpFromPeriodStarts([], '2026-11-10')).toBeNull()
    expect(lmpFromPeriodStarts(['2026-12-01'], '2026-11-10')).toBeNull()
  })
})

describe('baby prefill', () => {
  it('maps the pregnancy profile sex to the children.sex values', () => {
    expect(childSexFromBabySex('Boy')).toBe('male')
    expect(childSexFromBabySex('Girl')).toBe('female')
    expect(childSexFromBabySex('Other')).toBe('other')
    expect(childSexFromBabySex('Not revealed')).toBe('')
    expect(childSexFromBabySex(undefined)).toBe('')
  })
  it('falls back to a placeholder name (children.name is required)', () => {
    expect(resolveBabyName('  Ana ', 'Baby')).toBe('Ana')
    expect(resolveBabyName('   ', 'Baby')).toBe('Baby')
    expect(resolveBabyName(null, 'Baby')).toBe('Baby')
  })
})
