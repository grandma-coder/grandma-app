/**
 * Badge Sync — queries real data from Supabase and awards badges accordingly.
 * Called on app open and when viewing the rewards screen.
 */

import { supabase } from './supabase'
import { useBadgeStore } from '../store/useBadgeStore'

/** Format a Date to local YYYY-MM-DD (matches how calendar stores log dates). */
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function syncBadgesFromSupabase(): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const userId = session.user.id
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const sinceDate = localDateStr(ninetyDaysAgo)

  // Run all queries in parallel
  const [
    logsResult,
    foodResult,
    sleepResult,
    moodResult,
    diaperResult,
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

    // Diaper logs
    supabase
      .from('child_logs')
      .select('date')
      .eq('user_id', userId)
      .eq('type', 'diaper'),

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

  // Calculate streak — count back from today; also include today if logged
  const logDates = new Set(
    (logsResult.data ?? []).map((l: any) => l.date),
  )
  const today = localDateStr(new Date())
  let streak = 0
  const checkDate = new Date()
  // If today has a log, count it; otherwise start from yesterday
  if (!logDates.has(today)) checkDate.setDate(checkDate.getDate() - 1)
  for (let i = 0; i < 365; i++) {
    if (logDates.has(localDateStr(checkDate))) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else break
  }

  // Longest streak — scan all logged dates for the longest consecutive run
  let longestStreak = 0
  if (logDates.size > 0) {
    const sortedDates = [...logDates].sort()
    let runStart = new Date(sortedDates[0] + 'T12:00:00')
    let prev = new Date(sortedDates[0] + 'T12:00:00')
    let run = 1
    longestStreak = 1
    for (let i = 1; i < sortedDates.length; i++) {
      const cur = new Date(sortedDates[i] + 'T12:00:00')
      const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86400000)
      if (diffDays === 1) run++
      else { run = 1; runStart = cur }
      if (run > longestStreak) longestStreak = run
      prev = cur
    }
  }
  longestStreak = Math.max(longestStreak, streak)
  const totalLogDays = logDates.size

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

  // Unique sleep/mood/diaper days
  const sleepDays = new Set((sleepResult.data ?? []).map((l: any) => l.date)).size
  const moodDays = new Set((moodResult.data ?? []).map((l: any) => l.date)).size
  const diaperCount = (diaperResult.data ?? []).length
  const diaperDays = new Set((diaperResult.data ?? []).map((l: any) => l.date)).size

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
    diaperCount,
    diaperDays,
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

  // ── Fetch user's points from the same source as the leaderboard ─────────
  const { data: lbRow } = await supabase
    .from('leaderboard_scores')
    .select('total_points')
    .eq('user_id', userId)
    .maybeSingle()

  let totalPoints = lbRow?.total_points ?? 0
  if (!lbRow) {
    // Fallback formula matches lib/leaderboard.ts fetchLeaderboardFallback
    const gp = (garageResult.count ?? 0)
    const cp = (channelResult.count ?? 0)
    const cl = logsResult.count ?? 0
    totalPoints = gp * 5 + garageLikes + cp * 3 + totalReactions + cl
  }

  // Sync streak + leaderboard points back to store (single source of truth)
  useBadgeStore.getState().setSyncedStats({
    currentStreak: streak,
    longestStreak,
    totalPoints,
    totalCheckIns: totalLogDays,
  })

  return newBadges
}
