import { metaballLabelPositions } from '../diffusePickers/metaball'

// Parse a "34.4%" string back to a number for coordinate assertions.
const pct = (s: string): number => parseFloat(s.replace('%', ''))

describe('metaballLabelPositions', () => {
  it('returns exactly N positions with % left/top for arbitrary counts', () => {
    for (const n of [1, 3, 6, 8, 9, 12]) {
      const out = metaballLabelPositions(n)
      expect(out).toHaveLength(n)
      for (const p of out) {
        expect(p.left).toMatch(/%$/)
        expect(p.top).toMatch(/%$/)
        // Positions must sit inside the field (0–100%).
        expect(pct(p.left)).toBeGreaterThanOrEqual(0)
        expect(pct(p.left)).toBeLessThanOrEqual(100)
        expect(pct(p.top)).toBeGreaterThanOrEqual(0)
        expect(pct(p.top)).toBeLessThanOrEqual(100)
      }
    }
  })

  it('returns no duplicate positions', () => {
    for (const n of [8, 9]) {
      const out = metaballLabelPositions(n)
      const seen = new Set(out.map((p) => `${p.left}|${p.top}`))
      expect(seen.size).toBe(n)
    }
  })

  it('approximates the 8-condition reference grid (PCOS/Endometriosis diamond)', () => {
    const out = metaballLabelPositions(8)
    expect(out).toHaveLength(8)
    // First label anchors upper-left of the diamond ≈ 34.4% / 29.8%.
    expect(pct(out[0].left)).toBeCloseTo(34.4, 1)
    expect(pct(out[0].top)).toBeCloseTo(29.8, 1)
    // Center label ≈ 50% / 48.8%.
    expect(pct(out[3].left)).toBeCloseTo(50, 1)
    expect(pct(out[3].top)).toBeCloseTo(48.8, 1)
    // Last label sits at the bottom apex ≈ 50% / 86.9%.
    expect(pct(out[7].left)).toBeCloseTo(50, 1)
    expect(pct(out[7].top)).toBeCloseTo(86.9, 1)
  })

  it('approximates the 9-feeling reference grid (clean 3×3)', () => {
    const out = metaballLabelPositions(9)
    expect(out).toHaveLength(9)
    // Top-left cell ≈ 23.5% / 30%.
    expect(pct(out[0].left)).toBeCloseTo(23.5, 1)
    expect(pct(out[0].top)).toBeCloseTo(30, 1)
    // Center cell ≈ 50% / 51.25%.
    expect(pct(out[4].left)).toBeCloseTo(50, 1)
    expect(pct(out[4].top)).toBeCloseTo(51.25, 1)
    // Bottom-right cell ≈ 75.9% / 72.5%.
    expect(pct(out[8].left)).toBeCloseTo(75.9, 1)
    expect(pct(out[8].top)).toBeCloseTo(72.5, 1)
  })
})
