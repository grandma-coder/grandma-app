import { cycleDayMarks, kidsDayMarks, menopauseDayMarks, pregnancyDayMarks } from '../logStickers'
import { menopauseDayLevel, menopauseDayScore, menopauseDayTint } from '../menopauseDayLoad'
import { pregnancyWeekStart } from '../pregnancyWeeks'

describe('kidsDayMarks', () => {
  it('ignores routine logs entirely (no marks, nothing for the overflow dot)', () => {
    expect(kidsDayMarks(['feeding', 'food', 'diaper', 'sleep', 'wake_up', 'mood', 'activity', 'photo', 'skipped'])).toEqual([])
  })

  it('orders special logs by meaning: vaccine, fever, medicine, doctor, growth, milestone', () => {
    expect(kidsDayMarks(['milestone', 'growth', 'note', 'medicine', 'temperature', 'vaccine']))
      .toEqual(['syringe', 'thermo', 'pill', 'stetho', 'ruler', 'star'])
  })

  it('keeps only special logs when mixed with routine ones', () => {
    expect(kidsDayMarks(['feeding', 'diaper', 'growth', 'sleep', 'medicine'])).toEqual(['pill', 'ruler'])
  })

  it('counts a third special log (overflow dot) but never a routine one', () => {
    // DayMarks shows 2 stickers + a dot when the list is longer than 2.
    expect(kidsDayMarks(['vaccine', 'temperature', 'medicine', 'feeding'])).toHaveLength(3)
    expect(kidsDayMarks(['vaccine', 'temperature', 'feeding', 'diaper', 'sleep'])).toHaveLength(2)
  })

  it('tells a doctor visit apart from an exam', () => {
    expect(kidsDayMarks(['note', 'exam'])).toEqual(['stetho', 'doc'])
  })
})

describe('pregnancyDayMarks', () => {
  it('excludes kicks, kick count, mood and other routine logs', () => {
    expect(pregnancyDayMarks(['kicks', 'kick_count', 'mood', 'water', 'sleep', 'vitamins', 'meals'])).toEqual([])
  })

  it('orders special logs: appointment, exam, ultrasound, contraction, birth prep, symptom', () => {
    expect(pregnancyDayMarks(['symptom', 'nesting', 'contraction', 'ultrasound', 'exam_result', 'appointment']))
      .toEqual(['cal', 'doc', 'camera', 'stopwatch', 'crib', 'headache'])
  })

  it('routine logs never push a special day into overflow', () => {
    expect(pregnancyDayMarks(['appointment', 'kicks', 'mood', 'water'])).toEqual(['cal'])
  })
})

describe('cycleDayMarks (unchanged)', () => {
  it('still puts intimacy first', () => {
    expect(cycleDayMarks(['mood', 'intercourse'])[0]).toBe('love')
  })
})

describe('menopauseDayMarks', () => {
  it('puts the period first, then the strongest symptom', () => {
    expect(menopauseDayMarks([
      { type: 'hot_flash', severity: 2 },
      { type: 'brain_fog', severity: 4 },
      { type: 'period', severity: null },
    ])).toEqual(['drop', 'brain'])
  })

  it('shows HRT after the period', () => {
    expect(menopauseDayMarks([{ type: 'hrt', severity: null }, { type: 'period', severity: null }, { type: 'headache', severity: 3 }]))
      .toEqual(['drop', 'pill', 'headache'])
  })

  it('shows only one symptom (the strongest; first logged wins a tie)', () => {
    expect(menopauseDayMarks([
      { type: 'hot_flash', severity: 3 },
      { type: 'anxiety', severity: 3 },
      { type: 'fatigue', severity: 1 },
    ])).toEqual(['flame'])
  })

  it('ignores notes', () => {
    expect(menopauseDayMarks([{ type: 'note', severity: null }])).toEqual([])
  })
})

describe('menopauseDayLoad', () => {
  it('sums symptom intensities and skips period / notes', () => {
    expect(menopauseDayScore([
      { type: 'hot_flash', severity: 4 },
      { type: 'night_sweat', severity: 2 },
      { type: 'period', severity: null },
      { type: 'note', severity: null },
    ])).toBe(6)
  })

  it('weighs a symptom without intensity as the middle step', () => {
    expect(menopauseDayScore([{ type: 'Hot flashes', severity: null }])).toBe(3)
  })

  it('maps the score to none / light / medium / heavy', () => {
    expect(menopauseDayLevel([])).toBe(0)
    expect(menopauseDayLevel([{ type: 'period', severity: null }])).toBe(0)
    expect(menopauseDayLevel([{ type: 'hot_flash', severity: 3 }])).toBe(1)
    expect(menopauseDayLevel([{ type: 'hot_flash', severity: 5 }])).toBe(2)
    expect(menopauseDayLevel([{ type: 'hot_flash', severity: 3 }, { type: 'anxiety', severity: 3 }, { type: 'fatigue', severity: 3 }])).toBe(2)
    expect(menopauseDayLevel([{ type: 'hot_flash', severity: 5 }, { type: 'anxiety', severity: 5 }])).toBe(3)
  })

  it('gives no tint to an empty day and a stronger tint to heavier days', () => {
    expect(menopauseDayTint(0, '#F7C9A6', false)).toBeUndefined()
    const alpha = (lv: 1 | 2 | 3) => parseInt(menopauseDayTint(lv, '#F7C9A6', false)!.slice(7), 16)
    expect(alpha(1)).toBeLessThan(alpha(2))
    expect(alpha(2)).toBeLessThan(alpha(3))
  })
})

describe('pregnancyWeekStart', () => {
  const due = '2026-12-01'

  it('labels the due date as the start of week 40', () => {
    expect(pregnancyWeekStart(due, '2026-12-01')).toEqual({ week: 40, trimesterStart: null })
  })

  it('labels every 7th day back from the due date and nothing in between', () => {
    expect(pregnancyWeekStart(due, '2026-11-24')).toEqual({ week: 39, trimesterStart: null })
    expect(pregnancyWeekStart(due, '2026-11-25')).toBeNull()
    expect(pregnancyWeekStart(due, '2026-11-30')).toBeNull()
  })

  it('flags the first day of trimester 2 (week 14) and 3 (week 28)', () => {
    // 26 weeks before the due date → week 14; 12 weeks before → week 28.
    expect(pregnancyWeekStart(due, '2026-06-02')).toEqual({ week: 14, trimesterStart: 2 })
    expect(pregnancyWeekStart(due, '2026-09-08')).toEqual({ week: 28, trimesterStart: 3 })
  })

  it('crosses DST changes cleanly and ignores weeks outside 1–42', () => {
    expect(pregnancyWeekStart(due, '2026-03-03')).toEqual({ week: 1, trimesterStart: null })
    expect(pregnancyWeekStart(due, '2026-02-24')).toBeNull()
    expect(pregnancyWeekStart(due, '2026-12-15')).toEqual({ week: 42, trimesterStart: null })
    expect(pregnancyWeekStart(due, '2026-12-22')).toBeNull()
    expect(pregnancyWeekStart('', '2026-12-01')).toBeNull()
  })
})
