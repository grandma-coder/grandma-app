import { supabase } from '../supabase'
import type { BirthTopic, BirthTopicKey, BirthSection, BirthSource } from '../birthGuideData'

// ── DB-first birth-guide topics (managed from the command center) ─────────────
//
// Birth topics live in the `content_birth_topics` Supabase table so they can be
// edited in the command center (including the medical sources) and flow live to
// the app. This module fetches them once, caches them, and exposes the cache to
// birthGuideData.ts.
//
// SAFETY: purely additive. Any fetch failure / empty table leaves the cache null
// so birthGuideData.ts keeps using the bundled hardcoded topics. Health content
// is never blank because of a bad edit or an outage.

let cache: Map<string, BirthTopic> | null = null

interface Row {
  key: string
  emoji: string
  title: string
  subtitle: string
  hero_color: string | null
  hero_border: string | null
  disclaimer: string | null
  sections: unknown
  sources: unknown
  active: boolean
}

function toTopic(r: Row): BirthTopic | null {
  if (!r.key || !r.title) return null
  const sections = Array.isArray(r.sections) ? (r.sections as BirthSection[]) : []
  const sources = Array.isArray(r.sources) ? (r.sources as BirthSource[]) : []
  if (sections.length === 0) return null // never publish an empty topic over the bundled one
  return {
    key: r.key as BirthTopicKey,
    emoji: r.emoji ?? '',
    title: r.title,
    subtitle: r.subtitle ?? '',
    heroColor: r.hero_color ?? '#FBFAF5',
    heroBorder: r.hero_border ?? '#EDE9DD',
    disclaimer: r.disclaimer ?? undefined,
    sections,
    sources,
  }
}

/**
 * Fetch active birth topics and populate the cache. Best-effort — any failure
 * leaves the cache null so birthGuideData.ts falls back to the bundled topics.
 * Call once at app start (see _layout). Safe to call again.
 */
export async function hydrateBirthTopics(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('content_birth_topics')
      .select('key, emoji, title, subtitle, hero_color, hero_border, disclaimer, sections, sources, active')
      .eq('active', true)
      .order('sort', { ascending: true })
    if (error || !data) return

    const map = new Map<string, BirthTopic>()
    for (const row of data as Row[]) {
      const t = toTopic(row)
      if (t) map.set(t.key, t)
    }
    if (map.size > 0) cache = map
  } catch {
    // swallow — fallback to bundled topics
  }
}

/** DB topic for a key, or null if not cached (→ fallback). */
export function getRemoteBirthTopic(key: string): BirthTopic | null {
  return cache?.get(key) ?? null
}

/** All cached topics, or null. */
export function getAllRemoteBirthTopics(): BirthTopic[] | null {
  if (!cache || cache.size === 0) return null
  return Array.from(cache.values())
}
