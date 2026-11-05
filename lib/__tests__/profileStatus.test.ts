import { getCycleSubtitle } from '../profileStatus'

describe('getCycleSubtitle', () => {
  it('never invents a cycle day when no period is logged', () => {
    const s = getCycleSubtitle(null)
    expect(s).not.toMatch(/\d/)
    expect(s.length).toBeGreaterThan(0)
  })
  it('shows the real day and phase', () => {
    const s = getCycleSubtitle({ cycleDay: 17, phaseLabel: 'Luteal' })
    expect(s).toContain('17')
    expect(s).toContain('Luteal')
  })
})
