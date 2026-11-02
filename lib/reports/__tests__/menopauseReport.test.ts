import { buildMenopauseReport } from '../menopauseReport'
import { renderReportHtml } from '../reportKit'
import type { MenopauseLogRow } from '../../menopauseAnalytics'
import { ctx, en, htmlHasBannedWords } from '../testing'

const row = (date: string, type: string, severity: number | null = 3): MenopauseLogRow => ({ date, type, value: null, severity })

const ROWS: MenopauseLogRow[] = [
  row('2026-10-27', 'hot_flash', 2),
  row('2026-10-27', 'hot_flash', 4),
  row('2026-10-28', 'hot_flash', 3),
  row('2026-10-28', 'night_sweat', 3),
  row('2026-10-29', 'sleep', 4),
  row('2026-10-30', 'low_mood', 2),
  row('2026-10-30', 'period', null), // not a symptom
  row('2026-07-01', 'hot_flash', 5), // outside 30 days
]

const section = (m: ReturnType<typeof buildMenopauseReport>, id: string) => m.sections.find((s) => s.id === id)!

describe('buildMenopauseReport', () => {
  it('empty dataset → every section empty, header + disclaimer still there', () => {
    const m = buildMenopauseReport({ rows: [], stage: null, lastPeriodDate: null }, ctx('30'))
    expect(m.sections.map((s) => s.id)).toEqual(['symptoms', 'weekly', 'vasomotor', 'sleepMood'])
    expect(m.sections.every((s) => s.count === 0)).toBe(true)
    expect(m.facts).toEqual([])
    const html = renderReportHtml(m)
    expect(html).toContain(en.disclaimer_medical)
    expect(html).toContain('report_recordedByUser')
    expect(htmlHasBannedWords(html)).toBe(false)
  })

  it('normal dataset → stage, months since period, counts, severities, per-day and per-week', () => {
    const m = buildMenopauseReport({ rows: ROWS, stage: 'peri', lastPeriodDate: '2026-06-15' }, ctx('30'))
    expect(Object.fromEntries(m.facts.map((f) => [f.label, f.value]))).toMatchObject({
      report_meno_stage: 'report_meno_stage_peri',
      report_meno_monthsSince: '4',
    })

    const symptoms = section(m, 'symptoms')
    expect(symptoms.count).toBe(6)
    expect(symptoms.table!.rows[0]).toEqual([en.gn_meno_sym_hot_flash, '3', '3'])

    const weekly = section(m, 'weekly')
    // Mon 26 Oct week holds all six in-period entries.
    expect(weekly.table!.rows).toEqual([[expect.stringContaining('26'), '6', '3']])

    const vaso = section(m, 'vasomotor')
    expect(vaso.count).toBe(4)
    const sum = Object.fromEntries(vaso.summary.map((f) => [f.label, f.value]))
    expect(sum).toMatchObject({ report_sum_hotFlashTotal: '3', report_sum_daysWithHotFlashes: '2', report_sum_hotFlashPerDay: '1.5', report_sum_nightSweatTotal: '1' })
    expect(vaso.table!.rows.map((r) => r.slice(1))).toEqual([['1', '1'], ['2', '0']]) // newest day first

    const sm = section(m, 'sleepMood')
    expect(sm.table!.rows.map((r) => r[0])).toEqual(expect.arrayContaining([en.gn_meno_sym_sleep, en.gn_meno_sym_low_mood]))

    const html = renderReportHtml(m)
    expect(html).toContain(en.disclaimer_medical)
    expect(htmlHasBannedWords(html)).toBe(false)
  })

  it('"all" includes older entries', () => {
    const m = buildMenopauseReport({ rows: ROWS, stage: 'post', lastPeriodDate: null }, ctx('all'))
    expect(section(m, 'vasomotor').count).toBe(5)
  })
})
