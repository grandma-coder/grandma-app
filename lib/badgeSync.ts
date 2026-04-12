/**
 * Badge Sync — queries real data from Supabase and awards badges accordingly.
 * Called on app open and when viewing the rewards screen.
 */

import { supabase } from './supabase'
import { useBadgeStore } from '../store/useBadgeStore'

export async function syncBadgesFromSupabase(): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const userId = session.user.id
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const sinceDate = ninetyDaysAgo.toISOString().split('T')[0]

  // Run all queries in parallel
  const [
    logsResult,
    foodResult,
    sleepResult,
    moodResult,
    vaccineResult,
    growthResult,
    photosResult,
    garageResult,
    channelResult,
    reactionsResult,
    createdChannelsResult,
  ] = await Promise.all([
    // Total child logs
    supabase
      .from('child_logs')
      .select('id, date, type', { count: 'exact' })
      .eq('user_id', userId)
      .gte('date', sinceDate),

    // Food logs for variety
    supabase
      .from('child_logs')
      .select('value, notes')
      .eq('user_id', userId)
      .in('type', ['food', 'feeding']),

    // Sleep days
    supabase
      .from('child_logs')
      .select('date')
      .eq('user_id', userId)
      .eq('type', 'sleep'),

    // Mood days
    supabase
      .from('child_logs')
      .select('date')
      .eq('user_id', userId)
      .eq('type', 'mood'),

    // Vaccines done
    supabase
      .from('child_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'vaccine'),

    // Growth measurements
    supabase
      .from('child_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'growth'),

    // Photos (any log with photos)
    supabase
      .from('child_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('photos', 'eq', '{}'),

    // Garage posts
    supabase
      .from('garage_posts')
      .select('id, like_count', { count: 'exact' })
      .eq('author_id', userId),

    // Channel posts
    supabase
      .from('channel_posts')
      .select('id, reaction_count', { count: 'exact' })
      .eq('author_id', userId),

    // Total reactions received on channel posts
    supabase
      .from('channel_posts')
      .select('reaction_count')
      .eq('author_id', userId),

    // Channels created (where user is owner)
    supabase
      .from('channels')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId),
  ])

  // Calculate streak
  const logDates = new Set(
    (logsResult.data ?? []).map((l: any) => l.date),
  )
  let streak = 0
  const checkDate = new Date()
  checkDate.setDate(checkDate.getDate() - 1)
  for (let i = 0; i < 120; i++) {
    if (logDates.has(checkDate.toISOString().split('T')[0])) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else break
  }

  // Count unique foods
  const foodNames = new Set<string>()
  for (const log of foodResult.data ?? []) {
    try {
      const val = typeof log.value === 'string' ? JSON.parse(log.value) : log.value
      if (val?.newFoodName) foodNames.add(val.newFoodName.toLowerCase())
    } catch {}
    if (log.notes) {
      const name = log.notes.split(',')[0].trim().toLowerCase()
      if (name.length > 0 && name.length < 30) foodNames.add(name)
    }
  }

  // Unique sleep/mood days
  const sleepDays = new Set((sleepResult.data ?? []).map((l: any) => l.date)).size
  const moodDays = new Set((moodResult.data ?? []).map((l: any) => l.date)).size

  // Total reactions on channel posts
  const totalReactions = (reactionsResult.data ?? []).reduce(
    (sum: number, p: any) => sum + (p.reaction_count || 0), 0,
  )

  // Garage likes
  const garageLikes = (garageResult.data ?? []).reduce(
    (sum: number, p: any) => sum + (p.like_count || 0), 0,
  )

  // Sync to badge store
  const newBadges = useBadgeStore.getState().syncFromData({
    totalLogs: logsResult.count ?? 0,
    streak,
    foodCount: (foodResult.data ?? []).length,
    uniqueFoods: foodNames.size,
    sleepDays,
    moodDays,
    vaccinesDone: vaccineResult.count ?? 0,
    totalVaccines: 8, // standard set
    growthMeasurements: growthResult.count ?? 0,
    hasPhotos: (photosResult.count ?? 0) > 0,
    channelPosts: channelResult.count ?? 0,
    totalReactions: totalReactions + garageLikes,
    createdChannels: createdChannelsResult.count ?? 0,
    nutritionScore7Day: 0, // would need analytics data
    sleepScore7Day: 0,
  })

  // Update streak in badge store
  if (streak > 0) {
    const store = useBadgeStore.getState()
    if (streak > store.longestStreak) {
      // Can't call set directly, but syncFromData handles streak badges
    }
  }

  return newBadges
}
