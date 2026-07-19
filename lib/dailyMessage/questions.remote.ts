import type { JourneyMode } from '../../types'
import type { DailyQuestion } from './types'
import { supabase } from '../supabase'

// ── DB-first question bank (managed from the command center) ──────────────────
//
// Daily questions live in the `content_daily_questions` Supabase table so they
// can be edited in the command center and flow live to the app. This module
// fetches them once, caches them in memory, and exposes the cache to index.ts.
//
// SAFETY: this is purely additive. If the fetch fails, the table is empty, or a
// mode has no rows, index.ts keeps using the bundled hardcoded arrays. Users
// never see blank questions because of a bad edit or an outage.

type Bank = Record<JourneyMode, DailyQuestion[]>

let cache: Bank | null = null

interface Row {
  id: string
  mode: string
  prompt: string
  options: unknown
  active: boolean
  sort: number
}

function isMode(m: string): m is JourneyMode {
  return m === 'pregnancy' || m === 'pre-pregnancy' || m === 'kids'
}

function toQuestion(r: Row): DailyQuestion | null {
  if (!isMode(r.mode)) return null
  const options = Array.isArray(r.options)
    ? (r.options as { label?: unknown; tags?: unknown }[])
        .map((o) => ({
          label: typeof o.label === 'string' ? o.label : '',
          tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === 'string') : [],
        }))
        .filter((o) => o.label)
    : []
  if (!r.prompt || options.length < 2) return null
  return { id: r.id, mode: r.mode, prompt: r.prompt, options: options as DailyQuestion['options'] }
}

/**
 * Fetch active questions from the DB and populate the cache. Best-effort: any
 * failure leaves the cache null so index.ts falls back to the bundled arrays.
 * Call once at app start (see useHydrateDailyQuestions). Safe to call again.
 */
export async function hydrateDailyQuestions(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('content_daily_questions')
      .select('id, mode, prompt, options, active, sort')
      .eq('active', true)
      .order('mode', { ascending: true })
      .order('sort', { ascending: true })
    if (error || !data) return

    const next: Bank = { 'pre-pregnancy': [], pregnancy: [], kids: [] }
    for (const row of data as Row[]) {
      const q = toQuestion(row)
      if (q) next[q.mode].push(q)
    }
    // Only publish a mode's bank if the DB actually returned questions for it —
    // an empty DB mode must not shadow a populated hardcoded bank.
    cache = next
  } catch {
    // swallow — fallback to bundled arrays
  }
}

/** Returns the DB questions for a mode, or null if none cached (→ fallback). */
export function getRemoteQuestionsForMode(mode: JourneyMode): DailyQuestion[] | null {
  const bank = cache?.[mode]
  return bank && bank.length > 0 ? bank : null
}

/** All cached questions across modes (for id lookups), or null. */
export function getAllRemoteQuestions(): DailyQuestion[] | null {
  if (!cache) return null
  const all = [...cache['pre-pregnancy'], ...cache.pregnancy, ...cache.kids]
  return all.length > 0 ? all : null
}
