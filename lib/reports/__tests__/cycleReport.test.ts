import { buildCycleReport } from '../cycleReport'
import { renderReportHtml } from '../reportKit'
import type { CycleHistory, CycleLogRow } from '../../cycleAnalytics'
import { ctx, en, htmlHasBannedWords } from '../testing'

let id = 0
const row = (date: string, type: CycleLogRow['type'], value: string | null = null): CycleLogRow =>
  ({ id: String(++id), user_id: 'u', date, type, value, notes: null, created_at: `${date}T08:00:00Z` })

const LOGS: CycleLogRow[] = [
  row('2026-08-01', 'period_start'), row('2026-08-05', 'period_end'),
  row('2026-08-29', 'period_start'), row('2026-09-02', 'period_end'),
  row('2026-09-27', 'period_start'), row('2026-10-01', 'period_end'),
  row('2026-10-26', 'period_start'),
  row('2026-08-02', 'symptom', 'cramps,headache'),
  row('2026-09-20', 'symptom', 'bloated'),
  row('2026-10-27', 'symptom', 'cramps'),
  row('2026-10-10', 'basal_temp', '36.4'),
  row('2026-10-12', 'basal_temp', '36.7'),
  row('2026-10-11', 'lh', 'positive'),
]

const HISTORY: CycleHistory = {
  cycles: [
    { startDate: '2026-08-01', endDate: '2026-08-28', lengthDays: 28 },
    { startDate: '2026-08-29', endDate: '2026-09-26', lengthDays: 29 },
    { startDate: '2026-09-27', endDate: '2026-10-25', lengthDays: 29 },
    { startDate: '2026-10-26', endDate: null, lengthDays: null },
  ],
  avg: 29, min: 28, max: 29,
}

const section = (m: ReturnType<typeof buildCycleReport>, sid: string) => m.sections.find((s) => s.id === sid)!

describe('buildCycleReport', () => {
  it('empty dataset → every section empty, header + disclaimer still there', () => {
    const m = buildCycleReport({ logs: [], history: { cycles: [], avg: null, min: null, max: null } }, ctx('90'))
    expect(m.sections.map((s) => s.id)).toEqual(['cycles', 'symptoms', 'bbt', 'lh'])
    expect(m.sections.every((s) => s.count === 0)).toBe(true)
    const html = renderReportHtml(m)
    expect(html).toContain(en.disclaimer_medical)
    expect(html).toContain('report_recordedByUser')
    expect(htmlHasBannedWords(html)).toBe(false)
  })

  it('normal dataset → cycle lengths, period lengths, symptoms by phase, BBT and LH', () => {
    const m = buildCycleReport({ logs: LOGS, history: HISTORY, tempUnit: 'c' }, ctx('all'))

    const cycles = section(m, 'cycles')
    expect(cycles.count).toBe(4)
    // Newest first: the open cycle, then 29 / 29 / 28 days; periods of 5 days.
    expect(cycles.table!.rows.map((r) => r.slice(1))).toEqual([
      ['report_inProgress', '—'], ['29', '5'], ['29', '5'], ['28', '5'],
    ])
    const sum = Object.fromEntries(cycles.summary.map((f) => [f.label, f.value]))
    expect(sum.report_sum_avgCycle).toBe('report_unit_days')
    expect(sum.report_sum_cyclesLogged).toBe('4')

    const symptoms = section(m, 'symptoms')
    expect(symptoms.count).toBe(4)
    expect(symptoms.table!.columns.slice(2)).toEqual([
      en.cycleRing_label_menstruation, en.cycleRing_label_follicular, en.cycleRing_label_ovulation, en.cycleRing_label_luteal,
    ])
    // Cramps: day 2 of two cycles → menstruation twice.
    expect(symptoms.table!.rows[0]).toEqual([en.cycleTracker_symptom_cramps, '2', '2', '0', '0', '0'])

    const bbt = section(m, 'bbt')
    expect(bbt.count).toBe(2)
    expect(bbt.table!.rows.map((r) => r[1])).toEqual(['36.7', '36.4'])
    expect(section(m, 'lh').table!.rows[0][1]).toBe(en.cycleLogForm_lh_positive)

    const html = renderReportHtml(m)
    expect(html).toContain(en.disclaimer_medical)
    expect(htmlHasBannedWords(html)).toBe(false)
  })

  it('30 days keeps only cycles overlapping the period', () => {
    const m = buildCycleReport({ logs: LOGS, history: HISTORY }, ctx('30'))
    expect(section(m, 'cycles').count).toBe(2) // 27 Sep cycle runs to 25 Oct, plus the open one
    expect(section(m, 'symptoms').count).toBe(1)
  })
})
