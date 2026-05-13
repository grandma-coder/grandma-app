import { bandAt, estimatePercentile, sampleBands } from '../growthStandards'

describe('growth standards', () => {
  describe('bandAt', () => {
    it('returns the P50 weight at 0mo for boys (newborn ~3.3kg)', () => {
      const b = bandAt('weight', 'male', 0)
      expect(b).not.toBeNull()
      expect(b!.p50).toBeCloseTo(3.3, 1)
    })

    it('returns null below the table range', () => {
      expect(bandAt('weight', 'male', -1)).toBeNull()
    })

    it('returns null above the table range (>20y)', () => {
      expect(bandAt('weight', 'male', 250)).toBeNull()
    })

    it('linearly interpolates between two data points', () => {
      // 5mo is between WHO data points at 4mo and 6mo; expect a value
      // between them, not equal to either endpoint.
      const at4 = bandAt('weight', 'male', 4)!
      const at5 = bandAt('weight', 'male', 5)!
      const at6 = bandAt('weight', 'male', 6)!
      expect(at5.p50).toBeGreaterThan(at4.p50)
      expect(at5.p50).toBeLessThan(at6.p50)
    })

    it('differentiates boys and girls', () => {
      // Boys are generally heavier at 12mo than girls of the same age.
      const boys = bandAt('weight', 'male', 12)!
      const girls = bandAt('weight', 'female', 12)!
      expect(boys.p50).toBeGreaterThan(girls.p50)
    })
  })

  describe('estimatePercentile', () => {
    it('returns ~50 for a P50 measurement', () => {
      const pct = estimatePercentile('weight', 'male', 12, 9.6)
      expect(pct).toBeGreaterThanOrEqual(45)
      expect(pct).toBeLessThanOrEqual(55)
    })

    it('returns 1 for a measurement below P3', () => {
      expect(estimatePercentile('weight', 'male', 12, 5)).toBe(1)
    })

    it('returns 99 for a measurement above P97', () => {
      expect(estimatePercentile('weight', 'male', 12, 20)).toBe(99)
    })

    it('returns ~15 at the P15 value', () => {
      const b = bandAt('weight', 'female', 6)!
      const pct = estimatePercentile('weight', 'female', 6, b.p15)
      expect(pct).toBeGreaterThanOrEqual(13)
      expect(pct).toBeLessThanOrEqual(17)
    })

    it('returns null outside the table range', () => {
      expect(estimatePercentile('weight', 'male', -1, 5)).toBeNull()
    })
  })

  describe('sampleBands', () => {
    it('produces the requested number of samples', () => {
      const bands = sampleBands('weight', 'male', 0, 24, 13)
      expect(bands.length).toBe(13)
    })

    it('every sample has monotonically non-decreasing P50 over 0-24mo', () => {
      const bands = sampleBands('weight', 'male', 0, 24, 25)
      for (let i = 1; i < bands.length; i++) {
        expect(bands[i].p50).toBeGreaterThanOrEqual(bands[i - 1].p50)
      }
    })
  })
})
