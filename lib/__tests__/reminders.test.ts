import {
  upcomingReminders, allTags, splitReminders, openReminderCount,
  localDateTime, dayOffset, addDays, reminderFireAt, isWhenPast, defaultTimeFor, dueState,
  cleanDraft, createReminder, applyDraft, setReminderDone, draftProblem, newReminderId,
  reminderNotificationId, planReminderAlerts, staleReminderIds, MAX_SCHEDULED_PER_CONTEXT,
  formatReminderDay, formatReminderTime, formatReminderWhen,
  type Reminder, type ReminderDraft,
} from '../reminders'

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }))

const r = (over: Partial<Reminder>): Reminder => ({ id: Math.random().toString(), text: 't', done: false, ...over })
// Local-time helper so tests don't depend on the machine's timezone.
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min, 0, 0)
const draft = (over: Partial<ReminderDraft> = {}): ReminderDraft => ({ text: 'Vitamins', dueDate: null, dueTime: null, notes: '', ...over })
const words = { today: 'Today', tomorrow: 'Tomorrow', yesterday: 'Yesterday' }

describe('upcomingReminders', () => {
  it('excludes done, sorts dated-before-undated, then by date asc, limits to n', () => {
    const list = [
      r({ id: 'a', dueDate: '2026-07-20' }),
      r({ id: 'b', done: true, dueDate: '2026-07-10' }),
      r({ id: 'c', dueDate: '2026-07-15' }),
      r({ id: 'd', dueDate: null }),
    ]
    expect(upcomingReminders(list, 2).map((x) => x.id)).toEqual(['c', 'a'])
  })
  it('orders same-day reminders by time', () => {
    const list = [r({ id: 'late', dueDate: '2026-07-20', dueTime: '18:00' }), r({ id: 'early', dueDate: '2026-07-20', dueTime: '07:30' })]
    expect(upcomingReminders(list, 5).map((x) => x.id)).toEqual(['early', 'late'])
  })
  it('flagged sorts before unflagged among undated', () => {
    const list = [r({ id: 'x', dueDate: null }), r({ id: 'y', dueDate: null, flagged: true })]
    expect(upcomingReminders(list, 5).map((x) => x.id)).toEqual(['y', 'x'])
  })
  it('returns [] for empty input', () => {
    expect(upcomingReminders([], 2)).toEqual([])
  })
})

describe('splitReminders / openReminderCount', () => {
  it('splits dated, undated (insertion order) and done (latest first)', () => {
    const list = [
      r({ id: 'u1' }),
      r({ id: 'd2', dueDate: '2026-11-10', dueTime: '09:00' }),
      r({ id: 'x1', done: true, archivedAt: '2026-11-01T10:00:00.000Z' }),
      r({ id: 'u2' }),
      r({ id: 'd1', dueDate: '2026-11-05' }),
      r({ id: 'x2', done: true, archivedAt: '2026-11-03T10:00:00.000Z' }),
    ]
    const { dated, undated, done } = splitReminders(list)
    expect(dated.map((x) => x.id)).toEqual(['d1', 'd2'])
    expect(undated.map((x) => x.id)).toEqual(['u1', 'u2'])
    expect(done.map((x) => x.id)).toEqual(['x2', 'x1'])
    expect(openReminderCount(list)).toBe(4)
  })
  it('badge counts every open reminder, not just the next two', () => {
    expect(openReminderCount([r({}), r({}), r({}), r({ done: true })])).toBe(3)
  })
})

describe('local date/time', () => {
  it('parses as local wall-clock time', () => {
    expect(localDateTime('2026-11-04', '09:30')).toEqual(at(2026, 11, 4, 9, 30))
    expect(localDateTime('2026-11-04')).toEqual(at(2026, 11, 4, 0, 0))
    expect(localDateTime('nope')).toBeNull()
    expect(localDateTime('2026-11-04', 'x')).toBeNull()
  })
  it('dayOffset counts calendar days', () => {
    const now = at(2026, 11, 4, 23, 50)
    expect(dayOffset('2026-11-04', now)).toBe(0)
    expect(dayOffset('2026-11-05', now)).toBe(1)
    expect(dayOffset('2026-11-03', now)).toBe(-1)
    expect(dayOffset('2026-12-04', now)).toBe(30)
  })
  it('addDays crosses month/year ends', () => {
    expect(addDays(at(2026, 12, 31), 1)).toBe('2027-01-01')
    expect(addDays(at(2026, 2, 28), 2)).toBe('2026-03-02')
  })
  it('fires at the stored wall-clock time; date-only at 09:00', () => {
    expect(reminderFireAt({ dueDate: '2026-11-04', dueTime: '20:15' })).toEqual(at(2026, 11, 4, 20, 15))
    expect(reminderFireAt({ dueDate: '2026-11-04', dueTime: null })).toEqual(at(2026, 11, 4, 9, 0))
    expect(reminderFireAt({ dueDate: null, dueTime: '20:00' })).toBeNull()
  })
  it('keeps the wall-clock hour on both sides of a DST change', () => {
    // Whatever zone the test runs in, the local hour is what was stored.
    for (const d of ['2026-03-08', '2026-03-29', '2026-10-25', '2026-11-01']) {
      const f = reminderFireAt({ dueDate: d, dueTime: '09:00' })!
      expect(f.getHours()).toBe(9)
      expect(f.getMinutes()).toBe(0)
    }
  })
})

