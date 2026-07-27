import { computeCrossInsights, nextDay } from '../kidsCrossInsights'

type Log = {
  id: string
  child_id: string
  date: string
  type: string
  value: string | null
  notes: string | null
  photos: string[]
  created_at: string
}

const log = (date: string, type: string, value: string | null): Log => ({
  id: date + type,
  child_id: 'c',
  date,
  type,
  value,
  notes: null,
  photos: [],
  created_at: date,
})

describe('nextDay — local date arithmetic', () => {
  it('advances a plain date by one day', () => {
    expect(nextDay('2026-07-01')).toBe('2026-07-02')
  })

  it('rolls over the year (would break under toISOString/UTC shifting)', () => {
    expect(nextDay('2026-12-31')).toBe('2027-01-01')
  })

  it('rolls over a month boundary', () => {
    expect(nextDay('2026-02-28')).toBe('2026-03-01')
  })
})

describe('computeCrossInsights — sleep -> mood', () => {
  it('fires when short-sleep nights precede cranky/fussy days (above threshold)', () => {
    const logs: Log[] = [
      log('2026-07-01', 'sleep', JSON.stringify({ duration: 5, quality: 'poor' })),
      log('2026-07-02', 'mood', 'cranky'),
      log('2026-07-03', 'sleep', JSON.stringify({ duration: 5, quality: 'poor' })),
      log('2026-07-04', 'mood', 'fussy'),
      log('2026-07-05', 'sleep', JSON.stringify({ duration: 5, quality: 'poor' })),
      log('2026-07-06', 'mood', 'cranky'),
    ]
    const out = computeCrossInsights(logs, 26)
    const hit = out.find((i) => i.kind === 'sleep_mood')
    expect(hit).toBeDefined()
    expect(hit?.severity).toBe('watch')
    expect(hit?.pillars).toEqual(['sleep', 'mood'])
    expect(hit?.line.length).toBeGreaterThan(0)
  })

  it('does NOT fire on a single occurrence (below threshold)', () => {
    const logs: Log[] = [
      log('2026-07-01', 'sleep', JSON.stringify({ duration: 5, quality: 'poor' })),
      log('2026-07-02', 'mood', 'cranky'),
    ]
    expect(computeCrossInsights(logs, 26).some((i) => i.kind === 'sleep_mood')).toBe(false)
  })

  it('does NOT fire when short nights are not followed by a cranky day', () => {
    const logs: Log[] = [
      log('2026-07-01', 'sleep', JSON.stringify({ duration: 5, quality: 'poor' })),
      log('2026-07-02', 'mood', 'happy'),
      log('2026-07-03', 'sleep', JSON.stringify({ duration: 5, quality: 'poor' })),
      log('2026-07-04', 'mood', 'calm'),
      log('2026-07-05', 'sleep', JSON.stringify({ duration: 5, quality: 'poor' })),
      log('2026-07-06', 'mood', 'energetic'),
    ]
    expect(computeCrossInsights(logs, 26).some((i) => i.kind === 'sleep_mood')).toBe(false)
  })

  it('handles mood values stored as a JSON object ({ mood: "cranky" }) as well as bare strings', () => {
    const logs: Log[] = [
      log('2026-07-01', 'sleep', JSON.stringify({ duration: 5, quality: 'poor' })),
      log('2026-07-02', 'mood', JSON.stringify({ mood: 'cranky' })),
      log('2026-07-03', 'sleep', JSON.stringify({ duration: 6, quality: 'poor' })),
      log('2026-07-04', 'mood', JSON.stringify({ mood: 'fussy' })),
      log('2026-07-05', 'sleep', JSON.stringify({ duration: 5, quality: 'poor' })),
      log('2026-07-06', 'mood', JSON.stringify({ mood: 'cranky' })),
    ]
    expect(computeCrossInsights(logs, 26).some((i) => i.kind === 'sleep_mood')).toBe(true)
  })

  it('year-boundary nights still join correctly to the next-day mood log', () => {
    const logs: Log[] = [
      log('2026-12-30', 'sleep', JSON.stringify({ duration: 5, quality: 'poor' })),
      log('2026-12-31', 'mood', 'cranky'),
      log('2026-12-31', 'sleep', JSON.stringify({ duration: 5, quality: 'poor' })),
      log('2027-01-01', 'mood', 'fussy'),
      log('2027-01-01', 'sleep', JSON.stringify({ duration: 5, quality: 'poor' })),
      log('2027-01-02', 'mood', 'cranky'),
    ]
    expect(computeCrossInsights(logs, 26).some((i) => i.kind === 'sleep_mood')).toBe(true)
  })

  it('does not throw on malformed/non-JSON values', () => {
    const logs: Log[] = [
      log('2026-07-01', 'sleep', 'not json'),
      log('2026-07-02', 'mood', 'cranky'),
      log('2026-07-03', 'sleep', null),
      log('2026-07-04', 'mood', null),
    ]
    expect(() => computeCrossInsights(logs, 26)).not.toThrow()
  })
})

