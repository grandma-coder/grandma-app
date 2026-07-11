import type { JourneyMode } from '../../types'
import type { DailyCard } from './types'
import type { DailyTag } from './tags'
import { getCardsForMode } from './index'

interface MatchOpts { exclude?: string[]; rng?: () => number }

// Match an answer's tags to a card: score by tag overlap, pick randomly within
// the highest-scoring tier. Falls back to any same-mode card so it never blanks.
export function matchCard(optionTags: DailyTag[], mode: JourneyMode, opts: MatchOpts = {}): DailyCard {
  // Pregnancy is the only populated card bank today ('kids' and 'pre-pregnancy'
  // are empty arrays — see lib/dailyMessage/index.ts CARDS_BY_MODE). Callers
  // currently only invoke this for pregnancy, but guard here with a clear,
  // named error instead of letting an empty bank fall through to a cryptic
  // "Cannot read properties of undefined" when indexing into an empty tier.
  const bank = getCardsForMode(mode)
  if (bank.length === 0) {
    throw new Error(`matchCard: no cards for mode "${mode}"`)
  }

  const rng = opts.rng ?? Math.random
  const exclude = new Set(opts.exclude ?? [])
  const pool = bank.filter((c) => !exclude.has(c.id))
  const candidates = pool.length ? pool : bank // exclude-everything guard

  const wanted = new Set(optionTags)
  const scored = candidates.map((c) => ({
    card: c,
    score: c.tags.reduce((n, t) => (wanted.has(t) ? n + 1 : n), 0),
  }))
  const top = Math.max(0, ...scored.map((s) => s.score))
  const tier = top > 0 ? scored.filter((s) => s.score === top) : scored
  return tier[Math.floor(rng() * tier.length)].card
}
