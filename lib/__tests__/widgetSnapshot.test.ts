import { useLanguageStore } from '../../store/useLanguageStore'
import { buildCycleEntry, buildPregnancyEntry } from '../widgets/snapshot'

const now = new Date('2026-11-09T10:00:00')
const cfg = { lastPeriodStart: '2026-10-31', cycleLength: 28, periodLength: 5, lutealPhase: 14 }
const ctx = { now, isMinor: false }

beforeEach(() => useLanguageStore.setState({ language: 'en' }))

describe('cycle entry', () => {
  it('day line for today and 7 more days', () => {
    const e = buildCycleEntry({ config: cfg, logs: [] }, ctx)
    expect(e.days).toHaveLength(8)
    expect(e.days[0]).toMatchObject({ date: '2026-11-09', title: 'Day 10 of 28' })
    expect(e.days[0].subtitle).toMatch(/19 days/)
    expect(e.days[1].title).toBe('Day 11 of 28')
    expect(e.buttons[0].url).toBe('grandma-app://log/cycle/period_start')
    expect(e.openUrl).toBe('grandma-app://log/cycle/home')
    expect(e.days[0].strip).toMatchObject({ today: 10, length: 28 })
    expect(e.days[0].strip!.phases[0]).toBe('m')
  })
  it('late period says so instead of wrapping to day 1', () => {
    const e = buildCycleEntry({ config: { ...cfg, lastPeriodStart: '2026-10-08' }, logs: [] }, ctx)
    expect(e.days[0].subtitle).toMatch(/4 days late/)
  })
  it('no period logged is the empty state, buttons kept', () => {
    const e = buildCycleEntry({ config: null, logs: [] }, ctx)
    expect(e.state).toBe('empty')
    expect(e.emptyText).toBeTruthy()
    expect(e.buttons).toHaveLength(4)
  })
  it('minors never see intercourse in "logged today"', () => {
    const logs = [{ date: '2026-11-09', type: 'intercourse', value: null }, { date: '2026-11-09', type: 'mood', value: 'good' }]
    const minor = buildCycleEntry({ config: cfg, logs }, { now, isMinor: true })
    expect(JSON.stringify(minor).toLowerCase()).not.toMatch(/intercourse|sex/)
    expect(minor.stats.find((s) => s.daily)!.value).toBe('1')
    const adult = buildCycleEntry({ config: cfg, logs }, ctx)
    expect(adult.stats.find((s) => s.daily)!.value).toBe('2')
  })
  it('7-day mood series, oldest first', () => {
    const e = buildCycleEntry({ config: cfg, logs: [{ date: '2026-11-09', type: 'mood', value: 'great' }] }, ctx)
    expect(e.series).toMatchObject({ kind: 'moods' })
    expect(e.series!.values).toHaveLength(7)
    expect(e.series!.values[6]).toBe(5)
    expect(e.series!.values[0]).toBe(0)
  })
})

describe('pregnancy entry', () => {
  it('weeks, fruit and days to go', () => {
    const e = buildPregnancyEntry({ dueDate: '2027-03-02', todayLogs: { kick_count: { value: '12' } }, fruitPng: 'AAA' }, ctx)
    expect(e.days[0].title).toMatch(/^23 wks · /)
    expect(e.days[0].subtitle).toMatch(/113 days to go/)
    expect(e.days[0].progress).toBeCloseTo(23 / 40)
    expect(e.image).toBe('AAA')
    expect(e.stats.find((s) => /kick/i.test(s.label))?.value).toBe('12')
    expect(e.buttons.map((b) => b.url)).toContain('grandma-app://log/pregnancy/kick_count')
  })
  it('no due date is empty', () => {
    expect(buildPregnancyEntry({ dueDate: null, todayLogs: {} }, ctx).state).toBe('empty')
  })
})

import { buildKidsEntry, buildMenopauseEntry, buildSnapshot, emptySnapshot } from '../widgets/snapshot'

