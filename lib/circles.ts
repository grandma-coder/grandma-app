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
