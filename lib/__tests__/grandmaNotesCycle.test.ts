import { buildCycleNote, type CycleNoteInput } from '../grandmaNotes/cycle'
import { BANNED, letterText, tEn } from '../grandmaNotes/testing'

const TODAY = new Date(2026, 10, 2, 15, 0, 0)

function history(lengths: number[]) {
  const cycles = lengths.map((len, i) => ({ startDate: `2026-0${(i % 9) + 1}-01`, endDate: null, lengthDays: len }))
  cycles.push({ startDate: '2026-10-20', endDate: null, lengthDays: null as unknown as number })
  const avg = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
  return { cycles, avg, min: Math.min(...lengths), max: Math.max(...lengths) }
}

const info = { cycleDay: 14, phase: 'ovulation' as const, daysUntilPeriod: 15 }

describe('buildCycleNote', () => {
  it('states where you are and the length range across recent cycles', () => {
    const l = buildCycleNote({ history: history([28, 29, 30, 28, 29]), info, today: TODAY } as CycleNoteInput, tEn)
    expect(l.notes.map((n) => n.id)).toEqual(['range', 'today'])
    expect(l.notes[0]).toMatchObject({ area: 'cycleLength', title: 'Your cycle length', body: '28–30 days across your last 5 cycles.' })
    expect(l.notes[1]).toMatchObject({ title: 'Day 14 of your cycle', body: 'Ovulation phase. Next period estimated in about 15 days.' })
    expect(l.suggestion?.text).toBe(tEn('gn_sug_cycle_ovulation'))
  })

  it('leads with a last cycle that ran well past the average, and keeps 3 notes max', () => {
    const l = buildCycleNote({
      history: history([28, 28, 28, 36]),
      info: { ...info, phase: 'luteal', daysUntilPeriod: 1 },
      pms: { avgDays: 3, topSymptoms: [{ name: 'cramps', count: 4 }], overallDominantPhase: 'luteal', avgDaysBeforePeriod: null } as any,
      mood: { avgScore: 4, distribution: [], recent: [{ mood: 'good', date: '2026-10-30' }, { mood: 'okay', date: '2026-11-01' }] } as any,
      today: TODAY,
    }, tEn)
    expect(l.notes).toHaveLength(3)
    expect(l.notes[0]).toMatchObject({ id: 'last', title: 'Your last cycle ran longer', body: '36 days, against your average of 30.' })
    expect(l.notes.find((n) => n.id === 'today')?.body).toBe('Luteal phase. Your period may start any day now.')
    expect(l.suggestion?.text).toBe(tEn('gn_sug_cycle_luteal'))
  })

  it('too little data → one encouraging note and a specific thing to log', () => {
    const l = buildCycleNote({ history: { cycles: [], avg: null, min: null, max: null }, info: null, today: TODAY }, tEn)
    expect(l.notes).toHaveLength(1)
    expect(l.notes[0].body).toBe(tEn('gn_cycle_empty_body'))
    expect(l.suggestion?.text).toBe(tEn('gn_sug_cycle_log'))
  })

  it('never uses banned words and fills every placeholder', () => {
    const inputs: CycleNoteInput[] = [
      { history: history([28, 29, 30]), info, today: TODAY },
      { history: history([25, 40, 31]), info: { ...info, phase: 'menstruation', daysUntilPeriod: 27, cycleDay: 2 }, today: TODAY },
      { history: undefined, info: null, today: TODAY },
    ]
    for (const input of inputs) {
      const text = letterText(buildCycleNote(input, tEn))
      expect(text).not.toMatch(BANNED)
      expect(text).not.toMatch(/\{\{\w+\}\}/)
    }
  })
})
