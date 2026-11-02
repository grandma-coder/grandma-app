import { buildMenopauseNote } from '../grandmaNotes/menopause'
import { BANNED, letterText, tEn } from '../grandmaNotes/testing'
import type { Translate } from '../grandmaNotes/types'
import type { MenopauseLogRow } from '../menopauseAnalytics'
import { countMenopauseTriggers, encodeMenopauseTriggers, parseMenopauseTriggers } from '../menopauseTriggers'

// The trigger keys are handed off to the i18n merge (/tmp/i18n-triggers.json);
// until they land in `en`, fall back to the same English here.
const TRIGGER_EN: Record<string, string> = {
  gn_meno_trigger_title: 'Something you noted',
  gn_meno_trigger_body: '{{trigger}} came up {{count}} times before a hot flash or night sweat this week.',
  meno_trigger_coffee: 'Coffee',
  meno_trigger_alcohol: 'Alcohol',
  meno_trigger_spicy_food: 'Spicy food',
  meno_trigger_stress: 'Stress',
  meno_trigger_warm_room: 'Warm room',
  meno_trigger_poor_sleep: 'Poor sleep',
  meno_trigger_other: 'Other',
}
const tx: Translate = (key, params) => {
  const raw = TRIGGER_EN[key as string]
  if (raw == null) return tEn(key, params)
  return params ? raw.replace(/\{\{(\w+)\}\}/g, (_, n: string) => String(params[n] ?? `{{${n}}}`)) : raw
}
const tagged = (date: string, type: string, triggers: string[]): MenopauseLogRow =>
  ({ date, type, value: encodeMenopauseTriggers(triggers), severity: 3 })

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

  it('names the trigger noted most once 3+ flash/sweat logs carry triggers', () => {
    const rows = [
      tagged('2026-10-28', 'hot_flash', ['coffee', 'stress']),
      tagged('2026-10-29', 'hot_flash', ['coffee']),
      tagged('2026-10-30', 'night_sweat', ['warm_room']),
      tagged('2026-10-31', 'hot_flash', ['coffee', 'stress']),
      tagged('2026-11-01', 'hot_flash', ['coffee', 'other']),
      // Last week's tags don't count toward this week's note.
      tagged('2026-10-22', 'hot_flash', ['alcohol']),
      tagged('2026-10-22', 'hot_flash', ['alcohol']),
    ]
    const l = buildMenopauseNote({ rows, today: TODAY }, tx)
    const note = l.notes.find((n) => n.id.startsWith('trigger-'))
    expect(note).toMatchObject({
      id: 'trigger-coffee', sticker: 'glass', title: 'Something you noted',
      body: 'Coffee came up 4 times before a hot flash or night sweat this week.',
    })
    const text = letterText(l)
    expect(text).not.toMatch(BANNED)
    expect(text).not.toMatch(/avoid|cut back|stop|quit|hormone|HRT|therapy|treatment|medication/i)
  })

  it('stays quiet with fewer than 3 tagged logs, or when nothing repeats', () => {
    const two = [tagged('2026-10-29', 'hot_flash', ['coffee']), tagged('2026-10-30', 'hot_flash', ['coffee'])]
    expect(buildMenopauseNote({ rows: two, today: TODAY }, tx).notes.some((n) => n.id.startsWith('trigger-'))).toBe(false)
    const spread = [
      tagged('2026-10-29', 'hot_flash', ['coffee']),
      tagged('2026-10-30', 'hot_flash', ['stress']),
      tagged('2026-10-31', 'night_sweat', ['other']),
      tagged('2026-10-31', 'night_sweat', ['other']),
    ]
    expect(buildMenopauseNote({ rows: spread, today: TODAY }, tx).notes.some((n) => n.id.startsWith('trigger-'))).toBe(false)
  })

  it('does not always win: a week-over-week flash change ranks above it', () => {
    const rows = [
      ...times(9, '2026-10-22', 'hot_flash'),
      ...['2026-10-28', '2026-10-29', '2026-10-30'].map((d) => tagged(d, 'hot_flash', ['stress'])),
      ...times(3, '2026-10-30', 'sleep'),
    ]
    const ids = buildMenopauseNote({ rows, today: TODAY }, tx).notes.map((n) => n.id)
    expect(ids[0]).toBe('vaso')
    expect(ids).toContain('trigger-stress')
  })
})

describe('menopause triggers storage', () => {
  it('round-trips through the value column and keeps old rows readable', () => {
    const v = encodeMenopauseTriggers(['stress', 'coffee', 'nonsense'])
    expect(v).toBe('{"triggers":["coffee","stress"]}')
    expect(parseMenopauseTriggers(v)).toEqual(['coffee', 'stress'])
    expect(encodeMenopauseTriggers([])).toBeNull()
    for (const old of [null, undefined, '', 'heavy', '{broken', '{"triggers":"coffee"}']) {
      expect(parseMenopauseTriggers(old)).toEqual([])
    }
  })

  it('counts triggers only on hot flash / night sweat rows', () => {
    const rows = [
      { type: 'hot_flash', value: '{"triggers":["coffee","coffee"]}' },
      { type: 'night_sweat', value: '{"triggers":["coffee","alcohol"]}' },
      { type: 'period', value: 'light' },
      { type: 'sleep', value: '{"triggers":["stress"]}' },
      { type: 'hot_flash', value: null },
    ]
    expect(countMenopauseTriggers(rows)).toEqual({ tagged: 2, counts: [{ id: 'coffee', count: 2 }, { id: 'alcohol', count: 1 }] })
  })
})
