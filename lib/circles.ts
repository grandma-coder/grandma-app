/**
 * Circles (community model: Option B) — anonymous topic forum. FOUNDATION:
 * read model only (browse circles, read a circle's anonymous posts). Posting
 * and the anonymous-handle assignment come in a follow-up.
 *
 * Anonymity: posts are read via circle_posts_public, which exposes a per-circle
 * `handle` ('Anonymous Owl') instead of author_id. author_id is never fetched.
 */

import { supabase } from './supabase'

export type CircleJourney = 'pre-pregnancy' | 'pregnancy' | 'kids' | 'all'

export interface Circle {
  id: string
  name: string
  description: string | null
  journey: CircleJourney
  emoji: string | null
  is_18_plus: boolean
  post_count: number
  created_at: string
}

export interface CirclePost {
  id: string
  circle_id: string
  content: string
  reply_to_id: string | null
  reaction_count: number
  reply_count: number
  handle: string // anonymous alias — never a real name
  has_reacted: boolean // whether the CURRENT user has reacted (never cross-user)
  created_at: string
}

/** All circles, optionally filtered to a journey (+ 'all'). */
export async function getCircles(journey?: CircleJourney): Promise<Circle[]> {
  let query = supabase.from('circles').select('*').order('post_count', { ascending: false })
  if (journey && journey !== 'all') {
    query = query.in('journey', [journey, 'all'])
  }
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Circle[]
}

export async function getCircle(circleId: string): Promise<Circle | null> {
  const { data } = await supabase.from('circles').select('*').eq('id', circleId).maybeSingle()
  return (data as Circle) ?? null
}

// ─── Anonymous handles ──────────────────────────────────────────────────────
// A stable "Anonymous <Animal>" alias per (circle, user), created on first post
// so a user's posts are linkable to each other within a circle but never to
// their real identity. Generated client-side; the reviewer flagged that a
// handle MUST exist before posting or all handle-less users collapse to a
// generic "Anonymous" — ensureHandle() guarantees it.
const HANDLE_ANIMALS = [
  'Owl', 'Fox', 'Wren', 'Deer', 'Otter', 'Robin', 'Hare', 'Finch', 'Lark', 'Dove',
  'Heron', 'Sparrow', 'Bear', 'Swan', 'Moth', 'Bee', 'Fawn', 'Crane', 'Quail', 'Vole',
]

function pickAnimal(seed: string): string {
  // Deterministic-ish from the id so re-tries pick the same one before insert.
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return HANDLE_ANIMALS[h % HANDLE_ANIMALS.length]
}

/** Get the user's handle for a circle, creating one if absent. Returns handle. */
export async function ensureHandle(circleId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('circle_handles')
    .select('handle')
    .eq('circle_id', circleId)
    .eq('user_id', session.user.id)
    .maybeSingle()
  if (existing?.handle) return existing.handle

  const handle = `Anonymous ${pickAnimal(circleId + session.user.id)}`
  const { error } = await supabase
    .from('circle_handles')
    .insert({ circle_id: circleId, user_id: session.user.id, handle })
  // 23505 = someone else's concurrent insert / already exists — re-read.
  if (error && (error as any).code !== '23505') throw error
  if (error) {
    const { data } = await supabase
      .from('circle_handles').select('handle')
      .eq('circle_id', circleId).eq('user_id', session.user.id).maybeSingle()
    return data?.handle ?? handle
  }
  return handle
}

/** Post to a circle anonymously. Ensures a handle exists first. */
export async function createCirclePost(circleId: string, content: string, replyToId?: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  const text = content.trim()
  if (!text) throw new Error('Post is empty')

  await ensureHandle(circleId) // guarantee the alias exists before the post
  const { error } = await supabase.from('circle_posts').insert({
    circle_id: circleId,
    author_id: session.user.id,
    content: text,
    reply_to_id: replyToId ?? null,
  })
  if (error) throw error
}

/** Top-level posts in a circle, anonymous (from circle_posts_public). */
export async function getCirclePosts(circleId: string): Promise<CirclePost[]> {
  const { data, error } = await supabase
    .from('circle_posts_public')
    .select('*')
    .eq('circle_id', circleId)
    .is('reply_to_id', null)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data ?? []) as CirclePost[]
}

/** A single post by id (anonymous view) — used as the thread header. */
export async function getCirclePost(postId: string): Promise<CirclePost | null> {
  const { data } = await supabase
    .from('circle_posts_public')
    .select('*')
    .eq('id', postId)
    .maybeSingle()
  return (data as CirclePost) ?? null
}

/** Replies to a post, oldest-first (conversation order), anonymous. */
export async function getCircleReplies(parentId: string): Promise<CirclePost[]> {
  const { data, error } = await supabase
    .from('circle_posts_public')
    .select('*')
    .eq('reply_to_id', parentId)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) throw error
  return (data ?? []) as CirclePost[]
}

/**
 * Toggle the current user's reaction on a post. `reacted` is the CURRENT state
 * (post.has_reacted) — pass it so we know which way to flip. reaction_count is
 * maintained by a DB trigger, so we only touch the reactions table here.
 */
export async function toggleReaction(postId: string, reacted: boolean): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  if (reacted) {
    const { error } = await supabase
      .from('circle_post_reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', session.user.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('circle_post_reactions')
      .insert({ post_id: postId, user_id: session.user.id })
    // 23505 = already reacted (double-tap race) — treat as success.
    if (error && (error as any).code !== '23505') throw error
  }
}
