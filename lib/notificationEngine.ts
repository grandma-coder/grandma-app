/**
 * Notification Engine — analyzes all data sources and generates
 * smart, actionable notifications across every pillar.
 *
 * Categories:
 *  - wellness:  score drops, trends, missing data
 *  - routine:   missed routines, upcoming reminders
 *  - health:    temperature alerts, vaccine due, medicine reminders
 *  - goals:     streak tracking, goal achievements, missed goals
 *  - insights:  AI patterns, tips, milestones
 *  - community: channel activity (handled by DB triggers)
 */

import { supabase } from './supabase'
import { getCycleInfo } from './cycleLogic'
import { getWeekData } from './pregnancyData'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SmartNotificationType =
  | 'wellness_drop'      // pillar score dropped significantly
  | 'wellness_improve'   // pillar score improved
  | 'missing_data'       // no logs for X days
  | 'routine_reminder'   // upcoming routine
  | 'routine_missed'     // scheduled routine not logged
  | 'health_alert'       // temperature spike, sick day
  | 'vaccine_due'        // vaccine schedule reminder
  | 'goal_achieved'      // daily goal met
  | 'goal_missed'        // daily goal missed
  | 'streak'             // logging streak milestone
  | 'streak_broken'      // streak interrupted
  | 'insight'            // AI pattern detected
  | 'milestone'          // developmental milestone
  | 'daily_summary'      // end-of-day recap
  | 'weekly_report'      // weekly wellness report
  // Community (already handled by DB triggers):
  | 'mention' | 'reply' | 'like' | 'channel'
  // Legacy:
  | 'care_circle_invite' | 'care_circle_accepted'
  | 'reminder' | 'system'

interface NotificationPayload {
  user_id: string
  type: string
  title: string
  body: string
  data: Record<string, any>
}

// ─── Dedup helper ─────────────────────────────────────────────────────────────

/** Check if a similar notification was already created today */
async function alreadyNotifiedToday(userId: string, type: string, dedupeKey: string): Promise<boolean> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', type)
    .gte('created_at', todayStart.toISOString())
    .contains('data', { dedupeKey })

  return (count ?? 0) > 0
}

/** Batch insert notifications (skips duplicates for today) */
async function insertNotifications(payloads: NotificationPayload[]): Promise<number> {
  if (payloads.length === 0) return 0
  const { error } = await supabase.from('notifications').insert(payloads)
  if (error) console.warn('[NotificationEngine] Insert error:', error.message)
  return payloads.length
}

// ─── 1. WELLNESS SCORE NOTIFICATIONS ──────────────────────────────────────────

interface PillarScoreInput {
  value: number
  label: string
  trend: number
  hasData: boolean
}

interface ScoresInput {
  overall: number
  nutrition: PillarScoreInput
  sleep: PillarScoreInput
  mood: PillarScoreInput
  health: PillarScoreInput
  growth: PillarScoreInput
}

const PILLAR_NAMES: Record<string, string> = {
  nutrition: 'Nutrition',
  sleep: 'Sleep',
  mood: 'Mood',
  health: 'Health',
  growth: 'Growth',
}

export async function generateWellnessNotifications(
  userId: string,
  scores: ScoresInput,
  childName: string,
  childId: string,
): Promise<number> {
  const notifications: NotificationPayload[] = []
  const pillars = ['nutrition', 'sleep', 'mood', 'health', 'growth'] as const

  for (const key of pillars) {
    const score = scores[key]
    if (!score.hasData) continue

    const name = PILLAR_NAMES[key]
    const dedupeKey = `wellness_${key}_${childId}`

    // Score dropped below 4 → alert
    if (score.value < 4) {
      const already = await alreadyNotifiedToday(userId, 'wellness_drop', dedupeKey)
      if (!already) {
        notifications.push({
          user_id: userId,
          type: 'wellness_drop',
          title: `${childName}'s ${name} needs attention`,
          body: `${name} score is ${score.value}/10. ${score.trend < -20 ? `Down ${Math.abs(score.trend)}% this week.` : 'Review the analytics for insights.'}`,
          data: { childId, pillar: key, score: score.value, dedupeKey },
        })
      }
    }

    // Score improved significantly (trend > 30%)
    if (score.trend > 30 && score.value >= 6) {
      const already = await alreadyNotifiedToday(userId, 'wellness_improve', dedupeKey)
      if (!already) {
        notifications.push({
          user_id: userId,
          type: 'wellness_improve',
          title: `${childName}'s ${name} is improving!`,
          body: `${name} score rose to ${score.value}/10 — up ${score.trend}% this week. Keep it up!`,
          data: { childId, pillar: key, score: score.value, dedupeKey },
        })
      }
    }
  }

  return insertNotifications(notifications)
}

