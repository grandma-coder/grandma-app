/**
 * Notifications API — fetch, mark read, delete.
 */

import { supabase } from './supabase'

export type NotificationType =
  | 'care_circle_invite' | 'care_circle_accepted'
  | 'child_log' | 'reminder' | 'milestone'
  | 'cycle_prediction' | 'pregnancy_week'
  | 'appointment' | 'system' | 'chat'
  | 'wellness_drop' | 'wellness_improve' | 'missing_data'
  | 'routine_reminder' | 'routine_missed'
  | 'health_alert' | 'vaccine_due'
  | 'goal_achieved' | 'goal_missed'
  | 'streak' | 'streak_broken'
  | 'insight' | 'daily_summary' | 'weekly_report'
  | 'mention' | 'reply' | 'like' | 'channel'

export interface AppNotification {
  id: string
  user_id: string
  type: NotificationType
  is_read: boolean
  title: string
  body: string | null
  data: Record<string, any>
  created_at: string
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (data ?? []) as AppNotification[]
}

export async function markAsRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id)
}

export async function markAllAsRead(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false)
}

export async function deleteNotification(id: string): Promise<void> {
  await supabase.from('notifications').delete().eq('id', id)
}

export async function getUnreadCount(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return 0
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false)
  return count ?? 0
}

/** Map notification type to filter category */
export function getCategory(type: NotificationType): string {
  switch (type) {
    case 'wellness_drop': case 'wellness_improve': case 'missing_data':
      return 'Wellness'
    case 'health_alert': case 'vaccine_due': case 'child_log':
    case 'cycle_prediction': case 'pregnancy_week': case 'appointment':
      return 'Health'
    case 'goal_achieved': case 'goal_missed': case 'streak': case 'streak_broken':
      return 'Goals'
    case 'routine_reminder': case 'routine_missed': case 'reminder':
      return 'Routines'
    case 'insight': case 'milestone': case 'daily_summary': case 'weekly_report':
      return 'Insights'
    case 'mention': case 'reply': case 'like': case 'channel': case 'chat':
      return 'Community'
    case 'care_circle_invite': case 'care_circle_accepted':
      return 'Care Circle'
    case 'system':
      return 'System'
    default:
      return 'System'
  }
}
