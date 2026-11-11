import { getScheduleForCountry, VACCINE_SCHEDULES, getNextDueVaccines, buildVaccineScheduleTree, vaccineStatusLabel, vaccineMilestoneBadge } from '../vaccineSchedule'

describe('getScheduleForCountry', () => {
  it('returns a national schedule with source for a catalogued country', () => {
    const r = getScheduleForCountry('US')
    expect(r.provenance).toBe('national')
    expect(r.countryCode).toBe('US')
    expect(r.entries.length).toBeGreaterThan(0)
    expect(r.source.authority).toMatch(/CDC/i)
    expect(r.source.url).toMatch(/^https?:\/\//)
    expect(r.source.reviewed).toMatch(/^\d{4}-\d{2}/)
  })

  it('falls back to the WHO reference for an uncatalogued country (never US)', () => {
    const r = getScheduleForCountry('ZZ')
    expect(r.provenance).toBe('who-reference')
    expect(r.countryCode).toBe('ZZ')
    expect(r.entries).toEqual(VACCINE_SCHEDULES['WHO'])
    expect(r.entries).not.toEqual(VACCINE_SCHEDULES['US'])
    expect(r.source.authority).toMatch(/WHO/i)
  })

  it('has a source entry for every catalogued country and WHO', () => {
    for (const code of Object.keys(VACCINE_SCHEDULES)) {
      const r = getScheduleForCountry(code)
      expect(r.source?.url).toMatch(/^https?:\/\//)
    }
  })
})

describe('getNextDueVaccines nudge gating', () => {
  const oldBirth = '2024-01-01' // ~2y old relative to 2026 — would trigger nudges

  it('returns no personalized nudges for a WHO-reference (uncatalogued) country', () => {
    expect(getNextDueVaccines(oldBirth, [], 'ZZ')).toEqual([])
  })

  it('still builds a schedule tree for an uncatalogued country (reference view)', () => {
    const tree = buildVaccineScheduleTree(oldBirth, [], 'ZZ')
    expect(tree.length).toBeGreaterThan(0) // WHO reference is shown, just not nudged
  })
})

describe('neutral status labels (no clinical verdicts)', () => {
  it('maps each status to a neutral i18n key, never overdue/due-soon', () => {
    expect(vaccineStatusLabel('done', '2 months')).toBeNull()
    expect(vaccineStatusLabel('upcoming', '2 months')?.key).toBe('kids_home_vaccine_status_typical_now')
    expect(vaccineStatusLabel('overdue', '2 months')).toEqual({
      key: 'kids_home_vaccine_status_not_logged',
      params: { age: '2 months' },
    })
    expect(vaccineStatusLabel('future', '4 months')).toEqual({
      key: 'kids_home_vaccine_status_typical_around',
      params: { age: '4 months' },
    })
  })

  it('milestone badge keys are records-language, not clinical', () => {
    expect(vaccineMilestoneBadge('done', 5, 5).key).toBe('kids_home_vaccine_badge_done')
    expect(vaccineMilestoneBadge('partial', 1, 5).key).toBe('kids_home_vaccine_badge_partial')
    expect(vaccineMilestoneBadge('future', 0, 5).key).toBe('kids_home_vaccine_badge_ahead')
  })
})

describe('vaccine due/overdue uses completed months (day-aware age)', () => {
  afterEach(() => jest.useRealTimers())

  it('a 3-month-old born on the 31st is not yet overdue for the 2-month doses', () => {
    // Born Jan 31 → on May 1 she is 3 months old (Apr 30), not 4.
    jest.useFakeTimers({ now: new Date(2026, 4, 1, 9, 0) })
    const tree = buildVaccineScheduleTree('2026-01-31', [], 'US')
    const two = tree.find((m) => m.monthMin === 2)!
    const dtap = two.vaccines.find((v) => v.name === 'DTaP')!
    expect(dtap.status).toBe('upcoming')
    const next = getNextDueVaccines('2026-01-31', [], 'US').find((v) => v.name === 'DTaP')!
    expect(next.overdue).toBe(false)
  })

  it('annual dose given 12 months and 20 days ago is due, not overdue', () => {
    // Flu given 2025-10-25; on 2026-11-14 that is 12 full months, not 13.
    jest.useFakeTimers({ now: new Date(2026, 10, 14, 9, 0) })
    const given = [{ id: 'f1', type: 'vaccine', value: 'Influenza', notes: '', date: '2025-10-25' }]
    const tree = buildVaccineScheduleTree('2023-01-10', given, 'US')
    const flu = tree.flatMap((m) => m.vaccines).find((v) => v.name === 'Influenza' && v.status !== 'done')
    const next = getNextDueVaccines('2023-01-10', given, 'US').find((v) => v.name === 'Influenza')
    expect(next?.overdue).toBe(false)
    if (flu) expect(flu.status).not.toBe('overdue')
  })
})
