import { describe, expect, it } from 'vitest'
import { barAway, phoneScale, visibleFraction } from './phone'

describe('phoneScale (fitPhone)', () => {
  it.each([
    [320, 568, 0.41],
    [390, 664, 0.53],
    [430, 740, 0.625],
    [1440, 900, 0.825],
  ])('%i x %i -> %f', (w, h, s) => {
    expect(phoneScale(w, h)).toBeCloseTo(s, 3)
  })
  it('never exceeds 1 and never collapses', () => {
    expect(phoneScale(3000, 3000)).toBeLessThanOrEqual(1)
    expect(phoneScale(320, 200)).toBeGreaterThan(0)
  })
  it('fits the column at 320: the scaled phone is narrower than the 288px content box', () => {
    expect(390 * phoneScale(320, 568)).toBeLessThanOrEqual(320 - 32)
    expect(390 * phoneScale(320, 900)).toBeLessThanOrEqual(320 - 32)
  })
})

describe('visibleFraction', () => {
  const rect = (top: number, h: number) => ({ top, bottom: top + h, height: h })
  it('is 1 when fully on screen, 0 when off screen', () => {
    expect(visibleFraction(rect(100, 400), 800)).toBe(1)
    expect(visibleFraction(rect(900, 400), 800)).toBe(0)
    expect(visibleFraction(rect(-500, 400), 800)).toBe(0)
  })
  it('counts only the visible slice', () => {
    expect(visibleFraction(rect(-300, 400), 800)).toBeCloseTo(0.25)
    expect(visibleFraction(rect(700, 400), 800)).toBeCloseTo(0.25)
  })
  it('handles an empty rect', () => {
    expect(visibleFraction(rect(10, 0), 800)).toBe(0)
  })
})

describe('barAway (syncBar)', () => {
  it('steps aside while more than 15% of the phone is visible', () => {
    expect(barAway({ small: true, panelOpen: false, visible: 0.16 })).toBe(true)
    expect(barAway({ small: true, panelOpen: false, visible: 0.15 })).toBe(false)
    expect(barAway({ small: true, panelOpen: false, visible: 0 })).toBe(false)
  })
  it('is forced visible while Explorar or the pop-up is open', () => {
    expect(barAway({ small: true, panelOpen: true, visible: 1 })).toBe(false)
  })
  it('is never away on desktop', () => {
    expect(barAway({ small: false, panelOpen: false, visible: 1 })).toBe(false)
  })
})