// ─── 2. MISSING DATA NOTIFICATIONS ───────────────────────────────────────────

export async function generateMissingDataNotifications(
  userId: string,
  childId: string,
  childName: string,
): Promise<number> {
  const dedupeKey = `missing_${childId}`
  const already = await alreadyNotifiedToday(userId, 'missing_data', dedupeKey)
  if (already) return 0

  // Check last log for this child
  const { data: lastLog } = await supabase
    .from('child_logs')
    .select('created_at')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!lastLog) return 0

  const hoursSinceLastLog = (Date.now() - new Date(lastLog.created_at).getTime()) / (1000 * 60 * 60)

  if (hoursSinceLastLog > 24) {
    const days = Math.floor(hoursSinceLastLog / 24)
    return insertNotifications([{
      user_id: userId,
      type: 'missing_data',
      title: `No logs for ${childName} in ${days} day${days > 1 ? 's' : ''}`,
      body: 'Regular logging helps Grandma track patterns and give better insights. Log a quick update!',
      data: { childId, daysMissing: days, dedupeKey },
    }])
  }

  return 0
}

// ─── 3. ROUTINE NOTIFICATIONS ────────────────────────────────────────────────

export async function generateRoutineNotifications(
  userId: string,
): Promise<number> {
  const dedupeKey = `routines_${new Date().toISOString().split('T')[0]}`
  const already = await alreadyNotifiedToday(userId, 'routine_missed', dedupeKey)
  if (already) return 0

  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun..6=Sat
  const nowHHMM = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`
  const todayDate = today.toISOString().split('T')[0]

  // Get today's routines that should have happened by now
  const { data: routines } = await supabase
    .from('child_routines')
    .select('id, child_id, type, name, time')
    .eq('user_id', userId)
    .eq('active', true)
    .contains('days_of_week', [dayOfWeek])
    .lt('time', nowHHMM)

  if (!routines || routines.length === 0) return 0

  // Get today's logs for this user's children
  const childIds = [...new Set(routines.map((r) => r.child_id))]
  const { data: todayLogs } = await supabase
    .from('child_logs')
    .select('child_id, type, created_at')
    .in('child_id', childIds)
    .eq('date', todayDate)

  const loggedTypes = new Set(
    (todayLogs ?? []).map((l) => `${l.child_id}_${l.type}`),
  )

  // Find missed routines
  const missed = routines.filter(
    (r) => !loggedTypes.has(`${r.child_id}_${r.type}`),
  )

  if (missed.length === 0) return 0

  // Get child names
  const { data: children } = await supabase
    .from('children')
    .select('id, name')
    .in('id', childIds)

  const childMap = new Map((children ?? []).map((c) => [c.id, c.name]))

  const notifications: NotificationPayload[] = []

  // Group by child
  const byChild = new Map<string, typeof missed>()
  for (const m of missed) {
    const arr = byChild.get(m.child_id) || []
    arr.push(m)
    byChild.set(m.child_id, arr)
  }

  for (const [childId, childMissed] of byChild) {
    const name = childMap.get(childId) || 'Your child'
    if (childMissed.length === 1) {
      const r = childMissed[0]
      notifications.push({
        user_id: userId,
        type: 'routine_missed',
        title: `${name}: ${r.name} not logged yet`,
        body: `Scheduled at ${r.time} — tap to log it now.`,
        data: { childId, routineId: r.id, routineType: r.type, dedupeKey },
      })
    } else {
      notifications.push({
        user_id: userId,
        type: 'routine_missed',
        title: `${name}: ${childMissed.length} routines not logged`,
        body: `${childMissed.map((r) => r.name).join(', ')} — open the calendar to catch up.`,
        data: { childId, count: childMissed.length, dedupeKey },
      })
    }
  }

  return insertNotifications(notifications)
}

// ─── 4. HEALTH ALERT NOTIFICATIONS ──────────────────────────────────────────

export async function generateHealthAlertNotifications(
  userId: string,
): Promise<number> {
  const notifications: NotificationPayload[] = []
  const todayDate = new Date().toISOString().split('T')[0]
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  // Check for recent temperature readings
  const { data: tempLogs } = await supabase
    .from('child_logs')
    .select('child_id, value, date')
    .eq('type', 'temperature')
    .gte('date', threeDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .limit(20)

  if (tempLogs) {
    for (const log of tempLogs) {
      try {
        const val = typeof log.value === 'string' ? JSON.parse(log.value) : log.value
        const temp = parseFloat(val?.temperature || val)
        if (temp >= 38.0) {
          const dedupeKey = `temp_alert_${log.child_id}_${log.date}`
          const already = await alreadyNotifiedToday(userId, 'health_alert', dedupeKey)
          if (!already) {
            const { data: child } = await supabase
              .from('children')
              .select('name')
              .eq('id', log.child_id)
              .single()

            notifications.push({
              user_id: userId,
              type: 'health_alert',
              title: `${child?.name || 'Child'}: High temperature recorded`,
              body: `${temp}°C on ${new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}. Monitor closely and consult a doctor if it persists.`,
              data: { childId: log.child_id, temperature: temp, dedupeKey },
            })
          }
        }
      } catch {}
    }
  }

  return insertNotifications(notifications)
}

// ─── 5. GOAL TRACKING NOTIFICATIONS ─────────────────────────────────────────

export async function generateGoalNotifications(
  userId: string,
): Promise<number> {
  const dedupeKey = `goals_${new Date().toISOString().split('T')[0]}`
  const already = await alreadyNotifiedToday(userId, 'goal_achieved', dedupeKey)
  if (already) return 0

  const notifications: NotificationPayload[] = []

  // Get user's children
  const { data: children } = await supabase
    .from('children')
    .select('id, name')
    .eq('parent_id', userId)

  if (!children || children.length === 0) return 0

  // Get goals
  const { data: goals } = await supabase
    .from('child_goals')
    .select('child_id, metric, daily_target')
    .in('child_id', children.map((c) => c.id))

  if (!goals || goals.length === 0) return 0

  const todayDate = new Date().toISOString().split('T')[0]
  const childMap = new Map(children.map((c) => [c.id, c.name]))

  for (const child of children) {
    const childGoals = goals.filter((g) => g.child_id === child.id)
    if (childGoals.length === 0) continue

    // Get today's logs
    const { data: todayLogs } = await supabase
      .from('child_logs')
      .select('type, value')
      .eq('child_id', child.id)
      .eq('date', todayDate)

    if (!todayLogs) continue

    // Check sleep goal
    const sleepGoal = childGoals.find((g) => g.metric === 'sleep')
    if (sleepGoal) {
      const sleepLogs = todayLogs.filter((l) => l.type === 'sleep')
      let totalHours = 0
      for (const log of sleepLogs) {
        try {
          const val = typeof log.value === 'string' ? JSON.parse(log.value) : log.value
          totalHours += parseFloat(val?.duration || 0)
        } catch {}
      }
      if (totalHours >= sleepGoal.daily_target) {
        notifications.push({
          user_id: userId,
          type: 'goal_achieved',
          title: `${child.name} hit the sleep goal!`,
          body: `${totalHours.toFixed(1)}h of sleep today (goal: ${sleepGoal.daily_target}h). Great rest!`,
          data: { childId: child.id, metric: 'sleep', dedupeKey },
        })
      }
    }

    // Check activity goal
    const activityGoal = childGoals.find((g) => g.metric === 'activity')
    if (activityGoal) {
      const activityCount = todayLogs.filter((l) =>
        ['food', 'sleep', 'mood', 'growth', 'medicine', 'vaccine'].includes(l.type),
      ).length
      if (activityCount >= activityGoal.daily_target) {
        notifications.push({
          user_id: userId,
          type: 'goal_achieved',
          title: `${child.name}'s daily activity goal met!`,
          body: `${activityCount} activities logged today. Consistent tracking builds better insights.`,
          data: { childId: child.id, metric: 'activity', dedupeKey },
        })
      }
    }
  }

  return insertNotifications(notifications)
}

