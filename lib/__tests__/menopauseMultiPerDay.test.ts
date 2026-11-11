// Several hot flashes / night sweats per day: each log is its own entry. Counts and per-day
// averages count entries; day load / tint / marks use the strongest entry. Other symptoms stay
// one per day.
import { isMultiPerDayType, editableEntryFor, menopauseEntryTime } from '../menopauseSymptoms'
import { menopauseDayLevel, menopauseDayScore } from '../menopauseDayLoad'
import { menopauseDayMarks } from '../logStickers'
import { computeSymptomStats, computeVasomotorFrequency, type MenopauseLogRow } from '../menopauseAnalytics'
import { buildMenopauseReport } from '../reports/menopauseReport'
import { ctx } from '../reports/testing'
import { buildMenopauseEntry } from '../widgets/snapshot'
import { useLanguageStore } from '../../store/useLanguageStore'

const row = (date: string, type: string, severity: number | null, id?: string, created_at?: string): MenopauseLogRow =>
  ({ id, date, type, value: null, severity, created_at })

beforeEach(() => useLanguageStore.setState({ language: 'en' }))

describe('which types stack', () => {
  it('hot flashes, night sweats and notes allow several per day; other symptoms do not', () => {
    expect(isMultiPerDayType('hot_flash')).toBe(true)
    expect(isMultiPerDayType('night_sweat')).toBe(true)
    expect(isMultiPerDayType('note')).toBe(true)
    expect(isMultiPerDayType('sleep')).toBe(false)
    expect(isMultiPerDayType('period')).toBe(false)
  })
})

describe('editableEntryFor', () => {
  const rows = [
    row('2026-11-09', 'hot_flash', 2, 'a'),
    row('2026-11-09', 'hot_flash', 4, 'b'),
    row('2026-11-09', 'sleep', 3, 'c'),
  ]
  it('a new hot flash starts blank (no pre-fill from the day\'s other entries)', () => {
    expect(editableEntryFor(rows, '2026-11-09', 'hot_flash')).toBeUndefined()
  })
  it('editing a hot flash targets that one entry', () => {
    expect(editableEntryFor(rows, '2026-11-09', 'hot_flash', 'b')?.severity).toBe(4)
  })
  it('single-per-day symptoms still pre-fill the day\'s row', () => {
    expect(editableEntryFor(rows, '2026-11-09', 'sleep')?.id).toBe('c')
  })
})

describe('menopauseEntryTime', () => {
  it('shows the logged time when it was logged on that day', () => {
    const r = row('2026-11-09', 'hot_flash', 3, 'a', new Date(2026, 10, 9, 14, 5).toISOString())
    expect(menopauseEntryTime(r)).toEqual({ hours: 14, minutes: 5 })
  })
  it('no time for a back-dated entry (logged on another day)', () => {
    const r = row('2026-11-07', 'hot_flash', 3, 'a', new Date(2026, 10, 9, 14, 5).toISOString())
    expect(menopauseEntryTime(r)).toBeNull()
  })
})

describe('day load and marks use the strongest entry', () => {
  const day = [row('2026-11-09', 'hot_flash', 2), row('2026-11-09', 'hot_flash', 4), row('2026-11-09', 'hot_flash', 3)]
  it('three flashes weigh as the strongest one, not the sum', () => {
    expect(menopauseDayScore(day)).toBe(4)
    expect(menopauseDayLevel(day)).toBe(1)
  })
  it('different symptoms still add up', () => {
    expect(menopauseDayScore([...day, row('2026-11-09', 'sleep', 3)])).toBe(7)
  })
  it('marks show the flame once', () => {
    expect(menopauseDayMarks(day)).toEqual(['flame'])
  })
})

describe('counts count entries', () => {
  const rows = [
    row('2026-11-09', 'hot_flash', 2), row('2026-11-09', 'hot_flash', 4), row('2026-11-09', 'hot_flash', 3),
    row('2026-11-08', 'hot_flash', 3), row('2026-11-08', 'night_sweat', 5),
  ]
  it('analytics: per-day vasomotor count and symptom totals', () => {
    expect(computeVasomotorFrequency(rows)).toEqual([{ date: '2026-11-08', count: 2 }, { date: '2026-11-09', count: 3 }])
    expect(computeSymptomStats(rows).find((s) => s.id === 'hot_flash')).toMatchObject({ count: 4, avgSeverity: 3 })
  })
  it('report: hot flashes per day is entries / days', () => {
    const m = buildMenopauseReport({ rows, stage: 'peri', lastPeriodDate: null }, { ...ctx('30'), today: new Date('2026-11-10T12:00:00') })
    const vaso = m.sections.find((s) => s.id === 'vasomotor')!
    const sum = Object.fromEntries(vaso.summary.map((x) => [x.label, x.value]))
    expect(sum.report_sum_hotFlashTotal).toBe('4')
    expect(sum.report_sum_daysWithHotFlashes).toBe('2')
    expect(sum.report_sum_hotFlashPerDay).toBe('2')
  })
  it('widget: today shows how many and the strongest; bars use the strongest', () => {
    const e = buildMenopauseEntry({ stage: 'peri', lastPeriodDate: null, logs: rows }, { now: new Date('2026-11-09T18:00:00'), isMinor: false })
    expect(e.days[0].subtitle).toMatch(/3/)
    expect(e.days[0].subtitle).toMatch(/4\/5/)
    expect(e.series!.values[6]).toBe(4)
    expect(e.series!.values[5]).toBe(3)
  })
})

describe('grandma note counts each hot flash', () => {
  it('three flashes on one day read as 3 this week', () => {
    const { buildMenopauseNote } = require('../grandmaNotes/menopause') as typeof import('../grandmaNotes/menopause')
    const t = (key: string, p?: Record<string, unknown>) => (p ? `${key}:${JSON.stringify(p)}` : key)
    const today = new Date('2026-11-11T12:00:00') // Wednesday
    const rows = [row('2026-11-10', 'hot_flash', 2), row('2026-11-10', 'hot_flash', 4), row('2026-11-10', 'hot_flash', 3)]
    const letter = buildMenopauseNote({ rows, today }, t as never)
    expect(letter.notes.find((n) => n.id === 'vaso')?.body).toBe('gn_meno_vaso_body:{"count":3}')
  })
})
