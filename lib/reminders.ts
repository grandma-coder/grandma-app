import AsyncStorage from '@react-native-async-storage/async-storage'
import type { JourneyMode } from '../types'

export interface ChecklistItem { id: string; text: string; done: boolean }

export interface Reminder {
  id: string
  text: string
  done: boolean
  dueDate?: string | null
  dueTime?: string | null
  notifId?: string | null
  archivedAt?: string | null
  flagged?: boolean
  // rich fields (all optional, back-compat):
  tags?: string[]
  notes?: string
  checklist?: ChecklistItem[]
  priority?: 'low' | 'med' | 'high'
}

export function storageKey(userId: string | null, context: JourneyMode): string | null {
  return userId ? `grandma-reminders-${context}-${userId}` : null
}

export async function loadReminders(userId: string | null, context: JourneyMode): Promise<Reminder[]> {
  const key = storageKey(userId, context)
  if (!key) return []
  const json = await AsyncStorage.getItem(key)
  if (!json) return []
  try { return JSON.parse(json) as Reminder[] } catch { return [] }
}

export async function saveReminders(userId: string | null, context: JourneyMode, list: Reminder[]): Promise<void> {
  const key = storageKey(userId, context)
  if (key) await AsyncStorage.setItem(key, JSON.stringify(list))
}

// Not-done reminders, soonest first. Dated before undated; among dated by date
// asc; among undated, flagged first; stable id order otherwise. Limited to n.
export function upcomingReminders(list: Reminder[], n: number): Reminder[] {
  return list
    .filter((r) => !r.done)
    .slice()
    .sort((a, b) => {
      const ad = a.dueDate ?? null
      const bd = b.dueDate ?? null
      if (ad && bd) return ad < bd ? -1 : ad > bd ? 1 : 0
      if (ad && !bd) return -1
      if (!ad && bd) return 1
      // both undated: flagged first
      if (!!a.flagged !== !!b.flagged) return a.flagged ? -1 : 1
      return 0
    })
    .slice(0, n)
}

export function allTags(list: Reminder[]): string[] {
  const seen: string[] = []
  for (const r of list) for (const tag of r.tags ?? []) if (!seen.includes(tag)) seen.push(tag)
  return seen
}
