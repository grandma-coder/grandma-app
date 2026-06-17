/**
 * Grandma History Store — persists chat sessions across app launches.
 *
 * Each session stores the full message list, a derived title, the active
 * behavior mode, and an optional child name for display.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { ChatMessage } from '../lib/grandmaChat'

const MAX_SESSIONS = 20
const MAX_MESSAGES_PER_SESSION = 50

export interface ChatSession {
  id: string
  title: string
  createdAt: string
  behavior: string
  childName?: string
  messages: ChatMessage[]
}

interface GrandmaHistoryStore {
  sessions: ChatSession[]
  hydrated: boolean
  upsertSession: (session: ChatSession) => void
  deleteSession: (id: string) => void
  clearAll: () => void
  setHydrated: (hydrated: boolean) => void
}

export const useGrandmaHistoryStore = create<GrandmaHistoryStore>()(
  persist(
    (set) => ({
      sessions: [],
      hydrated: false,

      upsertSession: (session) =>
        set((state) => {
          const trimmed = {
            ...session,
            messages: session.messages.slice(-MAX_MESSAGES_PER_SESSION),
          }
          const exists = state.sessions.findIndex((s) => s.id === trimmed.id)
          if (exists >= 0) {
            const updated = [...state.sessions]
            updated[exists] = trimmed
            return { sessions: updated }
          }
          return { sessions: [trimmed, ...state.sessions].slice(0, MAX_SESSIONS) }
        }),

      deleteSession: (id) =>
        set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) })),

      clearAll: () => set({ sessions: [] }),

      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'grandma-chat-history',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ sessions: state.sessions }),
      // Flip the flag via setState so it always fires, even on a fresh install
      // where `state` is undefined (nothing persisted yet). See useBehaviorStore
      // for the canonical pattern + the "week 1 → week 40 flash" incident.
      onRehydrateStorage: () => () => {
        useGrandmaHistoryStore.setState({ hydrated: true })
      },
    }
  )
)
