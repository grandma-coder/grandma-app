import { bucketSeries } from '../bucketSeries'

describe('bucketSeries', () => {
  it('passes short series through unchanged (weekly view identical)', () => {
    expect(bucketSeries([1, 2, 3, 0, 5, 6, 7], ['M', 'T', 'W', 'T', 'F', 'S', 'S'], 12)).toEqual({
      data: [1, 2, 3, 0, 5, 6, 7],
      labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    })
  })

  it('buckets a long series down to at most maxCols columns', () => {
    const data = Array.from({ length: 90 }, (_, i) => i + 1) // 90 days
    const out = bucketSeries(data, undefined, 12)
    expect(out.data.length).toBeLessThanOrEqual(12)
    expect(out.data.length).toBeGreaterThan(1)
    // Each bucket is the mean of its chunk; first chunk = ceil(90/12)=8 days → mean of 1..8 = 4.5
    expect(out.data[0]).toBeCloseTo(4.5, 5)
  })

  it('365-day window collapses to a drawable column count (the blank-chart bug)', () => {
    const data = new Array(365).fill(1)
    const out = bucketSeries(data, undefined, 12)
    expect(out.data.length).toBeLessThanOrEqual(12)
    expect(out.data.every((v) => v === 1)).toBe(true) // mean of all-1 chunks is 1
  })

  it('labels the bucket by its most-recent day', () => {
    const labels = Array.from({ length: 30 }, (_, i) => `d${i}`)
    const out = bucketSeries(new Array(30).fill(0), labels, 12)
    // last bucket's label is the final day
    expect(out.labels[out.labels.length - 1]).toBe('d29')
  })

  it('handles empty input', () => {
    expect(bucketSeries([], [], 12)).toEqual({ data: [], labels: [] })
  })
})