describe('isWhenPast / defaultTimeFor / dueState', () => {
  const now = at(2026, 11, 4, 14, 20)
  it('a timed reminder is past once its minute has come', () => {
    expect(isWhenPast('2026-11-04', '14:20', now)).toBe(true)
    expect(isWhenPast('2026-11-04', '14:25', now)).toBe(false)
  })
  it('a date-only reminder is past only after its day', () => {
    expect(isWhenPast('2026-11-04', null, now)).toBe(false)
    expect(isWhenPast('2026-11-03', null, now)).toBe(true)
    expect(isWhenPast(null, null, now)).toBe(false)
  })
  it('offers 09:00, or the next whole hour once 09:00 has gone by today', () => {
    expect(defaultTimeFor('2026-11-05', now)).toBe('09:00')
    expect(defaultTimeFor('2026-11-04', now)).toBe('15:00')
    expect(defaultTimeFor('2026-11-04', at(2026, 11, 4, 7))).toBe('09:00')
    expect(defaultTimeFor('2026-11-04', at(2026, 11, 4, 23, 10))).toBe('23:59')
  })
  it('classifies due state', () => {
    expect(dueState({ dueDate: null }, now)).toBe('none')
    expect(dueState({ dueDate: '2026-11-04', dueTime: '09:00' }, now)).toBe('past')
    expect(dueState({ dueDate: '2026-11-04', dueTime: '18:00' }, now)).toBe('today')
    expect(dueState({ dueDate: '2026-11-05' }, now)).toBe('tomorrow')
    expect(dueState({ dueDate: '2026-11-09' }, now)).toBe('later')
  })
})

describe('drafts', () => {
  const now = at(2026, 11, 4, 14, 0)
  it('cleanDraft trims and drops a time without a date', () => {
    expect(cleanDraft(draft({ text: '  hi ', notes: ' n ', dueTime: '10:00' }))).toEqual({ text: 'hi', dueDate: null, dueTime: null, notes: 'n' })
  })
  it('createReminder omits empty notes', () => {
    const c = createReminder(draft({ dueDate: '2026-11-05', dueTime: '08:00' }), 'id1')
    expect(c).toEqual({ id: 'id1', text: 'Vitamins', done: false, dueDate: '2026-11-05', dueTime: '08:00' })
  })
  it('newReminderId never repeats within the same millisecond', () => {
    const a = newReminderId(5_000_000_000_000)
    const b = newReminderId(5_000_000_000_000)
    expect(a).not.toBe(b)
  })
  it('draftProblem: empty text, past new time, unchanged past time is fine', () => {
    expect(draftProblem(draft({ text: '  ' }), null, now)).toBe('empty')
    expect(draftProblem(draft({ dueDate: '2026-11-04', dueTime: '13:00' }), null, now)).toBe('past')
    expect(draftProblem(draft({ dueDate: '2026-11-04', dueTime: '15:00' }), null, now)).toBeNull()
    const old = { dueDate: '2026-11-01', dueTime: '09:00' }
    expect(draftProblem(draft({ text: 'renamed', ...old }), old, now)).toBeNull()
    expect(draftProblem(draft({ dueDate: '2026-11-02', dueTime: '09:00' }), old, now)).toBe('past')
  })
  it('applyDraft edits fields, clears notes, keeps legacy fields', () => {
    const before = r({ id: 'a', text: 'x', notes: 'old', tags: ['t'], dueDate: '2026-11-10', dueTime: '09:00' })
    const after = applyDraft(before, draft({ text: 'y', dueDate: '2026-11-11', dueTime: '10:00' }), now)
    expect(after).toMatchObject({ id: 'a', text: 'y', dueDate: '2026-11-11', dueTime: '10:00', tags: ['t'] })
    expect(after.notes).toBeUndefined()
  })
  it('applyDraft reopens a done reminder moved to a future time', () => {
    const done = r({ done: true, archivedAt: 'x', dueDate: '2026-11-01', dueTime: '09:00' })
    const moved = applyDraft(done, draft({ dueDate: '2026-11-06', dueTime: '09:00' }), now)
    expect(moved.done).toBe(false)
    expect(moved.archivedAt).toBeNull()
    expect(applyDraft(done, draft({ text: 'renamed', dueDate: '2026-11-01', dueTime: '09:00' }), now).done).toBe(true)
  })
  it('setReminderDone stamps / clears archivedAt', () => {
    expect(setReminderDone(r({}), true, now).archivedAt).toBe(now.toISOString())
    expect(setReminderDone(r({ done: true, archivedAt: 'x' }), false, now)).toMatchObject({ done: false, archivedAt: null })
  })
})

