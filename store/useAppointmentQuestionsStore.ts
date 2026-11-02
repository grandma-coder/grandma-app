import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Behavior } from './useBehaviorStore'

/**
 * "My questions for the appointment" — questions a parent or pregnant user jots down
 * during the week and ticks off at the appointment. Local only (AsyncStorage), no DB.
 *
 * Keyed by appointment id: a pregnancy STANDARD_APPOINTMENT id, a kids visit log id.
 * Questions written when no appointment is scheduled go to the journey's
 * `pending:<behavior>` bucket and move onto the next appointment when it's opened.
 */
export interface AppointmentQuestion {
  id: string
  text: string
  done: boolean
  createdAt: string
}

export const pendingQuestionsKey = (behavior: Behavior) => `pending:${behavior}`

interface AppointmentQuestionsStore {
  questions: Record<string, AppointmentQuestion[]>
  /** Adds a question; returns null for blank text. */
  add: (key: string, text: string) => AppointmentQuestion | null
  toggle: (key: string, id: string) => void
  remove: (key: string, id: string) => void
  /** Moves the journey's pending questions onto an appointment. Returns how many moved. */
  claimPending: (behavior: Behavior, appointmentKey: string) => number
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/** Drops the key when its list is empty so storage doesn't collect empty buckets. */
function withList(all: Record<string, AppointmentQuestion[]>, key: string, list: AppointmentQuestion[]) {
  const next = { ...all }
  if (list.length) next[key] = list
  else delete next[key]
  return next
}

export const useAppointmentQuestionsStore = create<AppointmentQuestionsStore>()(
  persist(
    (set, get) => ({
      questions: {},
      add: (key, text) => {
        const trimmed = text.trim()
        if (!trimmed) return null
        const q: AppointmentQuestion = { id: newId(), text: trimmed, done: false, createdAt: new Date().toISOString() }
        const all = get().questions
        set({ questions: withList(all, key, [...(all[key] ?? []), q]) })
        return q
      },
      toggle: (key, id) => {
        const all = get().questions
        const list = all[key]
        if (!list) return
        set({ questions: withList(all, key, list.map((q) => (q.id === id ? { ...q, done: !q.done } : q))) })
      },
      remove: (key, id) => {
        const all = get().questions
        const list = all[key]
        if (!list) return
        set({ questions: withList(all, key, list.filter((q) => q.id !== id)) })
      },
      claimPending: (behavior, appointmentKey) => {
        const pKey = pendingQuestionsKey(behavior)
        if (appointmentKey === pKey) return 0
        const all = get().questions
        const pending = all[pKey] ?? []
        if (!pending.length) return 0
        const merged = withList(all, appointmentKey, [...(all[appointmentKey] ?? []), ...pending])
        set({ questions: withList(merged, pKey, []) })
        return pending.length
      },
    }),
    {
      name: 'grandma-appointment-questions',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ questions: state.questions }),
    }
  )
)

const EMPTY: AppointmentQuestion[] = []

/** Questions for one appointment (stable empty array when there are none). */
export function useAppointmentQuestions(key: string): AppointmentQuestion[] {
  return useAppointmentQuestionsStore((s) => s.questions[key] ?? EMPTY)
}

/** Count of questions not yet asked, for the quiet "3 questions" hint on rows. */
export function openQuestionCount(questions: Record<string, AppointmentQuestion[]>, ...keys: string[]): number {
  let n = 0
  for (const k of keys) for (const q of questions[k] ?? EMPTY) if (!q.done) n++
  return n
}
