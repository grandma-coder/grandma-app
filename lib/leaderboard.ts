/**
 * Leaderboard API — fetches community rankings from the leaderboard_scores view.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

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
    .from('profiles')
    .select('id, name, photo_url')
    .not('name', 'is', null)
    .limit(50)

  if (!profiles || profiles.length === 0) return []

  const entries: LeaderboardEntry[] = []

  for (const p of profiles) {
    // Garage posts
    const { count: garagePosts } = await supabase
      .from('garage_posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', p.id)

    // Garage likes received
    const { data: garageLikes } = await supabase
      .from('garage_posts')
      .select('like_count')
      .eq('author_id', p.id)

    const totalGarageLikes = (garageLikes ?? []).reduce((sum: number, post: any) => sum + (post.like_count || 0), 0)

    // Channel posts
    const { count: channelPosts } = await supabase
      .from('channel_posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', p.id)

    // Channel reactions received
    const { data: channelReactions } = await supabase
      .from('channel_posts')
      .select('reaction_count')
      .eq('author_id', p.id)

    const totalReactions = (channelReactions ?? []).reduce((sum: number, post: any) => sum + (post.reaction_count || 0), 0)

    // Channels joined
    const { count: channelsJoined } = await supabase
      .from('channel_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', p.id)

    // Child logs (last 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const { count: childLogs } = await supabase
      .from('child_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', p.id)
      .gte('date', ninetyDaysAgo.toISOString().split('T')[0])

    const gp = garagePosts ?? 0
    const cp = channelPosts ?? 0
    const cj = channelsJoined ?? 0
    const cl = childLogs ?? 0

    const points = gp * 5 + totalGarageLikes + cp * 3 + totalReactions + cj * 2 + cl

    entries.push({
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
    })
  }

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