describe('computeCrossInsights — food reaction watch', () => {
  it('fires when reactions are logged at or above the threshold', () => {
    const logs: Log[] = [
      log('2026-07-01', 'food', JSON.stringify({ hasReaction: true, reactionFood: 'strawberries' })),
      log('2026-07-03', 'food', JSON.stringify({ hasReaction: true, reactionFood: 'strawberries' })),
    ]
    const out = computeCrossInsights(logs, 26)
    const hit = out.find((i) => i.kind === 'food_reaction')
    expect(hit).toBeDefined()
    expect(hit?.severity).toBe('watch')
    expect(hit?.pillars).toEqual(['nutrition'])
    expect(hit?.line).toContain('strawberries')
  })

  it('does NOT fire on a single occurrence (below threshold)', () => {
    const logs: Log[] = [
      log('2026-07-01', 'food', JSON.stringify({ hasReaction: true, reactionFood: 'strawberries' })),
    ]
    expect(computeCrossInsights(logs, 26).some((i) => i.kind === 'food_reaction')).toBe(false)
  })

  it('recognizes hasReaction without a named food', () => {
    const logs: Log[] = [
      log('2026-07-01', 'food', JSON.stringify({ hasReaction: true })),
      log('2026-07-02', 'food', JSON.stringify({ hasReaction: true })),
    ]
    const out = computeCrossInsights(logs, 26)
    const hit = out.find((i) => i.kind === 'food_reaction')
    expect(hit).toBeDefined()
    expect(hit?.line.length).toBeGreaterThan(0)
  })

  it('ignores food logs without a reaction', () => {
    const logs: Log[] = [
      log('2026-07-01', 'food', JSON.stringify({ quality: 'ate_well' })),
      log('2026-07-02', 'food', JSON.stringify({ quality: 'ate_well' })),
      log('2026-07-03', 'food', JSON.stringify({ quality: 'ate_little' })),
    ]
    expect(computeCrossInsights(logs, 26).some((i) => i.kind === 'food_reaction')).toBe(false)
  })
})

describe('computeCrossInsights — general behavior', () => {
  it('returns [] for empty logs', () => {
    expect(computeCrossInsights([], 26)).toEqual([])
  })

  it('returns [] when logs exist but no pattern clears its threshold', () => {
    const logs: Log[] = [
      log('2026-07-01', 'sleep', JSON.stringify({ duration: 12, quality: 'great' })),
      log('2026-07-02', 'mood', 'happy'),
      log('2026-07-03', 'food', JSON.stringify({ quality: 'ate_well' })),
    ]
    expect(computeCrossInsights(logs, 26)).toEqual([])
  })

  it('never throws regardless of input shape', () => {
    const logs: Log[] = [
      log('2026-07-01', 'sleep', '{"broken json'),
      log('2026-07-02', 'unknown_type', 'whatever'),
      log('2026-07-03', 'food', 'plain-string-not-json'),
    ]
    expect(() => computeCrossInsights(logs, 26)).not.toThrow()
  })

  it('sorts insights with the most important (watch) first when multiple patterns fire', () => {
    const logs: Log[] = [
      // sleep -> mood (3 hits)
      log('2026-07-01', 'sleep', JSON.stringify({ duration: 5, quality: 'poor' })),
      log('2026-07-02', 'mood', 'cranky'),
      log('2026-07-03', 'sleep', JSON.stringify({ duration: 5, quality: 'poor' })),
      log('2026-07-04', 'mood', 'fussy'),
      log('2026-07-05', 'sleep', JSON.stringify({ duration: 5, quality: 'poor' })),
      log('2026-07-06', 'mood', 'cranky'),
      // food reaction (2 hits)
      log('2026-07-10', 'food', JSON.stringify({ hasReaction: true, reactionFood: 'egg' })),
      log('2026-07-12', 'food', JSON.stringify({ hasReaction: true, reactionFood: 'egg' })),
    ]
    const out = computeCrossInsights(logs, 26)
    expect(out.length).toBe(2)
    expect(out.every((i) => i.severity === 'watch')).toBe(true)
  })
})
