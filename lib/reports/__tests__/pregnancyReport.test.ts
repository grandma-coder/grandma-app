import { buildPregnancyReport, type PregnancyReportLog } from '../pregnancyReport'
import { renderReportHtml } from '../reportKit'
import { ctx, en, htmlHasBannedWords } from '../testing'

const log = (log_date: string, log_type: string, value: string | null, notes: string | null = null): PregnancyReportLog =>
  ({ log_date, log_type, value, notes })

const LOGS: PregnancyReportLog[] = [
  log('2026-05-01', 'weight', '61.0'), // outside 30/90 days
  log('2026-10-05', 'weight', '64.20'),
  log('2026-10-30', 'weight', '65.00'),
  log('2026-10-20', 'symptom', 'Nausea, Back pain'),
  log('2026-10-28', 'symptom', 'Nausea'),
  log('2026-10-29', 'kick_count', '12', JSON.stringify({ durationMinutes: 25 })),
  log('2026-10-31', 'kick_count', '10', JSON.stringify({ durationMinutes: 40 })),
  log('2026-10-31', 'contraction', '45', JSON.stringify({ intervalMin: 8 })),
  log('2026-10-31', 'contraction', '55', JSON.stringify({ intervalMin: 6 })),
  log('2026-10-25', 'sleep', '7', JSON.stringify({ quality: 'ok' })),
  log('2026-10-26', 'sleep', '8'),
  log('2026-10-26', 'water', '4'),
  log('2026-10-26', 'water', '6'),
  log('2026-10-27', 'water', '8'),
  log('2026-10-27', 'mood', 'happy'),
  log('2026-10-28', 'mood', 'anxious'),
  log('2026-10-29', 'mood', 'happy'),
  log('2026-10-15', 'appointment', 'Ultrasound', JSON.stringify({ doctor: 'Dr. Lima' })),
]

const section = (m: ReturnType<typeof buildPregnancyReport>, id: string) => m.sections.find((s) => s.id === id)!

describe('buildPregnancyReport', () => {
  it('empty dataset → every section empty, header + disclaimer still there', () => {
    const m = buildPregnancyReport({ week: null, dueDate: null, logs: [], exams: [] }, ctx('30'))
    expect(m.sections.map((s) => s.id)).toEqual(['weight', 'symptoms', 'kicks', 'contractions', 'sleep', 'water', 'mood', 'exams'])
    expect(m.sections.every((s) => s.count === 0)).toBe(true)
    expect(m.facts).toEqual([])
    const html = renderReportHtml(m)
    expect(html).toContain(en.disclaimer_medical)
    expect(html).toContain('report_recordedByUser')
    expect(html).toContain('report_noEntries')
    expect(htmlHasBannedWords(html)).toBe(false)
  })

  it('normal dataset → counts, summaries and tables of what was logged', () => {
    const m = buildPregnancyReport({
      week: 30,
      dueDate: '2027-01-04',
      logs: LOGS,
      exams: [{ title: 'Glucose test', examDate: '2026-10-10', provider: 'Lab Sul' }],
      weightUnit: 'kg',
    }, ctx('30'))

    expect(m.facts.map((f) => f.value)).toEqual(['30', expect.stringContaining('2027')])

    const weight = section(m, 'weight')
    expect(weight.count).toBe(2) // the May entry is outside 30 days
    expect(weight.table!.rows.map((r) => r[1])).toEqual(['65', '64.2']) // newest first
    expect(weight.summary.find((f) => f.label === 'report_sum_change')!.value).toBe('+0.8 kg')

    const symptoms = section(m, 'symptoms')
    expect(symptoms.count).toBe(3)
    expect(symptoms.table!.rows[0].slice(0, 2)).toEqual([en.preg_symptom_nausea, '2'])
    expect(symptoms.table!.rows[1].slice(0, 2)).toEqual([en.preg_symptom_backPain, '1'])

    const kicks = section(m, 'kicks')
    expect(kicks.count).toBe(2)
    expect(kicks.table!.rows[0]).toEqual([expect.any(String), '10', '40'])

    const contractions = section(m, 'contractions')
    expect(contractions.count).toBe(2)
    expect(contractions.table!.rows[0]).toEqual([expect.any(String), '2', '50', '7'])

    expect(section(m, 'sleep').summary[0].value).toBe('2')
    const water = section(m, 'water')
    expect(water.count).toBe(2) // two days, highest value per day
    expect(section(m, 'mood').table!.rows[0].slice(0, 2)).toEqual([en.preg_mood_happy, '2'])

    const exams = section(m, 'exams')
    expect(exams.table!.rows.map((r) => r.slice(1))).toEqual([['Ultrasound', 'Dr. Lima'], ['Glucose test', 'Lab Sul']])

    const html = renderReportHtml(m)
    expect(html).toContain(en.disclaimer_medical)
    expect(html).toContain('Ultrasound')
    expect(htmlHasBannedWords(html)).toBe(false)
  })

  it('"all" includes older entries; include list limits the printed sections', () => {
    const m = buildPregnancyReport({ week: 30, dueDate: '2027-01-04', logs: LOGS }, ctx('all'))
    expect(section(m, 'weight').count).toBe(3)
    const html = renderReportHtml(m, ['weight'])
    expect(html).toContain('report_sec_weight')
    expect(html).not.toContain('report_sec_mood')
  })
})
