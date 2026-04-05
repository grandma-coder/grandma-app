/**
 * Notifications API — fetch, mark read, delete.
 */

import { supabase } from './supabase'

export type NotificationType =
  | 'care_circle_invite' | 'care_circle_accepted'
  | 'child_log' | 'reminder' | 'milestone'
  | 'cycle_prediction' | 'pregnancy_week'
  | 'appointment' | 'system' | 'chat'

export interface AppNotification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  read: boolean
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
  await supabase.from('notifications').update({ read: true }).eq('id', id)
}

export async function markAllAsRead(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', session.user.id)
    .eq('read', false)
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
    .eq('read', false)
  return count ?? 0
}

/** Map notification type to filter category */
export function getCategory(type: NotificationType): string {
  switch (type) {
    case 'child_log': case 'milestone': case 'cycle_prediction':
    case 'pregnancy_week': case 'appointment': case 'reminder':
      return 'Health'
    case 'care_circle_invite': case 'care_circle_accepted':
      return 'Care Circle'
    case 'chat':
      return 'Channels'
    case 'system':
      return 'System'
    default:
      return 'System'
  }
}
