import { useCallback, useEffect } from 'react'
import { create } from 'zustand'
import type { JourneyMode } from '../types'
import {
  applyDraft,
  createReminder,
  loadReminders,
  saveReminders,
  setReminderDone,
  storageKey,
  type Reminder,
  type ReminderDraft,
} from '../lib/reminders'
import { syncReminderNotifications } from '../lib/reminderNotifications'
import { supabase } from '../lib/supabase'

/**
 * Pregnancy + cycle reminders, shared by the wallet card (badge) and the
 * reminders sheet so both see the same list live. Persisted by hand under the
 * existing per-user AsyncStorage keys (`grandma-reminders-<journey>-<userId>`)
 * — not zustand/persist — so data written by older builds is read as is.
 *
 * Every write: update memory → write storage → re-sync the journey's local
 * alerts. Writes wait for the first load, so a fast tap can't overwrite the
 * stored list with a half-empty one.
 */
interface RemindersStore {
  /** By storage key (journey + user). */
  lists: Record<string, Reminder[]>
  loaded: Record<string, boolean>
  load: (userId: string | null, context: JourneyMode, opts?: { force?: boolean }) => Promise<Reminder[]>
  mutate: (userId: string | null, context: JourneyMode, fn: (list: Reminder[]) => Reminder[]) => Promise<Reminder[] | null>
}

const inflight = new Map<string, Promise<Reminder[]>>()

export const useRemindersStore = create<RemindersStore>()((set, get) => ({
  lists: {},
  loaded: {},

  load: (userId, context, opts) => {
    const key = storageKey(userId, context)
    if (!key) return Promise.resolve([])
    if (!opts?.force && get().loaded[key]) return Promise.resolve(get().lists[key] ?? [])
    const pending = inflight.get(key)
    if (pending) return pending
    const run = loadReminders(userId, context)
      .catch(() => [] as Reminder[])
      .then((list) => {
        set((s) => ({ lists: { ...s.lists, [key]: list }, loaded: { ...s.loaded, [key]: true } }))
        // Reconcile alerts on every load: after a restart, a re-login (sign-out
        // cancels them), a language change or a time-zone move.
        void syncReminderNotifications(context, list)
        return list
      })
      .finally(() => inflight.delete(key))
    inflight.set(key, run)
    return run
  },

  mutate: async (userId, context, fn) => {
    const key = storageKey(userId, context)
    if (!key) return null
    if (!get().loaded[key]) await get().load(userId, context)
    const next = fn(get().lists[key] ?? [])
    set((s) => ({ lists: { ...s.lists, [key]: next } }))
    await saveReminders(userId, context, next).catch(() => {})
    void syncReminderNotifications(context, next)
    return next
  },
}))

const EMPTY: Reminder[] = []

/** Clean up the row older builds mirrored into `notifications` (the inbox) per reminder. */
function dropLegacyInboxRow(r: Reminder | undefined) {
  if (r?.notifId) void supabase.from('notifications').delete().eq('id', r.notifId).then(() => {}, () => {})
}

/**
 * Reminders for one journey of the signed-in user, plus the actions the sheet
 * needs. `userId` null (session still loading) → empty and not ready.
 */
export function useReminders(userId: string | null, context: JourneyMode) {
  const key = storageKey(userId, context)
  const reminders = useRemindersStore((s) => (key ? s.lists[key] : undefined)) ?? EMPTY
  const ready = useRemindersStore((s) => (key ? !!s.loaded[key] : false))
  const load = useRemindersStore((s) => s.load)
  const mutate = useRemindersStore((s) => s.mutate)

  useEffect(() => {
    if (userId) void load(userId, context)
  }, [userId, context, load])

  const add = useCallback(
    (draft: ReminderDraft) => mutate(userId, context, (list) => [...list, createReminder(draft)]),
    [mutate, userId, context],
  )
  const update = useCallback(
    (id: string, draft: ReminderDraft) =>
      mutate(userId, context, (list) => list.map((r) => (r.id === id ? applyDraft(r, draft, new Date()) : r))),
    [mutate, userId, context],
  )
  const setDone = useCallback(
    (id: string, done: boolean) =>
      mutate(userId, context, (list) => list.map((r) => (r.id === id ? setReminderDone(r, done, new Date()) : r))),
    [mutate, userId, context],
  )
  const remove = useCallback(
    (id: string) =>
      mutate(userId, context, (list) => {
        dropLegacyInboxRow(list.find((r) => r.id === id))
        return list.filter((r) => r.id !== id)
      }),
    [mutate, userId, context],
  )
  const clearDone = useCallback(
    () =>
      mutate(userId, context, (list) => {
        list.filter((r) => r.done).forEach(dropLegacyInboxRow)
        return list.filter((r) => !r.done)
      }),
    [mutate, userId, context],
  )

  return { reminders, ready, add, update, setDone, remove, clearDone }
}
