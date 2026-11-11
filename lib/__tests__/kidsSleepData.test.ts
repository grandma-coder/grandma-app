jest.mock('../supabase', () => ({ supabase: {} }))
import { buildSleepData, buildDiaperData, buildMoodData, type ChildLog } from '../analyticsData'

let n = 0
const sleep = (date: string, duration: string): ChildLog => ({
  id: `s${++n}`, child_id: 'c', date, type: 'sleep', value: JSON.stringify({ duration, quality: 'good' }), notes: null, photos: [], created_at: '',
})

describe('buildSleepData avgHours', () => {
  const dates = ['2026-11-08', '2026-11-09', '2026-11-10']
  const labels = ['Sun', 'Mon', 'Tue']

  it('averages hours per logged day, not per sleep session (night + naps)', () => {
    // Each day: 10h night + three 1h30m naps = 14.5h/day.
    const logs = dates.flatMap((d) => [sleep(d, '10h'), sleep(d, '1h 30m'), sleep(d, '1h 30m'), sleep(d, '1h 30m')])
    const data = buildSleepData(logs, dates, labels)
    expect(data.dailyHours).toEqual([14.5, 14.5, 14.5])
    expect(data.avgHours).toBeCloseTo(14.5)
  })

  it('ignores days with no sleep logged and logs outside the window', () => {
    const logs = [sleep('2026-11-09', '12h'), sleep('2026-11-01', '2h')]
    const data = buildSleepData(logs, dates, labels)
    expect(data.avgHours).toBeCloseTo(12)
  })
})

describe('kids analytics builders only count the selected window', () => {
  // useKidsAnalytics fetches ≥30 days for growth context; a 7-day view must not count the rest.
  const dates = ['2026-11-09', '2026-11-10']
  const labels = ['Mon', 'Tue']
  const mk = (date: string, type: string, value: string): ChildLog => ({
    id: `${type}${++n}`, child_id: 'c', date, type, value, notes: null, photos: [], created_at: '',
  })

  it('diaper totals, types and colours', () => {
    const logs = [
      mk('2026-11-10', 'diaper', JSON.stringify({ diaperType: 'pee' })),
      mk('2026-10-20', 'diaper', JSON.stringify({ diaperType: 'poop', color: 'green' })),
      mk('2026-10-21', 'diaper', JSON.stringify({ diaperType: 'poop', color: 'green' })),
    ]
    const d = buildDiaperData(logs, dates, labels)
    expect(d.totalCount).toBe(1)
    expect(d.typeCounts).toEqual({ pee: 1, poop: 0, mixed: 0 })
    expect(d.colorCounts).toEqual({})
  })

  it('mood totals', () => {
    const logs = [mk('2026-11-10', 'mood', 'happy'), mk('2026-10-20', 'mood', 'cranky'), mk('2026-10-21', 'mood', 'cranky')]
    expect(buildMoodData(logs, dates, labels).dominantMoods).toEqual([{ mood: 'happy', count: 1 }])
  })

  it('sleep quality counts', () => {
    const logs = [sleep('2026-11-10', '10h'), { ...sleep('2026-10-20', '4h'), value: JSON.stringify({ duration: '4h', quality: 'poor' }) }]
    expect(buildSleepData(logs, dates, labels).qualityCounts).toEqual({ great: 0, good: 1, restless: 0, poor: 0 })
  })
})
