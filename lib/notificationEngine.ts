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
import { useFeatureFlags } from '../store/useFeatureFlags'
import { getCycleInfo, toDateStr } from './cycleLogic'
import { parseLocalDate } from './localDate'
import {
  activityGoalCopy, appointmentCopy, caregiverActivityCopy, channelActivityCopy, cycleQuietCopy,
  dailySummaryCopy, dueDateCopy, fertileWindowCopy, insightCopy, insightsCopy, kickCountCopy,
  kidsQuietCopy, latePeriodCopy, ovulationCopy, periodSoonCopy, pregnancyQuietCopy, pregnancyWeekCopy,
  routineMissedCopy, routinesMissedCopy, sleepGoalCopy, streakCopy, streakPausedCopy, strongSymptomsCopy,
  temperatureCopy, wellnessDropCopy, wellnessImproveCopy,
} from './notificationCopy'

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

    const dedupeKey = `wellness_${key}_${childId}`

    // Score dropped below 4 → alert
    if (score.value < 4) {
      const already = await alreadyNotifiedToday(userId, 'wellness_drop', dedupeKey)
      if (!already) {
        notifications.push({
          user_id: userId,
          type: 'wellness_drop',
          // Neutral wording: no `/10`, no "needs attention" — the score only
          // decides WHEN to nudge (see docs/compliance/2026-11-02-regras-saude.md).
          ...wellnessDropCopy(childName, key),
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
          ...wellnessImproveCopy(childName, key),
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
      ...kidsQuietCopy(childName, days),
      data: { childId, daysMissing: days, dedupeKey },
    }])
  }

  return 0
}

// ─── 3. ROUTINE NOTIFICATIONS ────────────────────────────────────────────────