// ─── 6. STREAK NOTIFICATIONS ────────────────────────────────────────────────

export async function generateStreakNotifications(
  userId: string,
): Promise<number> {
  const dedupeKey = `streak_${new Date().toISOString().split('T')[0]}`
  const already = await alreadyNotifiedToday(userId, 'streak', dedupeKey)
  if (already) return 0

  // Count consecutive days with logs (from yesterday backwards)
  const { data: children } = await supabase
    .from('children')
    .select('id, name')
    .eq('parent_id', userId)

  if (!children || children.length === 0) return 0

  const notifications: NotificationPayload[] = []

  for (const child of children) {
    let streak = 0
    const checkDate = new Date()
    checkDate.setDate(checkDate.getDate() - 1) // start from yesterday

    for (let i = 0; i < 60; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const { count } = await supabase
        .from('child_logs')
        .select('id', { count: 'exact', head: true })
        .eq('child_id', child.id)
        .eq('date', dateStr)

      if ((count ?? 0) > 0) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    // Notify at milestones: 3, 7, 14, 21, 30, 60
    const milestones = [3, 7, 14, 21, 30, 60]
    if (milestones.includes(streak)) {
      notifications.push({
        user_id: userId,
        type: 'streak',
        title: `${streak}-day streak for ${child.name}!`,
        body: `You've logged ${child.name}'s activities for ${streak} days in a row. Amazing consistency!`,
        data: { childId: child.id, streak, dedupeKey },
      })
    }

    // Streak broken (had 3+ then missed yesterday)
    if (streak === 0) {
      // Check if day before yesterday had a streak
      checkDate.setDate(new Date().getDate() - 2)
      const dateStr = checkDate.toISOString().split('T')[0]
      const { count } = await supabase
        .from('child_logs')
        .select('id', { count: 'exact', head: true })
        .eq('child_id', child.id)
        .eq('date', dateStr)

      if ((count ?? 0) > 0) {
        const alreadyBroken = await alreadyNotifiedToday(userId, 'streak_broken', `streak_broken_${child.id}`)
        if (!alreadyBroken) {
          notifications.push({
            user_id: userId,
            type: 'streak_broken',
            title: `${child.name}'s logging streak paused`,
            body: 'No logs yesterday. Log something today to start a new streak!',
            data: { childId: child.id, dedupeKey: `streak_broken_${child.id}` },
          })
        }
      }
    }
  }

  return insertNotifications(notifications)
}

// ─── 7. DAILY SUMMARY ───────────────────────────────────────────────────────

export async function generateDailySummary(
  userId: string,
): Promise<number> {
  const dedupeKey = `daily_summary_${new Date().toISOString().split('T')[0]}`
  const already = await alreadyNotifiedToday(userId, 'daily_summary', dedupeKey)
  if (already) return 0

  const todayDate = new Date().toISOString().split('T')[0]

  const { data: children } = await supabase
    .from('children')
    .select('id, name')
    .eq('parent_id', userId)

  if (!children || children.length === 0) return 0

  const childIds = children.map((c) => c.id)

  const { count: todayCount } = await supabase
    .from('child_logs')
    .select('id', { count: 'exact', head: true })
    .in('child_id', childIds)
    .eq('date', todayDate)

  const total = todayCount ?? 0
  if (total === 0) return 0

  // Get type breakdown
  const { data: logs } = await supabase
    .from('child_logs')
    .select('type')
    .in('child_id', childIds)
    .eq('date', todayDate)

  const typeCounts: Record<string, number> = {}
  for (const log of logs ?? []) {
    typeCounts[log.type] = (typeCounts[log.type] || 0) + 1
  }

  const parts = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ')

  return insertNotifications([{
    user_id: userId,
    type: 'daily_summary',
    title: `Today's recap: ${total} activities logged`,
    body: `${parts}. ${total >= 5 ? 'Great tracking day!' : 'Keep going — every log helps Grandma learn.'}`,
    data: { date: todayDate, totalLogs: total, dedupeKey },
  }])
}

// ─── 8. CAREGIVER ACTIVITY NOTIFICATIONS ─────────────────────────────────────

export async function generateCaregiverNotifications(
  userId: string,
): Promise<number> {
  const dedupeKey = `caregiver_${new Date().toISOString().split('T')[0]}`
  const already = await alreadyNotifiedToday(userId, 'care_circle_accepted', dedupeKey)
  if (already) return 0

  const notifications: NotificationPayload[] = []
  const todayDate = new Date().toISOString().split('T')[0]

  // Get user's children
  const { data: children } = await supabase
    .from('children')
    .select('id, name')
    .eq('parent_id', userId)

  if (!children || children.length === 0) return 0

  // Check for logs made by caregivers today (logged_by != userId)
  const { data: caregiverLogs } = await supabase
    .from('child_logs')
    .select('child_id, type, logged_by, created_at')
    .in('child_id', children.map((c) => c.id))
    .eq('date', todayDate)
    .neq('logged_by', userId)

  if (!caregiverLogs || caregiverLogs.length === 0) return 0

  // Get caregiver names
  const caregiverIds = [...new Set(caregiverLogs.map((l) => l.logged_by).filter(Boolean))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', caregiverIds)

  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.name || 'A caregiver']))
  const childMap = new Map(children.map((c) => [c.id, c.name]))

  // Group by caregiver
  const byCaregiver = new Map<string, typeof caregiverLogs>()
  for (const log of caregiverLogs) {
    if (!log.logged_by) continue
    const arr = byCaregiver.get(log.logged_by) || []
    arr.push(log)
    byCaregiver.set(log.logged_by, arr)
  }

  for (const [caregiverId, logs] of byCaregiver) {
    const name = nameMap.get(caregiverId) || 'A caregiver'
    const childNames = [...new Set(logs.map((l) => childMap.get(l.child_id) || 'your child'))]
    const types = [...new Set(logs.map((l) => l.type))]

    notifications.push({
      user_id: userId,
      type: 'care_circle_accepted',
      title: `${name} logged ${logs.length} activit${logs.length === 1 ? 'y' : 'ies'}`,
      body: `${types.join(', ')} for ${childNames.join(' & ')}. Check the calendar for details.`,
      data: { caregiverId, count: logs.length, dedupeKey },
    })
  }

  return insertNotifications(notifications)
}

