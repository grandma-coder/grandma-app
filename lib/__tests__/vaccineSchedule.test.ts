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
