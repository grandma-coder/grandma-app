import { pickCycleNudge, type NudgeContext } from '../cycleNudges'

const base: NudgeContext = {
  phase: 'luteal',
  cycleDay: 18,
  hasBBTToday: false,
  hasLHToday: false,
  hasCMToday: false,
  moodToday: null,
  daysLate: 0,
  bbtShiftConfirmed: false,
}

describe('pickCycleNudge', () => {
  it('lets a log-driven override win over rotation', () => {
    const ctx = { ...base, moodToday: '1' } // low mood logged
    expect(pickCycleNudge(ctx).id).toBe('luteal-pms')
  })

  it('rotates general luteal templates across cycle days when no override fires', () => {
    const d18 = pickCycleNudge({ ...base, cycleDay: 18 })
    const d19 = pickCycleNudge({ ...base, cycleDay: 19 })
    expect(d18.id).not.toBe(d19.id)
  })

  it('only returns templates eligible for the current phase', () => {
    const n = pickCycleNudge({ ...base, phase: 'follicular', cycleDay: 9 })
    expect(['luteal-care', 'luteal-pms', 'luteal-sleep', 'luteal-move']).not.toContain(n.id)
  })

  it('always returns a template (fallback never empty)', () => {
    expect(pickCycleNudge(base)).toBeDefined()
  })
})