// ─── 9. NEW INSIGHTS NOTIFICATIONS ──────────────────────────────────────────

export async function generateInsightNotifications(
  userId: string,
): Promise<number> {
  const dedupeKey = `insights_${new Date().toISOString().split('T')[0]}`
  const already = await alreadyNotifiedToday(userId, 'insight', dedupeKey)
  if (already) return 0

  // Check for new insights from last 24 hours
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString()

  const { data: newInsights } = await supabase
    .from('insights')
    .select('id, type, title, body')
    .eq('user_id', userId)
    .eq('archived', false)
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false })
    .limit(3)

  if (!newInsights || newInsights.length === 0) return 0

  const notifications: NotificationPayload[] = []

  if (newInsights.length === 1) {
    const insight = newInsights[0]
    notifications.push({
      user_id: userId,
      type: 'insight',
      title: `New insight: ${insight.title}`,
      body: insight.body?.slice(0, 120) || 'Grandma noticed a new pattern. Tap to learn more.',
      data: { insightId: insight.id, dedupeKey },
    })
  } else {
    notifications.push({
      user_id: userId,
      type: 'insight',
      title: `${newInsights.length} new insights from Grandma`,
      body: `${newInsights.map((i) => i.title).join(', ')}. Check your insights for details.`,
      data: { count: newInsights.length, dedupeKey },
    })
  }

  return insertNotifications(notifications)
}