describe('kids entry', () => {
  const logs = [
    { date: '2026-11-09', type: 'feeding', value: null, created_at: '2026-11-09T08:00:00' },
    { date: '2026-11-09', type: 'diaper', value: null, created_at: '2026-11-09T08:30:00' },
    { date: '2026-11-08', type: 'sleep', value: JSON.stringify({ duration: '7h 30m' }), created_at: '2026-11-08T21:00:00' },
  ]
  it('name and age in the title, last feed as a live timestamp, child in the button urls', () => {
    const e = buildKidsEntry({ id: 'c1', name: 'Leo', birthDate: '2026-03-01' }, logs, [], ctx)
    expect(e.key).toBe('kids:c1')
    expect(e.name).toBe('Leo')
    expect(e.days[0].title).toMatch(/^Leo · 8\s?mo/)
    expect(e.days[0].subtitle).toMatch(/7h 30m/)
    expect(e.sinceLast).toEqual({ label: expect.any(String), at: new Date('2026-11-09T08:00:00').toISOString() })
    expect(e.buttons[0].url).toBe('grandma-app://log/kids/feeding?child=c1')
    expect(e.openUrl).toBe('grandma-app://log/kids/home?child=c1')
    expect(e.series).toMatchObject({ kind: 'bars' })
    expect(e.series!.values[6]).toBe(1)
    expect(e.stats.filter((s) => s.daily).map((s) => s.value)).toEqual(['1', '1'])
  })
  it('age advances on later days', () => {
    const e = buildKidsEntry({ id: 'c1', name: 'Leo', birthDate: '2026-04-01' }, [], [], { now: new Date('2026-11-28T10:00:00'), isMinor: false })
    expect(e.days[0].title).toMatch(/7\s?mo/)
    expect(e.days[4].title).toMatch(/8\s?mo/)
  })
})

describe('menopause entry', () => {
  it('months since last period plus stage, hot flashes today with severity', () => {
    const logs = [{ date: '2026-11-09', type: 'hot_flash', value: null, severity: 3 }]
    const e = buildMenopauseEntry({ stage: 'peri', lastPeriodDate: '2026-09-05', logs }, ctx)
    expect(e.days[0].title).toMatch(/2 months/)
    expect(e.days[0].title).toMatch(/perimenopause/i)
    expect(e.days[0].subtitle).toMatch(/3\/5/)
    expect(e.days[1].subtitle).not.toMatch(/3\/5/)
    expect(e.series!.values[6]).toBe(3)
  })
  it('nothing set up yet is empty', () => {
    expect(buildMenopauseEntry({ stage: null, lastPeriodDate: null, logs: [] }, ctx).state).toBe('empty')
  })
})

describe('full snapshot', () => {
  it('one entry per enrolled journey and per child, activeKey follows the app', () => {
    const s = buildSnapshot({
      now, isMinor: false, enrolled: ['kids', 'pregnancy'], activeMode: 'kids', activeChildId: 'c2',
      pregnancy: { dueDate: '2027-03-02', todayLogs: {} },
      kids: { children: [{ id: 'c1', name: 'Leo', birthDate: '2026-03-01' }, { id: 'c2', name: 'Mia', birthDate: '2024-01-01' }], logs: {}, given: {} },
    })
    expect(s.entries.map((e) => e.key)).toEqual(['pregnancy', 'kids:c1', 'kids:c2'])
    expect(s.activeKey).toBe('kids:c2')
    expect(s.version).toBe(1)
    expect(s.signedIn).toBe(true)
    expect(s.strings.signIn).toBe('Sign in to Grandma')
  })
  it('journeys without input are skipped, not crashed', () => {
    const s = buildSnapshot({ now, isMinor: false, enrolled: ['menopause'], activeMode: 'menopause', activeChildId: null })
    expect(s.entries).toHaveLength(0)
  })
  it('emptySnapshot is signed out', () => {
    expect(emptySnapshot(now)).toMatchObject({ signedIn: false, entries: [] })
  })
})

