/**
 * Leaderboard API — fetches community rankings from the leaderboard_scores view.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { toDateStr } from './cycleLogic'

export interface LeaderboardEntry {
  user_id: string
  name: string
  photo_url: string | null
  garage_posts: number
  garage_likes: number
  channel_posts: number
  channel_reactions: number
  channels_joined: number
  child_logs: number
  total_points: number
  rank?: number
}

export async function fetchLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard_scores')
    .select('*')
    .order('total_points', { ascending: false })
    .limit(limit)

  if (error) {
    // Fallback: query profiles + counts directly if view doesn't exist yet
    return fetchLeaderboardFallback(limit)
  }

  return (data ?? []).map((entry: any, i: number) => ({
    user_id: entry.user_id,
    name: entry.name || 'Anonymous',
    photo_url: entry.photo_url,
    garage_posts: entry.garage_posts || 0,
    garage_likes: entry.garage_likes || 0,
    channel_posts: entry.channel_posts || 0,
    channel_reactions: entry.channel_reactions || 0,
    channels_joined: entry.channels_joined || 0,
    child_logs: entry.child_logs || 0,
    total_points: entry.total_points || 0,
    rank: i + 1,
  }))
}

/** Fallback when the view isn't available yet */
async function fetchLeaderboardFallback(limit: number): Promise<LeaderboardEntry[]> {
  // Get all profiles with names
  const { data: profiles } = await supabase
    .from('profiles_public')
    .select('id, name, photo_url')
    .not('name', 'is', null)
    .limit(50)

  if (!profiles || profiles.length === 0) return []

  const profileIds = profiles.map((p) => p.id)

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  // Batch the aggregations: one query per table across ALL profiles using
  // `.in(...)`, then tally in memory. This previously fanned out to ~6 queries
  // PER profile (up to ~300 round-trips); it is now a fixed 4 parallel queries
  // regardless of profile count.
  const [garageRes, channelRes, membersRes, childLogsRes] = await Promise.all([
    supabase.from('garage_posts').select('author_id, like_count').in('author_id', profileIds),
    supabase.from('channel_posts').select('author_id, reaction_count').in('author_id', profileIds),
    supabase.from('channel_members').select('user_id').in('user_id', profileIds),
    supabase.from('child_logs').select('user_id').in('user_id', profileIds).gte('date', toDateStr(ninetyDaysAgo)),
  ])

  // Per-user tallies keyed by profile id.
  const garagePosts = new Map<string, number>()
  const garageLikes = new Map<string, number>()
  for (const row of garageRes.data ?? []) {
    const id = (row as any).author_id as string
    garagePosts.set(id, (garagePosts.get(id) ?? 0) + 1)
    garageLikes.set(id, (garageLikes.get(id) ?? 0) + ((row as any).like_count || 0))
  }

  const channelPosts = new Map<string, number>()
  const channelReactions = new Map<string, number>()
  for (const row of channelRes.data ?? []) {
    const id = (row as any).author_id as string
    channelPosts.set(id, (channelPosts.get(id) ?? 0) + 1)
    channelReactions.set(id, (channelReactions.get(id) ?? 0) + ((row as any).reaction_count || 0))
  }

  const channelsJoined = new Map<string, number>()
  for (const row of membersRes.data ?? []) {
    const id = (row as any).user_id as string
    channelsJoined.set(id, (channelsJoined.get(id) ?? 0) + 1)
  }

  const childLogs = new Map<string, number>()
  for (const row of childLogsRes.data ?? []) {
    const id = (row as any).user_id as string
    childLogs.set(id, (childLogs.get(id) ?? 0) + 1)
  }

  const entries: LeaderboardEntry[] = profiles.map((p) => {
    const gp = garagePosts.get(p.id) ?? 0
    const totalGarageLikes = garageLikes.get(p.id) ?? 0
    const cp = channelPosts.get(p.id) ?? 0
    const totalReactions = channelReactions.get(p.id) ?? 0
    const cj = channelsJoined.get(p.id) ?? 0
    const cl = childLogs.get(p.id) ?? 0

    const points = gp * 5 + totalGarageLikes + cp * 3 + totalReactions + cj * 2 + cl

    return {
      user_id: p.id,
      name: p.name || 'Anonymous',
      photo_url: p.photo_url,
      garage_posts: gp,
      garage_likes: totalGarageLikes,
      channel_posts: cp,
      channel_reactions: totalReactions,
      channels_joined: cj,
      child_logs: cl,
      total_points: points,
    }
  })

  return entries
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, limit)
    .map((e, i) => ({ ...e, rank: i + 1 }))
}

/** Get current user's rank */
export async function fetchMyRank(): Promise<{ rank: number; totalPoints: number; totalUsers: number } | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const board = await fetchLeaderboard(100)
  const myEntry = board.find((e) => e.user_id === session.user.id)
  return {
    rank: myEntry?.rank ?? board.length + 1,
    totalPoints: myEntry?.total_points ?? 0,
    totalUsers: board.length,
  }
}

/** React Query hook */
export function useLeaderboard(limit = 20) {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: () => fetchLeaderboard(limit),
    staleTime: 5 * 60 * 1000, // 5 min
  })
}