// ─── 10. APPOINTMENT REMINDERS ──────────────────────────────────────────────

export async function generateAppointmentReminders(
  userId: string,
): Promise<number> {
  const notifications: NotificationPayload[] = []

  // Get appointments in the next 2 days
  const now = new Date()
  const twoDaysLater = new Date(now.getTime() + 2 * 86400000)

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, appointment_date, appointment_type, doctor_name, location, notes')
    .eq('user_id', userId)
    .gte('appointment_date', now.toISOString())
    .lte('appointment_date', twoDaysLater.toISOString())
    .order('appointment_date', { ascending: true })

  if (!appointments || appointments.length === 0) return 0

  for (const appt of appointments) {
    const dedupeKey = `appointment_${appt.id}`
    const already = await alreadyNotifiedToday(userId, 'reminder', dedupeKey)
    if (already) continue

    const apptDate = new Date(appt.appointment_date)
    const hoursUntil = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    const timeLabel = hoursUntil < 24
      ? `today at ${apptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
      : `tomorrow at ${apptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`

    const type = appt.appointment_type || 'Appointment'
    const doctor = appt.doctor_name ? ` with ${appt.doctor_name}` : ''

    notifications.push({
      user_id: userId,
      type: 'reminder',
      title: `${type}${doctor} ${timeLabel}`,
      body: appt.location ? `Location: ${appt.location}` : (appt.notes || 'Don\'t forget to prepare any questions!'),
      data: { appointmentId: appt.id, dedupeKey },
    })
  }

  return insertNotifications(notifications)
}

// ─── 11. UNREAD CHANNEL ACTIVITY ────────────────────────────────────────────

export async function generateChannelActivityNotifications(
  userId: string,
): Promise<number> {
  const dedupeKey = `channels_${new Date().toISOString().split('T')[0]}`
  const already = await alreadyNotifiedToday(userId, 'channel', dedupeKey)
  if (already) return 0

  // Get channels user is a member of
  const { data: memberships } = await supabase
    .from('channel_members')
    .select('channel_id, channels(name)')
    .eq('user_id', userId)

  if (!memberships || memberships.length === 0) return 0

  const notifications: NotificationPayload[] = []
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString()

  // Count new posts in user's channels from last 24h (not by them)
  for (const mem of memberships) {
    const { count } = await supabase
      .from('channel_posts')
      .select('id', { count: 'exact', head: true })
      .eq('channel_id', mem.channel_id)
      .neq('author_id', userId)
      .gte('created_at', oneDayAgo)

    const postCount = count ?? 0
    if (postCount >= 5) {
      const channelName = (mem as any).channels?.name || 'a channel'
      notifications.push({
        user_id: userId,
        type: 'channel',
        title: `${postCount} new messages in #${channelName}`,
        body: 'Catch up on the conversation!',
        data: { channelId: mem.channel_id, dedupeKey },
      })
    }
  }

  // Limit to 3 most active channels
  return insertNotifications(notifications.slice(0, 3))
}

