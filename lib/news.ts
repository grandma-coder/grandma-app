import { supabase } from './supabase'
import type { JourneyMode } from '../types'

// ── App news feed — reads published articles from content_news ────────────────
//
// Articles are researched + published from the command center (content_news
// table; RLS exposes only status='published' to the app). This is the data
// layer for an in-app news feed. There's no bundled fallback here because news
// is inherently dynamic — an empty feed is a valid state (nothing published yet),
// not a failure, so the UI just shows "nothing new."

export interface NewsSource {
  title: string
  url: string
}

export interface NewsArticle {
  id: string
  title: string
  summary: string | null
  body: string
  topic: string | null
  mode: JourneyMode | null
  sources: NewsSource[]
  imageUrl: string | null
  publishedAt: string | null
}

interface Row {
  id: string
  title: string
  summary: string | null
  body: string
  topic: string | null
  mode: string | null
  sources: unknown
  image_url: string | null
  published_at: string | null
}

function toArticle(r: Row): NewsArticle {
  const sources: NewsSource[] = Array.isArray(r.sources)
    ? (r.sources as { title?: unknown; url?: unknown }[])
        .map((s) => ({
          title: typeof s.title === 'string' ? s.title : '',
          url: typeof s.url === 'string' ? s.url : '',
        }))
        .filter((s) => /^https?:\/\//.test(s.url))
    : []
  return {
    id: r.id,
    title: r.title,
    summary: r.summary,
    body: r.body,
    topic: r.topic,
    mode: (r.mode as JourneyMode) ?? null,
    sources,
    imageUrl: r.image_url,
    publishedAt: r.published_at,
  }
}

/**
 * Fetch published news, newest first. Optionally filter to a journey mode (plus
 * mode-less "general" items, which are shown to everyone). Returns [] on any
 * error — the feed degrades to empty, never throws at render.
 */
export async function fetchNews(mode?: JourneyMode, limit = 30): Promise<NewsArticle[]> {
  try {
    let query = supabase
      .from('content_news')
      .select('id, title, summary, body, topic, mode, sources, image_url, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit)
    if (mode) query = query.or(`mode.eq.${mode},mode.is.null`)
    const { data, error } = await query
    if (error || !data) return []
    return (data as Row[]).map(toArticle)
  } catch {
    return []
  }
}
