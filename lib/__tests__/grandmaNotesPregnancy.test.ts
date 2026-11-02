import { buildPregnancyNote, type PregnancyNoteInput } from '../grandmaNotes/pregnancy'
import { BANNED, letterText, tEn } from '../grandmaNotes/testing'

// This week = 2026-10-27 … 2026-11-02; last week = 2026-10-20 … 2026-10-26.
const TODAY = new Date(2026, 10, 2, 15, 0, 0)

const empty: PregnancyNoteInput = {
  week: 22, sleep: [], moods: [], water: [], exercise: [], nutrition: null, kicks: [], today: TODAY,
}

const thisWeek = ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']
const lastWeek = ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26']

const rich: PregnancyNoteInput = {
  ...empty,
  week: 37,
  sleep: [
    ...lastWeek.map((date) => ({ date, hours: 6.8 })),
    ...thisWeek.map((date) => ({ date, hours: 7.5 })),
  ],
  water: thisWeek.map((date) => ({ date, glasses: date === '2026-10-30' ? 4 : 8 })),
  kicks: [
    { date: '2026-10-22', kicks: 10 }, { date: '2026-10-24', kicks: 10 },
    { date: '2026-10-29', kicks: 10 }, { date: '2026-11-01', kicks: 11 },
  ],
  moods: [{ log_date: '2026-10-30', value: 'happy' }],
  formatDay: () => 'Friday',
}

describe('buildPregnancyNote', () => {
  it('picks up to 3 notes with the largest change first', () => {
    const l = buildPregnancyNote(rich, tEn)
    expect(l.notes.length).toBe(3)
    // The 42-min sleep change leads, then the every-day streak, then the water dip.
    expect(l.notes.map((n) => n.id)).toEqual(['sleep', 'streak', 'water'])
    expect(l.notes[0]).toMatchObject({ area: 'sleep', title: 'More sleep this week' })
    expect(l.notes[0].body).toBe('7.5 h a night — 42 min more than last week.')
    expect(l.intro).toBe("Here's what I noticed this week.")
  })

  it('finds the day water dipped and reads kicks against the usual', () => {
    const l = buildPregnancyNote({ ...rich, sleep: [] }, tEn)
    const water = l.notes.find((n) => n.id === 'water')!
    expect(water.title).toBe('Water dipped on Friday')
    expect(water.body).toBe('4 glasses. On the other days, about 8.')
    expect(l.notes.find((n) => n.id === 'kicks')?.body).toBe('11 a session, like your usual.')
  })

  it('late third trimester suggests the hospital bag with a checklist action', () => {
    const l = buildPregnancyNote(rich, tEn)
    expect(l.suggestion).toMatchObject({
      text: 'Get the hospital bag ready by Friday.', actionLabel: 'Open checklist', actionArea: 'birth',
    })
  })

  it('uses the week momTip when it is safe, and skips one that says "normal"', () => {
    const base = { ...rich, week: 22 }
    expect(buildPregnancyNote({ ...base, momTip: 'Sleep on your side.' }, tEn).suggestion?.text).toBe('Sleep on your side.')
    const unsafe = buildPregnancyNote({ ...base, momTip: 'Rest when you need to. Fatigue is normal.' }, tEn)
    expect(unsafe.suggestion?.text).toBe(tEn('gn_sug_preg_w4'))
    const clinical = buildPregnancyNote({ ...base, momTip: 'Start taking prenatal vitamins with folic acid.' }, tEn)
    expect(clinical.suggestion?.text).toBe(tEn('gn_sug_preg_w4'))
  })

  it('too little data → one encouraging note and a specific thing to log', () => {
    const l = buildPregnancyNote(empty, tEn)
    expect(l.notes).toHaveLength(1)
    expect(l.notes[0].title).toBe("Let's start small")
    expect(l.suggestion?.text).toBe('Tonight, log how many hours you slept — just one number.')
  })

  it('never uses banned words and fills every placeholder', () => {
    for (const input of [rich, empty, { ...rich, sleep: [], water: [] }, { ...rich, week: 6, momTip: 'Fatigue is normal.' }]) {
      const text = letterText(buildPregnancyNote(input, tEn))
      expect(text).not.toMatch(BANNED)
      expect(text).not.toMatch(/\{\{\w+\}\}/)
    }
  })
})