// ─── 12. PREGNANCY NOTIFICATIONS ────────────────────────────────────────────

const WEEK_MILESTONES = new Set([4, 8, 12, 16, 20, 24, 28, 32, 36, 38, 40])

export async function generatePregnancyNotifications(userId: string): Promise<number> {
  // Only run if user has pregnancy data
  const { count: pregCount } = await supabase
    .from('pregnancy_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (!pregCount || pregCount === 0) return 0

  const notifications: NotificationPayload[] = []
  const todayDate = new Date().toISOString().split('T')[0]

  // ── Try to read dueDate from onboarding note ──────────────────────────────
  let dueDate: string | null = null
  let weekNumber: number | null = null

  const { data: noteRows } = await supabase
    .from('pregnancy_logs')
    .select('notes')
    .eq('user_id', userId)
    .eq('log_type', 'note')
    .eq('value', 'onboarding')
    .order('log_date', { ascending: false })
    .limit(1)

  if (noteRows && noteRows[0]?.notes) {
    try {
      const meta = JSON.parse(noteRows[0].notes)
      if (meta.dueDate) {
        dueDate = meta.dueDate
        const due = new Date(meta.dueDate)
        const daysToDue = Math.ceil((due.getTime() - Date.now()) / 86400000)
        weekNumber = Math.max(1, Math.min(40, 40 - Math.floor(daysToDue / 7)))
      }
    } catch {}
  }

  // ── Week milestone notification ───────────────────────────────────────────
  if (weekNumber && WEEK_MILESTONES.has(weekNumber)) {
    const dedupeKey = `pregnancy_week_${weekNumber}`
    const already = await alreadyNotifiedToday(userId, 'milestone', dedupeKey)
    if (!already) {
      const wk = getWeekData(weekNumber)
      notifications.push({
        user_id: userId,
        type: 'milestone',
        title: `Week ${weekNumber}: ${wk.babySize}`,
        body: wk.developmentFact,
        data: { behavior: 'pregnancy', week: weekNumber, dedupeKey },
      })
    }
  }

  // ── Due date approaching ──────────────────────────────────────────────────
  if (dueDate) {
    const daysToDue = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000)
    if (daysToDue >= 0 && daysToDue <= 14) {
      const dedupeKey = `pregnancy_due_${daysToDue}`
      const already = await alreadyNotifiedToday(userId, 'reminder', dedupeKey)
      if (!already) {
        notifications.push({
          user_id: userId,
          type: 'reminder',
          title: daysToDue === 0 ? 'Today is your due date!' : `${daysToDue} day${daysToDue === 1 ? '' : 's'} until due date`,
          body: daysToDue <= 3
            ? 'Hospital bag packed? Stay close to home and trust your body.'
            : 'Final stretch — rest, hydrate, and prepare for baby.',
          data: { behavior: 'pregnancy', daysToDue, dedupeKey },
        })
      }
    }
  }

  // ── Missing data: no logs in 3+ days ──────────────────────────────────────
  const { data: lastLog } = await supabase
    .from('pregnancy_logs')
    .select('log_date')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastLog) {
    const daysSince = Math.floor((Date.now() - new Date(lastLog.log_date).getTime()) / 86400000)
    if (daysSince >= 3) {
      const dedupeKey = `pregnancy_missing_${daysSince}`
      const already = await alreadyNotifiedToday(userId, 'missing_data', dedupeKey)
      if (!already) {
        notifications.push({
          user_id: userId,
          type: 'missing_data',
          title: `No pregnancy logs in ${daysSince} days`,
          body: 'Log a symptom, mood, or weight to keep your week-by-week journey on track.',
          data: { behavior: 'pregnancy', daysMissing: daysSince, dedupeKey },
        })
      }
    }
  }

  // ── Strong/severe symptoms in last 24h ────────────────────────────────────
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const { data: severeSymptoms } = await supabase
    .from('pregnancy_logs')
    .select('log_date, value, severity')
    .eq('user_id', userId)
    .eq('log_type', 'symptom')
    .eq('severity', 'strong')
    .gte('log_date', oneDayAgo)
    .limit(5)

  if (severeSymptoms && severeSymptoms.length > 0) {
    const dedupeKey = `pregnancy_severe_${todayDate}`
    const already = await alreadyNotifiedToday(userId, 'health_alert', dedupeKey)
    if (!already) {
      const list = severeSymptoms.map((s) => s.value).filter(Boolean).slice(0, 3).join(', ')
      notifications.push({
        user_id: userId,
        type: 'health_alert',
        title: 'Strong symptoms logged recently',
        body: `${list || 'Severe symptoms'} — if it persists or worsens, contact your provider.`,
        data: { behavior: 'pregnancy', count: severeSymptoms.length, dedupeKey },
      })
    }
  }

  // ── Low kick count (week 28+) ─────────────────────────────────────────────
  if (weekNumber && weekNumber >= 28) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const { data: kickLogs } = await supabase
      .from('pregnancy_logs')
      .select('log_date, value')
      .eq('user_id', userId)
      .eq('log_type', 'kick_count')
      .gte('log_date', sevenDaysAgo)
      .order('log_date', { ascending: false })

    if (kickLogs && kickLogs.length >= 4) {
      const todayKicks = kickLogs
        .filter((k) => k.log_date === todayDate)
        .reduce((sum, k) => sum + (parseInt(k.value || '0', 10) || 0), 0)
      const olderKicks = kickLogs.filter((k) => k.log_date !== todayDate)
      const avgOlder = olderKicks.length > 0
        ? olderKicks.reduce((sum, k) => sum + (parseInt(k.value || '0', 10) || 0), 0) / olderKicks.length
        : 0

      if (todayKicks > 0 && avgOlder > 0 && todayKicks < avgOlder * 0.5) {
        const dedupeKey = `pregnancy_low_kicks_${todayDate}`
        const already = await alreadyNotifiedToday(userId, 'health_alert', dedupeKey)
        if (!already) {
          notifications.push({
            user_id: userId,
            type: 'health_alert',
            title: 'Kick count is lower than usual',
            body: `Today: ${todayKicks} kicks vs ${avgOlder.toFixed(0)} avg. Try lying on your left side and counting again. Call your provider if reduced movement persists.`,
            data: { behavior: 'pregnancy', todayKicks, avgOlder, dedupeKey },
          })
        }
      }
    }
  }

  return insertNotifications(notifications)
}

