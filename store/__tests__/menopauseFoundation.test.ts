import { behaviorFromDbType } from '../useBehaviorStore'
import { getModeConfig } from '../../lib/modeConfig'
import { getModeColor, getDiffuseAccent } from '../../constants/theme'

describe('menopause foundation', () => {
  it('round-trips the menopause behavior db type 1:1', () => {
    expect(behaviorFromDbType('menopause')).toBe('menopause')
  })
  it('has a mode config with library + exchange hidden and vault as Analytics', () => {
    const cfg = getModeConfig('menopause')
    expect(cfg.tabs.library.visible).toBe(false)
    expect(cfg.tabs.exchange.visible).toBe(false)
    expect(cfg.tabs.vault.visible).toBe(true)
    expect(cfg.aiContextLabel).toBe('menopause')
  })
  it('resolves a distinct mode color for menopause', () => {
    expect(getModeColor('menopause', false)).toBe('#F2A06E') // site-look tone (Nov 2026)
    for (const other of ['pre-pregnancy', 'pregnancy', 'kids']) expect(getModeColor('menopause', false)).not.toBe(getModeColor(other, false))
  })
  it('resolves a distinct Diffuse accent for menopause', () => {
    expect(getDiffuseAccent('menopause', false)).toBe('#C2703A')
    // The ember accent must be distinct from every other mode's accent.
    expect(getDiffuseAccent('menopause', false)).not.toBe(getDiffuseAccent('pre-pregnancy', false))
    expect(getDiffuseAccent('menopause', false)).not.toBe(getDiffuseAccent('pregnancy', false))
    expect(getDiffuseAccent('menopause', false)).not.toBe(getDiffuseAccent('kids', false))
    expect(getDiffuseAccent('menopause', false)).not.toBe(getDiffuseAccent('care', false))
  })
})