export async function generateRoutineNotifications(
  userId: string,
): Promise<number> {
  const dedupeKey = `routines_${toDateStr(new Date())}`
  const already = await alreadyNotifiedToday(userId, 'routine_missed', dedupeKey)
  if (already) return 0

  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun..6=Sat
  const nowHHMM = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`
  const todayDate = toDateStr(today)

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
    const name = childMap.get(childId) || null
    if (childMissed.length === 1) {
      const r = childMissed[0]
      notifications.push({
        user_id: userId,
        type: 'routine_missed',
        ...routineMissedCopy(name, r.name, r.time),
        data: { childId, routineId: r.id, routineType: r.type, dedupeKey },
      })
    } else {
      notifications.push({
        user_id: userId,
        type: 'routine_missed',
        ...routinesMissedCopy(name, childMissed.map((r) => r.name)),
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
  const todayDate = toDateStr(new Date())
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  // Check for recent temperature readings
  const { data: tempLogs } = await supabase
    .from('child_logs')
    .select('child_id, value, date')
    .eq('type', 'temperature')
    .gte('date', toDateStr(threeDaysAgo))
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
              // Factual: what was logged + "pediatrician if worried". No verdict.
              ...temperatureCopy(child?.name ?? null, temp, parseLocalDate(log.date)),
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
  const dedupeKey = `goals_${toDateStr(new Date())}`
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

  const todayDate = toDateStr(new Date())
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
          ...sleepGoalCopy(child.name, totalHours, sleepGoal.daily_target),
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
          ...activityGoalCopy(child.name, activityCount),
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
  const dedupeKey = `streak_${toDateStr(new Date())}`
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
      const dateStr = toDateStr(checkDate)
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
        ...streakCopy(child.name, streak),
        data: { childId: child.id, streak, dedupeKey },
      })
    }

    // Streak broken (had 3+ then missed yesterday)
    if (streak === 0) {
      // Check if day before yesterday had a streak
      // checkDate is still yesterday here (loop broke on i=0) → day before yesterday.
      checkDate.setDate(checkDate.getDate() - 1)
      const dateStr = toDateStr(checkDate)
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
            ...streakPausedCopy(child.name),
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
  const dedupeKey = `daily_summary_${toDateStr(new Date())}`
  const already = await alreadyNotifiedToday(userId, 'daily_summary', dedupeKey)
  if (already) return 0

  const todayDate = toDateStr(new Date())

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

  const top = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return insertNotifications([{
    user_id: userId,
    type: 'daily_summary',
    ...dailySummaryCopy(total, top),
    data: { date: todayDate, totalLogs: total, dedupeKey },
  }])
}

// ─── 8. CAREGIVER ACTIVITY NOTIFICATIONS ─────────────────────────────────────

export async function generateCaregiverNotifications(
  userId: string,
): Promise<number> {
  const dedupeKey = `caregiver_${toDateStr(new Date())}`
  const already = await alreadyNotifiedToday(userId, 'care_circle_accepted', dedupeKey)
  if (already) return 0

  const notifications: NotificationPayload[] = []
  const todayDate = toDateStr(new Date())

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
    .from('profiles_public')
    .select('id, name')
    .in('id', caregiverIds)

  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.name || null]))
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
    const name = nameMap.get(caregiverId) || null
    const childNames = [...new Set(logs.map((l) => childMap.get(l.child_id) || null))]
    const types = [...new Set(logs.map((l) => l.type))]

    notifications.push({
      user_id: userId,
      type: 'care_circle_accepted',
      ...caregiverActivityCopy(name, logs.length, types, childNames),
      data: { caregiverId, count: logs.length, dedupeKey },
    })
  }

  return insertNotifications(notifications)
}

// ─── 9. NEW INSIGHTS NOTIFICATIONS ──────────────────────────────────────────

export async function generateInsightNotifications(
  userId: string,
): Promise<number> {
  const dedupeKey = `insights_${toDateStr(new Date())}`
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
      ...insightCopy(insight.title, insight.body),
      data: { insightId: insight.id, dedupeKey },
    })
  } else {
    notifications.push({
      user_id: userId,
      type: 'insight',
      ...insightsCopy(newInsights.map((i) => i.title)),
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

    notifications.push({
      user_id: userId,
      type: 'reminder',
      // Today / tomorrow / weekday by calendar day (was a 24h window: 23:00 → 09:00 read "today").
      ...appointmentCopy({
        date: new Date(appt.appointment_date),
        now,
        type: appt.appointment_type,
        doctor: appt.doctor_name,
        location: appt.location,
        notes: appt.notes,
      }),
      data: { appointmentId: appt.id, dedupeKey },
    })
  }

  return insertNotifications(notifications)
}

// ─── 11. UNREAD CHANNEL ACTIVITY ────────────────────────────────────────────

export async function generateChannelActivityNotifications(
  userId: string,
): Promise<number> {
  const dedupeKey = `channels_${toDateStr(new Date())}`
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
      notifications.push({
        user_id: userId,
        type: 'channel',
        ...channelActivityCopy(postCount, (mem as any).channels?.name),
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
  const todayDate = toDateStr(new Date())

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
      notifications.push({
        user_id: userId,
        type: 'milestone',
        ...pregnancyWeekCopy(weekNumber),
        data: { behavior: 'pregnancy', week: weekNumber, dedupeKey },
      })
    }
  }

  // ── Due date approaching ──────────────────────────────────────────────────
  if (dueDate) {
    const daysToDue = Math.ceil((parseLocalDate(dueDate).getTime() - Date.now()) / 86400000)
    if (daysToDue >= 0 && daysToDue <= 14) {
      const dedupeKey = `pregnancy_due_${daysToDue}`
      const already = await alreadyNotifiedToday(userId, 'reminder', dedupeKey)
      if (!already) {
        notifications.push({
          user_id: userId,
          type: 'reminder',
          ...dueDateCopy(daysToDue),
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
    const daysSince = Math.floor((Date.now() - parseLocalDate(lastLog.log_date).getTime()) / 86400000)
    if (daysSince >= 3) {
      const dedupeKey = `pregnancy_missing_${daysSince}`
      const already = await alreadyNotifiedToday(userId, 'missing_data', dedupeKey)
      if (!already) {
        notifications.push({
          user_id: userId,
          type: 'missing_data',
          ...pregnancyQuietCopy(daysSince),
          data: { behavior: 'pregnancy', daysMissing: daysSince, dedupeKey },
        })
      }
    }
  }

  // ── Strong/severe symptoms in last 24h ────────────────────────────────────
  const oneDayAgo = toDateStr(new Date(Date.now() - 86400000))
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
      notifications.push({
        user_id: userId,
        type: 'health_alert',
        ...strongSymptomsCopy(severeSymptoms.map((s) => s.value)),
        data: { behavior: 'pregnancy', count: severeSymptoms.length, dedupeKey },
      })
    }
  }

  // ── Low kick count (week 28+) ─────────────────────────────────────────────
  if (weekNumber && weekNumber >= 28) {
    const sevenDaysAgo = toDateStr(new Date(Date.now() - 7 * 86400000))
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
            // Factual counts + "call your midwife/maternity unit" — no at-home instructions.
            ...kickCountCopy(todayKicks, avgOlder),
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
  const todayDate = toDateStr(new Date())

  // ── Fertile window starting today ─────────────────────────────────────────
  if (info.cycleDay === info.fertileStart && tryingToConceive) {
    const dedupeKey = `cycle_fertile_${todayDate}`
    const already = await alreadyNotifiedToday(userId, 'insight', dedupeKey)
    if (!already) {
      notifications.push({
        user_id: userId,
        type: 'insight',
        ...fertileWindowCopy(info.fertileStart, info.fertileEnd, info.ovulationDay),
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
        ...ovulationCopy(tryingToConceive, info.cycleDay),
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
        ...periodSoonCopy(info.daysUntilPeriod),
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
        ...latePeriodCopy(lateDays, tryingToConceive),
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
    const daysSince = Math.floor((Date.now() - parseLocalDate(lastLog.date).getTime()) / 86400000)
    if (daysSince >= 5) {
      const dedupeKey = `cycle_missing_${daysSince}`
      const already = await alreadyNotifiedToday(userId, 'missing_data', dedupeKey)
      if (!already) {
        notifications.push({
          user_id: userId,
          type: 'missing_data',
          ...cycleQuietCopy(daysSince),
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
      // Streaks belong to Daily Rewards; with the flag off they'd list rows that lead nowhere.
      useFeatureFlags.getState().dailyRewards ? generateStreakNotifications(userId) : Promise.resolve(0),
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