// ─── 13. CYCLE / PRE-PREGNANCY NOTIFICATIONS ────────────────────────────────

export async function generateCycleNotifications(userId: string): Promise<number> {
  // Find latest period_start
  const { data: periodRows } = await supabase
    .from('cycle_logs')
    .select('date, value, notes')
    .eq('user_id', userId)
    .eq('type', 'period_start')
    .order('date', { ascending: false })
    .limit(1)

  if (!periodRows || periodRows.length === 0) return 0

  const lastPeriodStart = periodRows[0].date
  const periodDuration = parseInt(periodRows[0].value || '5', 10) || 5

  // Parse cycle config from notes JSON (onboarding stored it on the period_start row)
  let cycleLength = 28
  let tryingToConceive = false
  try {
    if (periodRows[0].notes) {
      const meta = JSON.parse(periodRows[0].notes)
      if (typeof meta.cycleLength === 'number') cycleLength = meta.cycleLength
      tryingToConceive = !!meta.tryingToConceive
    }
  } catch {}

  const info = getCycleInfo({
    lastPeriodStart,
    cycleLength,
    periodLength: periodDuration,
  })

  const notifications: NotificationPayload[] = []
  const todayDate = new Date().toISOString().split('T')[0]

  // ── Fertile window starting today ─────────────────────────────────────────
  if (info.cycleDay === info.fertileStart && tryingToConceive) {
    const dedupeKey = `cycle_fertile_${todayDate}`
    const already = await alreadyNotifiedToday(userId, 'insight', dedupeKey)
    if (!already) {
      notifications.push({
        user_id: userId,
        type: 'insight',
        title: 'Your fertile window is starting',
        body: `Days ${info.fertileStart}–${info.fertileEnd}. Ovulation predicted around day ${info.ovulationDay}.`,
        data: { behavior: 'pre-pregnancy', cycleDay: info.cycleDay, dedupeKey },
      })
    }
  }

  // ── Ovulation day ─────────────────────────────────────────────────────────
  if (info.cycleDay === info.ovulationDay) {
    const dedupeKey = `cycle_ovulation_${todayDate}`
    const already = await alreadyNotifiedToday(userId, 'milestone', dedupeKey)
    if (!already) {
      notifications.push({
        user_id: userId,
        type: 'milestone',
        title: tryingToConceive ? 'Ovulation today — peak fertility' : 'Ovulation day',
        body: tryingToConceive
          ? 'Your most fertile 24 hours. Conception probability is at its peak.'
          : `You're on day ${info.cycleDay} of your cycle.`,
        data: { behavior: 'pre-pregnancy', cycleDay: info.cycleDay, dedupeKey },
      })
    }
  }

  // ── Period in 1–2 days ────────────────────────────────────────────────────
  if (info.daysUntilPeriod === 1 || info.daysUntilPeriod === 2) {
    const dedupeKey = `cycle_period_soon_${info.daysUntilPeriod}_${todayDate}`
    const already = await alreadyNotifiedToday(userId, 'reminder', dedupeKey)
    if (!already) {
      notifications.push({
        user_id: userId,
        type: 'reminder',
        title: `Period expected in ${info.daysUntilPeriod} day${info.daysUntilPeriod === 1 ? '' : 's'}`,
        body: 'PMS symptoms are common now. Stock up on what you need and rest if you can.',
        data: { behavior: 'pre-pregnancy', daysUntilPeriod: info.daysUntilPeriod, dedupeKey },
      })
    }
  }

  // ── Late period (3+ days past expected) ───────────────────────────────────
  if (info.daysUntilPeriod < -2 && info.daysUntilPeriod >= -10) {
    const lateDays = Math.abs(info.daysUntilPeriod)
    const dedupeKey = `cycle_late_${lateDays}`
    const already = await alreadyNotifiedToday(userId, 'insight', dedupeKey)
    if (!already) {
      notifications.push({
        user_id: userId,
        type: 'insight',
        title: `Period is ${lateDays} days late`,
        body: tryingToConceive
          ? 'A late period can be an early pregnancy sign. Consider taking a test.'
          : 'Stress, sleep, and hormone shifts can delay your cycle. Keep tracking.',
        data: { behavior: 'pre-pregnancy', lateDays, dedupeKey },
      })
    }
  }

  // ── Missing data: no cycle logs in 5+ days ────────────────────────────────
  const { data: lastLog } = await supabase
    .from('cycle_logs')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastLog) {
    const daysSince = Math.floor((Date.now() - new Date(lastLog.date).getTime()) / 86400000)
    if (daysSince >= 5) {
      const dedupeKey = `cycle_missing_${daysSince}`
      const already = await alreadyNotifiedToday(userId, 'missing_data', dedupeKey)
      if (!already) {
        notifications.push({
          user_id: userId,
          type: 'missing_data',
          title: `No cycle logs in ${daysSince} days`,
          body: 'Log a symptom, BBT, or mood to keep your predictions accurate.',
          data: { behavior: 'pre-pregnancy', daysMissing: daysSince, dedupeKey },
        })
      }
    }
  }

  return insertNotifications(notifications)
}

