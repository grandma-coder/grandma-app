import type { JourneyMode } from '../../types'
import type { DailyCard, DailyTag } from './types'
import { getCardsForMode } from './index'

interface MatchOpts { exclude?: string[]; rng?: () => number }

// Match an answer's tags to a card: score by tag overlap, pick randomly within
// the highest-scoring tier. Falls back to any same-mode card so it never blanks.
export function matchCard(optionTags: DailyTag[], mode: JourneyMode, opts: MatchOpts = {}): DailyCard {
  const rng = opts.rng ?? Math.random
  const exclude = new Set(opts.exclude ?? [])
  const pool = getCardsForMode(mode).filter((c) => !exclude.has(c.id))
  const candidates = pool.length ? pool : getCardsForMode(mode) // exclude-everything guard

  const wanted = new Set(optionTags)
  const scored = candidates.map((c) => ({
    card: c,
    score: c.tags.reduce((n, t) => (wanted.has(t) ? n + 1 : n), 0),
  }))
  const top = Math.max(0, ...scored.map((s) => s.score))
  const tier = top > 0 ? scored.filter((s) => s.score === top) : scored
  return tier[Math.floor(rng() * tier.length)].card
}