describe('notification plan', () => {
  const now = at(2026, 11, 4, 12)
  it('plans open future reminders only, soonest first, with stable ids', () => {
    const list = [
      r({ id: 'later', dueDate: '2026-11-06', dueTime: '09:00' }),
      r({ id: 'past', dueDate: '2026-11-04', dueTime: '08:00' }),
      r({ id: 'done', done: true, dueDate: '2026-11-05', dueTime: '09:00' }),
      r({ id: 'nodate' }),
      r({ id: 'soon', dueDate: '2026-11-04', dueTime: '18:00' }),
      r({ id: 'dateonly', dueDate: '2026-11-05' }),
    ]
    const plan = planReminderAlerts('pregnancy', list, now)
    expect(plan.map((p) => p.reminder.id)).toEqual(['soon', 'dateonly', 'later'])
    expect(plan[0].identifier).toBe('reminder-pregnancy-soon')
    expect(plan[1].fireAt).toEqual(at(2026, 11, 5, 9))
  })
  it('caps per journey', () => {
    const many = Array.from({ length: MAX_SCHEDULED_PER_CONTEXT + 5 }, (_, i) => r({ id: `r${i}`, dueDate: addDays(now, i + 1), dueTime: '09:00' }))
    const plan = planReminderAlerts('kids', many, now)
    expect(plan).toHaveLength(MAX_SCHEDULED_PER_CONTEXT)
    expect(plan[0].reminder.id).toBe('r0')
  })
  it('stale ids: only this journey, only what the plan dropped', () => {
    const plan = planReminderAlerts('pregnancy', [r({ id: 'keep', dueDate: '2026-11-05', dueTime: '09:00' })], now)
    const scheduled = [
      reminderNotificationId('pregnancy', 'keep'),
      reminderNotificationId('pregnancy', 'gone'),
      reminderNotificationId('pre-pregnancy', 'other-journey'),
      'local-daily-reminder',
      'local-cycle-period-reminder',
    ]
    expect(staleReminderIds('pregnancy', scheduled, plan)).toEqual(['reminder-pregnancy-gone'])
    expect(staleReminderIds('pre-pregnancy', scheduled, [])).toEqual(['reminder-pre-pregnancy-other-journey'])
  })
})

describe('labels', () => {
  const now = at(2026, 11, 4, 10)
  it('uses words for today / tomorrow / yesterday', () => {
    expect(formatReminderDay('2026-11-04', now, 'en-US', words)).toBe('Today')
    expect(formatReminderDay('2026-11-05', now, 'en-US', words)).toBe('Tomorrow')
    expect(formatReminderDay('2026-11-03', now, 'en-US', words)).toBe('Yesterday')
  })
  it('formats other days in the given locale, with the year only when it differs', () => {
    expect(formatReminderDay('2026-11-10', now, 'en-US', words)).toBe('Tue, Nov 10')
    expect(formatReminderDay('2027-01-05', now, 'en-US', words)).toContain('2027')
    expect(formatReminderDay('2026-11-10', now, 'pt-BR', words)).toMatch(/ter/i)
  })
  it('formats time per locale and joins day + time', () => {
    expect(formatReminderTime('09:05', 'pt-BR')).toBe('09:05')
    expect(formatReminderTime('21:00', 'en-US')).toMatch(/09:00\sPM/)
    expect(formatReminderWhen({ dueDate: '2026-11-05', dueTime: '09:05' }, now, 'pt-BR', words)).toBe('Tomorrow · 09:05')
    expect(formatReminderWhen({ dueDate: null }, now, 'pt-BR', words)).toBeNull()
  })
})

describe('allTags', () => {
  it('dedupes and preserves first-seen order', () => {
    const list = [r({ tags: ['health', 'daily'] }), r({ tags: ['daily', 'appt'] }), r({ tags: [] })]
    expect(allTags(list)).toEqual(['health', 'daily', 'appt'])
  })
  it('handles reminders with no tags field (back-compat)', () => {
    expect(allTags([r({})])).toEqual([])
  })
})