describe('hero layout (big number widgets)', () => {
  it('cycle: day number of length, phase caption, capitalised footer', () => {
    const h = buildCycleEntry({ config: cfg, logs: [] }, ctx).days[0].hero!
    expect(h).toMatchObject({ eyebrow: 'Cycle day', big: '10', unit: 'of 28', caption: expect.stringMatching(/follicular/i) })
    expect(h.footer).toMatch(/^Period in 19 days$/)
  })
  it('cycle late: day count keeps going, caption says late', () => {
    const h = buildCycleEntry({ config: { ...cfg, lastPeriodStart: '2026-10-08' }, logs: [] }, ctx).days[0].hero!
    expect(h).toMatchObject({ big: '32', unit: '' })
    expect(h.caption).toMatch(/4 days late/)
  })
  it('pregnancy: week, trimester eyebrow, fruit caption, days to go footer', () => {
    const h = buildPregnancyEntry({ dueDate: '2027-03-02', todayLogs: {} }, ctx).days[0].hero!
    expect(h).toMatchObject({ eyebrow: 'Week 23 · trimester 2', big: '23', unit: 'wks', footer: '113 days to go' })
    expect(h.caption).toMatch(/^size of \S/)
  })
  it('kids with a feed: live hero since last feed, name and age eyebrow, sleep footer', () => {
    const logs = [
      { date: '2026-11-09', type: 'feeding', value: null, created_at: '2026-11-09T08:00:00' },
      { date: '2026-11-08', type: 'sleep', value: JSON.stringify({ duration: '7h 30m' }), created_at: '2026-11-08T21:00:00' },
    ]
    const h = buildKidsEntry({ id: 'c1', name: 'Leo', birthDate: '2026-03-01' }, logs, [], ctx).days[0].hero!
    expect(h).toMatchObject({ big: '', live: true, caption: 'since last feed', footer: 'Slept 7h 30m' })
    expect(h.eyebrow).toMatch(/^Leo · 8\s?mo/)
  })
  it('kids without a feed: age is the hero', () => {
    const h = buildKidsEntry({ id: 'c1', name: 'Leo', birthDate: '2026-03-01' }, [], [], ctx).days[0].hero!
    expect(h.live).toBeUndefined()
    expect(h).toMatchObject({ eyebrow: 'Leo', big: expect.stringMatching(/8\s?mo/) })
  })
  it('menopause: months since last period, stage eyebrow, singular unit', () => {
    const h = buildMenopauseEntry({ stage: 'peri', lastPeriodDate: '2026-09-05', logs: [] }, ctx).days[0].hero!
    expect(h).toMatchObject({ big: '2', unit: 'months', caption: 'since last period' })
    expect(h.eyebrow).toMatch(/perimenopause/i)
    const one = buildMenopauseEntry({ stage: 'peri', lastPeriodDate: '2026-10-05', logs: [] }, ctx).days[0].hero!
    expect(one).toMatchObject({ big: '1', unit: 'month' })
  })
})

describe('buttons people can pick', () => {
  it('defaults carry type and the app sticker; choices list every allowed log with a label', () => {
    const e = buildKidsEntry({ id: 'c1', name: 'Leo', birthDate: '2026-03-01' }, [], [], ctx)
    expect(e.buttons[0]).toMatchObject({ type: 'feeding', sticker: 'bottle', url: 'grandma-app://log/kids/feeding?child=c1' })
    const types = e.choices.map((c) => c.type)
    expect(types).toEqual(expect.arrayContaining(['feeding', 'sleep', 'diaper', 'mood', 'activity', 'health', 'memory']))
    expect(e.choices.every((c) => c.label && c.url.endsWith('?child=c1'))).toBe(true)
  })
  it('cycle choices never include intimate logs', () => {
    const e = buildCycleEntry({ config: cfg, logs: [] }, ctx)
    const types = e.choices.map((c) => c.type)
    expect(types).toEqual(expect.arrayContaining(['period_start', 'lh', 'cm', 'basal_temp']))
    expect(types).not.toContain('intercourse')
    expect(types).not.toContain('sex_drive')
  })
  it('menopause choices use the symptom labels and stickers', () => {
    const e = buildMenopauseEntry({ stage: 'peri', lastPeriodDate: '2026-09-05', logs: [] }, ctx)
    expect(e.choices.find((c) => c.type === 'brain_fog')).toMatchObject({ sticker: 'brain' })
    expect(e.choices.find((c) => c.type === 'night_sweat')?.label).toBeTruthy()
  })
})

