import { upcomingReminders, allTags, type Reminder } from '../reminders'

const r = (over: Partial<Reminder>): Reminder => ({ id: Math.random().toString(), text: 't', done: false, ...over })

describe('upcomingReminders', () => {
  it('excludes done, sorts dated-before-undated, then by date asc, limits to n', () => {
    const list = [
      r({ id: 'a', dueDate: '2026-07-20' }),
      r({ id: 'b', done: true, dueDate: '2026-07-10' }),
      r({ id: 'c', dueDate: '2026-07-15' }),
      r({ id: 'd', dueDate: null }),
    ]
    const out = upcomingReminders(list, 2)
    expect(out.map((x) => x.id)).toEqual(['c', 'a']) // b excluded (done), d after dated, limit 2
  })
  it('flagged sorts before unflagged among undated', () => {
    const list = [r({ id: 'x', dueDate: null }), r({ id: 'y', dueDate: null, flagged: true })]
    expect(upcomingReminders(list, 5).map((x) => x.id)).toEqual(['y', 'x'])
  })
  it('returns [] for empty input', () => {
    expect(upcomingReminders([], 2)).toEqual([])
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
