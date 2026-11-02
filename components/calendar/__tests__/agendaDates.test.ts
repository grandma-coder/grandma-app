import { weekDates, monthGridDates, shiftAgendaDate, agendaPeriodKey, upcomingWindow } from '../agendaDates'

describe('agendaDates — week', () => {
  it('returns Monday → Sunday around the day', () => {
    // 2026-11-04 is a Wednesday
    expect(weekDates('2026-11-04')).toEqual([
      '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08',
    ])
  })

  it('treats Sunday as the last day of its week and crosses months', () => {
    expect(weekDates('2026-11-01')[0]).toBe('2026-10-26')
    expect(weekDates('2026-11-01')[6]).toBe('2026-11-01')
  })
})

describe('agendaDates — month grid', () => {
  it('pads to whole Mon-first weeks and only uses the rows it needs', () => {
    const nov = monthGridDates('2026-11-15') // Nov 1 2026 is a Sunday
    expect(nov[0]).toEqual({ date: '2026-10-26', inMonth: false })
    expect(nov.find((c) => c.date === '2026-11-01')?.inMonth).toBe(true)
    expect(nov.length % 7).toBe(0)
    expect(nov.length).toBe(42) // 6 rows
    expect(nov.filter((c) => c.inMonth)).toHaveLength(30)
  })

  it('fits a Monday-starting February in 4 rows', () => {
    const feb = monthGridDates('2027-02-10') // Feb 1 2027 is a Monday, 28 days
    expect(feb).toHaveLength(28)
    expect(feb[0].date).toBe('2027-02-01')
    expect(feb[27].date).toBe('2027-02-28')
  })
})

describe('agendaDates — stepping', () => {
  it('moves a week in Week view', () => {
    expect(shiftAgendaDate('2026-11-02', 'week', 1)).toBe('2026-11-09')
    expect(shiftAgendaDate('2026-11-02', 'week', -1)).toBe('2026-10-26')
  })

  it('moves a month in Month view, clamping the day', () => {
    expect(shiftAgendaDate('2026-11-02', 'month', 1)).toBe('2026-12-02')
    expect(shiftAgendaDate('2027-01-31', 'month', 1)).toBe('2027-02-28')
    expect(shiftAgendaDate('2026-01-15', 'month', -1)).toBe('2025-12-15')
  })

  it('keys the period by week start or month', () => {
    expect(agendaPeriodKey('2026-11-04', 'week')).toBe('2026-11-02')
    expect(agendaPeriodKey('2026-11-04', 'month')).toBe('2026-11')
  })
})

describe('upcomingWindow', () => {
  const rows = [
    { id: 'a', sortHours: 7, logged: true },
    { id: 'b', sortHours: 9 },
    { id: 'c', sortHours: 12 },
    { id: 'd', sortHours: 15 },
    { id: 'e', sortHours: 18 },
    { id: 'f', sortHours: 20 },
  ]
  const ids = (r: { id: string }[]) => r.map((x) => x.id)

  it('starts at the next not-yet-logged item from now', () => {
    expect(ids(upcomingWindow(rows, 11))).toEqual(['c', 'd', 'e'])
  })

  it('slides back to stay full near the end of the day', () => {
    expect(ids(upcomingWindow(rows, 19))).toEqual(['d', 'e', 'f'])
  })

  it('shows the first pending items on a future day and the last ones on a past day', () => {
    expect(ids(upcomingWindow(rows, -Infinity))).toEqual(['b', 'c', 'd'])
    expect(ids(upcomingWindow(rows, Infinity))).toEqual(['d', 'e', 'f'])
  })

  it('returns short lists unchanged', () => {
    expect(upcomingWindow(rows.slice(0, 2), 11)).toHaveLength(2)
  })
})