describe('chart readings', () => {
  it('kids feeds: weekly average; menopause: fixed 1–5 scale and days with hot flashes', () => {
    const logs = [
      { date: '2026-11-09', type: 'feeding', value: null, created_at: '2026-11-09T08:00:00' },
      { date: '2026-11-08', type: 'feeding', value: null, created_at: '2026-11-08T08:00:00' },
    ]
    const k = buildKidsEntry({ id: 'c1', name: 'Leo', birthDate: '2026-03-01' }, logs, [], ctx)
    expect(k.series!.summary).toBe('avg 0.3/day')
    const m = buildMenopauseEntry({ stage: 'peri', lastPeriodDate: null, logs: [{ date: '2026-11-09', type: 'hot_flash', value: null, severity: 3 }] }, ctx)
    expect(m.series).toMatchObject({ scaleMax: 5, summary: '1 of 7 days' })
  })
  it('snapshot carries the app language and legend strings', () => {
    const s = buildSnapshot({ now, isMinor: false, enrolled: ['pre-pregnancy'], activeMode: 'pre-pregnancy', activeChildId: null, cycle: { config: cfg, logs: [] } })
    expect(s.lang).toBe('en')
    expect(Object.values(s.strings.phases).every(Boolean)).toBe(true)
    expect(s.strings.styles.cream).toBe('Cream')
  })
})

describe('logic sweep round 2', () => {
  it('cycle late: no next period or fertile window in the stats (the home pauses estimates too)', () => {
    const e = buildCycleEntry({ config: { ...cfg, lastPeriodStart: '2026-10-08' }, logs: [] }, ctx)
    const labels = e.stats.map((s) => s.label)
    expect(labels).not.toContain('Next period')
    expect(labels).not.toContain('Fertile window')
    expect(labels).toContain('Logged today')
    // Not late: both still there.
    expect(buildCycleEntry({ config: cfg, logs: [] }, ctx).stats.map((s) => s.label)).toEqual(['Next period', 'Fertile window', 'Logged today'])
  })
  it('kids: "since last feed" counts from the feed time, not when it was logged', () => {
    const logs = [
      // 3am feed logged at 7am.
      { date: '2026-11-09', type: 'feeding', value: JSON.stringify({ feedType: 'bottle', time: '03:00' }), created_at: '2026-11-09T07:00:00' },
      // Logged later, but the feed itself was earlier (yesterday evening).
      { date: '2026-11-08', type: 'feeding', value: JSON.stringify({ feedType: 'breast', time: '21:00' }), created_at: '2026-11-09T07:05:00' },
    ]
    const e = buildKidsEntry({ id: 'c1', name: 'Leo', birthDate: '2026-03-01' }, logs, [], ctx)
    expect(e.sinceLast?.at).toBe(new Date(2026, 10, 9, 3, 0).toISOString())
  })
  it('menopause: a period 25 days ago (last month) is not "this month"', () => {
    const e = buildMenopauseEntry({ stage: 'peri', lastPeriodDate: '2026-10-15', logs: [] }, ctx)
    expect(e.days[0].title).not.toMatch(/this month/i)
    expect(e.days[0].title).toMatch(/25 days since last period/)
    expect(e.days[0].hero!.caption).toMatch(/25 days since last period/)
    expect(e.days[1].title).toMatch(/26 days/)
  })
})
