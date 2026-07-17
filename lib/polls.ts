/**
 * Polls (Phase 3 / community engagement). A poll is attached to a channel_post
 * so it appears in the feed. 2–5 options; one vote per user (swappable); live
 * vote percentages. Backed by polls / poll_options / poll_votes
 * (migration 20260717180000_polls.sql).
 */

import { supabase } from './supabase'
import { sendMessage } from './channelPosts'

export interface PollOption {
  id: string
  label: string
  position: number
  votes: number // resolved count
}

export interface Poll {
  id: string
  post_id: string
  channel_id: string
  author_id: string
  question: string
  closes_at: string | null
  options: PollOption[]
  total_votes: number
  my_option_id: string | null // the option the current user voted for
  created_at: string
}

export const POLL_MIN_OPTIONS = 2
export const POLL_MAX_OPTIONS = 5

/**
 * Create a poll: post a message (so it appears in the feed) then attach the
 * poll + options to it. Returns the new poll id.
 */
export async function createPoll(params: {
  channelId: string
  question: string
  options: string[]
}): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const opts = params.options.map((o) => o.trim()).filter(Boolean)
  if (opts.length < POLL_MIN_OPTIONS) throw new Error('A poll needs at least 2 options')
  if (opts.length > POLL_MAX_OPTIONS) throw new Error('A poll can have at most 5 options')

  // The feed message carries the question text so channels without poll-aware
  // rendering still show something meaningful.
  const post = await sendMessage(params.channelId, `📊 ${params.question}`)

  const { data: poll, error: pollErr } = await supabase
    .from('polls')
    .insert({
      post_id: post.id,
      channel_id: params.channelId,
      author_id: session.user.id,
      question: params.question,
    })
    .select('id')
    .single()
  if (pollErr) throw pollErr

  const { error: optErr } = await supabase.from('poll_options').insert(
    opts.map((label, i) => ({ poll_id: poll.id, label, position: i }))
  )
  if (optErr) throw optErr

  return poll.id
}

/** Fetch the poll attached to a post (or null), with counts + the user's vote. */
export async function getPollForPost(postId: string): Promise<Poll | null> {
  const { data: poll } = await supabase
    .from('polls')
    .select('*')
    .eq('post_id', postId)
    .maybeSingle()
  if (!poll) return null
  return hydratePoll(poll)
}

async function hydratePoll(poll: any): Promise<Poll> {
  const [{ data: options }, { data: votes }, { data: { session } }] = await Promise.all([
    supabase.from('poll_options').select('*').eq('poll_id', poll.id).order('position', { ascending: true }),
    supabase.from('poll_votes').select('option_id, user_id').eq('poll_id', poll.id),
    supabase.auth.getSession(),
  ])

  const countByOption = new Map<string, number>()
  for (const v of votes ?? []) countByOption.set(v.option_id, (countByOption.get(v.option_id) ?? 0) + 1)
  const myVote = (votes ?? []).find((v: any) => v.user_id === session?.user.id)

  const resolvedOptions: PollOption[] = (options ?? []).map((o: any) => ({
    id: o.id,
    label: o.label,
    position: o.position,
    votes: countByOption.get(o.id) ?? 0,
  }))

  return {
    id: poll.id,
    post_id: poll.post_id,
    channel_id: poll.channel_id,
    author_id: poll.author_id,
    question: poll.question,
    closes_at: poll.closes_at ?? null,
    options: resolvedOptions,
    total_votes: (votes ?? []).length,
    my_option_id: myVote?.option_id ?? null,
    created_at: poll.created_at,
  }
}

/**
 * Cast (or change/remove) the current user's vote. Same option again = remove;
 * different = switch; none = add. One vote per (poll, user) — enforced by the
 * UNIQUE constraint. Returns the chosen option id, or null if the vote was
 * removed.
 */
export async function castVote(pollId: string, optionId: string): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('poll_votes')
    .select('id, option_id')
    .eq('poll_id', pollId)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (existing) {
    if (existing.option_id === optionId) {
      await supabase.from('poll_votes').delete().eq('id', existing.id)
      return null
    }
    await supabase.from('poll_votes').update({ option_id: optionId }).eq('id', existing.id)
    return optionId
  }
  const { error } = await supabase
    .from('poll_votes')
    .insert({ poll_id: pollId, option_id: optionId, user_id: session.user.id })
  if (error) throw error
  return optionId
}

/** Poll ids attached to a set of posts, for the message list to lazy-load. */
export async function getPollIdsForPosts(postIds: string[]): Promise<Record<string, string>> {
  if (postIds.length === 0) return {}
  const { data } = await supabase.from('polls').select('id, post_id').in('post_id', postIds)
  const map: Record<string, string> = {}
  for (const p of data ?? []) map[p.post_id] = p.id
  return map
}
