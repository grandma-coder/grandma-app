import { buildMenopauseNote } from '../grandmaNotes/menopause'
import { BANNED, letterText, tEn } from '../grandmaNotes/testing'
import type { MenopauseLogRow } from '../menopauseAnalytics'

// This week = 2026-10-27 … 2026-11-02; last week = 2026-10-20 … 2026-10-26.
const TODAY = new Date(2026, 10, 2, 15, 0, 0)

const row = (date: string, type: string, severity: number | null = 3): MenopauseLogRow => ({ date, type, value: null, severity })
const times = (n: number, date: string, type: string) => Array.from({ length: n }, () => row(date, type))

describe('buildMenopauseNote', () => {
  it('compares hot flashes with last week and names the top other symptom', () => {
    const rows = [
      ...times(9, '2026-10-22', 'hot_flash'),
      ...times(4, '2026-10-29', 'hot_flash'),
      ...times(2, '2026-10-31', 'night_sweat'),
      ...times(3, '2026-10-30', 'sleep'),
    ]
    const l = buildMenopauseNote({ rows, monthsSincePeriod: 4, today: TODAY }, tEn)
    expect(l.intro).toBe("Here's what I noticed this week.")
    expect(l.notes[0]).toMatchObject({ id: 'vaso', title: 'Hot flashes & night sweats', body: '6 this week, fewer than last week (9).' })
    expect(l.notes[1]).toMatchObject({ id: 'sym-sleep', title: 'Sleep trouble came up most', body: '3 times this week.' })
    expect(l.notes.length).toBeLessThanOrEqual(3)
    // Answers what showed up: 6 vasomotor events → layers.
    expect(l.suggestion?.text).toBe(tEn('gn_sug_meno_layers'))
  })

  it('suggests sleep self-care when nights were rough and flashes were few', () => {
    const rows = [...times(2, '2026-10-30', 'sleep'), row('2026-10-31', 'fatigue')]
    const l = buildMenopauseNote({ rows, today: TODAY }, tEn)
    expect(l.suggestion?.text).toBe(tEn('gn_sug_meno_sleep'))
  })

  it('too little data → one encouraging note and a specific thing to log', () => {
    const l = buildMenopauseNote({ rows: [row('2026-08-01', 'hot_flash')], monthsSincePeriod: 3, today: TODAY }, tEn)
    expect(l.notes).toHaveLength(1)
    expect(l.notes[0].body).toBe(tEn('gn_meno_empty_body'))
    expect(l.suggestion?.text).toBe(tEn('gn_sug_meno_log'))
  })

  it('never uses banned words and never suggests a treatment', () => {
    const cases: MenopauseLogRow[][] = [
      [],
      times(3, '2026-11-01', 'low_mood'),
      [...times(5, '2026-10-21', 'hot_flash'), ...times(5, '2026-10-28', 'hot_flash')],
      ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'].map((d) => row(d, 'joint_pain')),
    ]
    for (const rows of cases) {
      const text = letterText(buildMenopauseNote({ rows, monthsSincePeriod: 1, today: TODAY }, tEn))
      expect(text).not.toMatch(BANNED)
      expect(text).not.toMatch(/hormone|HRT|therapy|treatment|medication/i)
      expect(text).not.toMatch(/\{\{\w+\}\}/)
    }
  })
})
