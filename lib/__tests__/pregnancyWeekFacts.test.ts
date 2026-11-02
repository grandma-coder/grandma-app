import { buildPregnancyWeekFacts, weekCoveragePct, areaDays } from '../pregnancyWeekFacts'

// Fixed "today" so the 7-day window is 2026-10-27 … 2026-11-02.
const TODAY = new Date(2026, 10, 2, 15, 0, 0)

const empty = { sleep: [], moods: [], water: [], exercise: [], nutrition: null, today: TODAY }

describe('buildPregnancyWeekFacts', () => {
  it('returns zero counts and null areas when nothing is logged', () => {
    const f = buildPregnancyWeekFacts(empty)
    expect(f).toMatchObject({ days: 7, logCount: 0, daysLogged: 0, areasLogged: 0 })
    expect(f.sleep).toBeNull()
    expect(f.mood).toBeNull()
    expect(f.water).toBeNull()
    expect(f.movement).toBeNull()
    expect(f.nutrition).toBeNull()
    expect(weekCoveragePct(f)).toBe(0)
  })

  it('counts only the last 7 days, ending today', () => {
    const f = buildPregnancyWeekFacts({
      ...empty,
      sleep: [
        { date: '2026-10-26', hours: 9 }, // day 8 — outside the window
        { date: '2026-10-27', hours: 7 },
        { date: '2026-11-02', hours: 8 },
      ],
    })
    expect(f.sleep).toEqual({ nights: 2, avgHours: 7.5 })
    expect(f.logCount).toBe(2)
    expect(f.daysLogged).toBe(2)
  })

  it('names the most-logged mood and counts every entry', () => {
    const f = buildPregnancyWeekFacts({
      ...empty,
      moods: [
        { log_date: '2026-10-30', value: 'calm' },
        { log_date: '2026-10-31', value: 'tired' },
        { log_date: '2026-11-01', value: 'calm' },
        { log_date: '2026-11-01', value: 'calm' },
        { log_date: '2026-11-02', value: null },
      ],
    })
    expect(f.mood).toEqual({ count: 4, days: 3, topMood: 'calm' })
    expect(areaDays(f, 'mood')).toBe(3)
  })

  it('treats a re-saved water day as one day (latest total wins) and averages per logged day', () => {
    const f = buildPregnancyWeekFacts({
      ...empty,
      water: [
        { date: '2026-11-01', glasses: 3 },
        { date: '2026-11-01', glasses: 6 },
        { date: '2026-11-02', glasses: 8 },
        { date: '2026-10-31', glasses: 0 }, // nothing logged
      ],
    })
    expect(f.water).toEqual({ days: 2, avgGlasses: 7 })
  })

  it('adds up movement minutes and counts nutrient-tagged days', () => {
    const f = buildPregnancyWeekFacts({
      ...empty,
      exercise: [
        { date: '2026-10-29', minutes: 20 },
        { date: '2026-10-29', minutes: 15 },
        { date: '2026-11-02', minutes: 30 },
      ],
      nutrition: {
        dates: ['2026-10-31', '2026-11-01', '2026-11-02'],
        iron: [true, false, false],
        folic: [false, false, true],
        protein: [false, false, false],
        calcium: [false, false, false],
      },
    })
    expect(f.movement).toEqual({ days: 2, minutes: 65 })
    expect(f.nutrition).toEqual({ days: 2 })
    expect(f.areasLogged).toBe(2)
    // 3 movement sessions + 2 tagged days; 3 distinct days (11-02 has both).
    expect(f.logCount).toBe(5)
    expect(f.daysLogged).toBe(3)
    expect(weekCoveragePct(f)).toBe(43)
  })

  it('shrinks the window when fewer days were fetched', () => {
    const f = buildPregnancyWeekFacts({
      ...empty,
      days: 3,
      sleep: [{ date: '2026-10-30', hours: 7 }, { date: '2026-10-31', hours: 6 }],
    })
    expect(f.days).toBe(3)
    expect(f.sleep).toEqual({ nights: 1, avgHours: 6 })
    expect(weekCoveragePct(f)).toBe(33)
  })

  it('never returns a score or grade — only counts and averages', () => {
    const f = buildPregnancyWeekFacts({
      ...empty,
      sleep: [{ date: '2026-11-02', hours: 4 }],
      moods: [{ log_date: '2026-11-02', value: 'anxious' }],
    })
    const keys = Object.keys(f)
    expect(keys).not.toContain('overall')
    expect(keys).not.toContain('score')
    expect(JSON.stringify(f)).not.toMatch(/thriving|needs care|needs attention|excellent|poor|normal/i)
  })
})