// ─── MASTER: Run All Generators ──────────────────────────────────────────────

export async function runNotificationEngine(): Promise<number> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return 0

    const userId = session.user.id

    // Run all generators in parallel (they dedup independently)
    const results = await Promise.allSettled([
      generateRoutineNotifications(userId),
      generateHealthAlertNotifications(userId),
      generateGoalNotifications(userId),
      generateStreakNotifications(userId),
      generateCaregiverNotifications(userId),
      generateInsightNotifications(userId),
      generateAppointmentReminders(userId),
      generateChannelActivityNotifications(userId),
      generatePregnancyNotifications(userId),
      generateCycleNotifications(userId),
    ])

    const total = results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value : 0), 0)
    return total
  } catch (err) {
    console.warn('[NotificationEngine] Error:', err)
    return 0
  }
}

/**
 * Run wellness-specific notifications (called after analytics load).
 * Separated because it needs the pre-computed scores.
 */
export async function runWellnessNotifications(
  scores: ScoresInput,
  childId: string,
  childName: string,
): Promise<number> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return 0

    const results = await Promise.allSettled([
      generateWellnessNotifications(session.user.id, scores, childName, childId),
      generateMissingDataNotifications(session.user.id, childId, childName),
    ])

    return results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value : 0), 0)
  } catch {
    return 0
  }
}
