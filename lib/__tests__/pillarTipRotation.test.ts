import { splitTips } from '../pillarTipSplit'
import type { PillarTip } from '../../types'

const tips: PillarTip[] = [
  { label: 'L1', text: 'luteal one', phases: ['luteal'] },
  { label: 'L2', text: 'luteal two', phases: ['luteal'] },
  { label: 'L3', text: 'luteal three', phases: ['luteal'] },
  { label: 'U1', text: 'untagged' },
]

describe('splitTips', () => {
  it('puts a daily slice of phase-matching tips in forYou', () => {
    const { forYou } = splitTips(tips, { cyclePhase: 'luteal', cycleDay: 18 }, 18, 2)
    expect(forYou).toHaveLength(2)
    expect(forYou.every((t) => t.phases?.includes('luteal'))).toBe(true)
  })

  it('rotates the forYou slice across cycle days', () => {
    const a = splitTips(tips, { cyclePhase: 'luteal', cycleDay: 18 }, 18, 1)
    const b = splitTips(tips, { cyclePhase: 'luteal', cycleDay: 19 }, 19, 1)
    expect(a.forYou[0].label).not.toBe(b.forYou[0].label)
  })

  it('keeps every non-surfaced tip in general (nothing hidden)', () => {
    const { forYou, general } = splitTips(tips, { cyclePhase: 'luteal', cycleDay: 18 }, 18, 1)
    expect(forYou.length + general.length).toBe(tips.length)
  })

  it('forYou is empty when there is no cycle context', () => {
    const { forYou } = splitTips(tips, {}, 1, 2)
    expect(forYou).toHaveLength(0)
  })
})
