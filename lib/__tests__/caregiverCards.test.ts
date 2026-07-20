import { CAREGIVER_CARDS, roleDefaultCards, modeToBehavior } from '../caregiverCards'

describe('CAREGIVER_CARDS', () => {
  it('includes the unified essentials card in every behavior', () => {
    for (const behavior of ['kids', 'pregnancy', 'cycle'] as const) {
      expect(CAREGIVER_CARDS[behavior].some((c) => c.id === 'essentials')).toBe(true)
    }
  })

  it('marks the truly intimate cycle signals (today_summary) as intimate', () => {
    const cycleTodaySummary = CAREGIVER_CARDS.cycle.find((c) => c.id === 'today_summary')
    expect(cycleTodaySummary?.tier).toBe('intimate')
  })

  it('treats the cycle journey ring (phase + period timing) as child-health, not intimate', () => {
    const ring = CAREGIVER_CARDS.cycle.find((c) => c.id === 'journey_ring')
    expect(ring?.tier).toBe('child-health')
  })

  it('gives every card a non-empty human label', () => {
    for (const behavior of ['kids', 'pregnancy', 'cycle'] as const) {
      for (const card of CAREGIVER_CARDS[behavior]) {
        expect(card.label.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('roleDefaultCards', () => {
  it('gives a kids nanny the log-oriented set incl. essentials, excludes health', () => {
    const set = roleDefaultCards('kids', 'nanny')
    expect(set).toEqual(expect.arrayContaining(['hero-tiles', 'today-summary', 'diaper', 'reminders', 'essentials']))
    expect(set).not.toContain('health')
  })

  it('gives a kids family caregiver a viewer set (no diaper/reminders, has essentials)', () => {
    const set = roleDefaultCards('kids', 'family')
    expect(set).toEqual(expect.arrayContaining(['hero-tiles', 'essentials']))
    expect(set).not.toContain('diaper')
  })

  it('never includes an intimate cycle card in any default set', () => {
    const set = roleDefaultCards('cycle', 'family')
    expect(set).not.toContain('today_summary')
    expect(set).toContain('journey_ring') // phase + period timing only
    expect(set).toContain('essentials')
  })

  it('a parent role default returns every card id for the behavior', () => {
    const all = CAREGIVER_CARDS.kids.map((c) => c.id)
    expect(roleDefaultCards('kids', 'parent').sort()).toEqual([...all].sort())
  })
})

describe('modeToBehavior', () => {
  it('maps kids to kids', () => {
    expect(modeToBehavior('kids')).toBe('kids')
  })
  it('maps pregnancy to pregnancy', () => {
    expect(modeToBehavior('pregnancy')).toBe('pregnancy')
  })
  it('maps pre-pregnancy to cycle', () => {
    expect(modeToBehavior('pre-pregnancy')).toBe('cycle')
  })
})
