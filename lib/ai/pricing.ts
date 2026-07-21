/**
 * Anthropic model pricing, USD per million tokens (MTok). Used to turn the
 * token counts logged in `ai_usage` into a dollar cost at read time — so
 * re-pricing is a code edit here, never a data backfill.
 *
 * Rates as published by Anthropic (refresh from the pricing page when they
 * change). Cache reads are ~0.1× input; cache writes ~1.25× input.
 */
export interface ModelPrice {
  input: number // $/MTok
  output: number // $/MTok
  cacheRead: number // $/MTok
  cacheWrite: number // $/MTok
}

// Keyed by a normalized model family (see normalizeModel). Unknown models fall
// back to the Sonnet rate so cost is never silently zero.
export const PRICING: Record<string, ModelPrice> = {
  "sonnet-4-5": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  "haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  "opus-4": { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
}

export const DEFAULT_PRICE_KEY = "sonnet-4-5"

/** Map a raw model id (claude-sonnet-4-5, claude-haiku-4-5-20251001, …) to a pricing key. */
export function normalizeModel(model: string): string {
  const m = model.toLowerCase()
  if (m.includes("haiku")) return "haiku-4-5"
  if (m.includes("opus")) return "opus-4"
  if (m.includes("sonnet")) return "sonnet-4-5"
  return DEFAULT_PRICE_KEY
}

export interface TokenCounts {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

/** USD cost of one usage row (or an aggregated bucket) for a given model. */
export function costOf(model: string, t: TokenCounts): number {
  const p = PRICING[normalizeModel(model)] ?? PRICING[DEFAULT_PRICE_KEY]
  return (
    (t.inputTokens / 1e6) * p.input +
    (t.outputTokens / 1e6) * p.output +
    (t.cacheReadTokens / 1e6) * p.cacheRead +
    (t.cacheWriteTokens / 1e6) * p.cacheWrite
  )
}
