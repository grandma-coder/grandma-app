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
  upsertSession: (session: ChatSession) => void
  deleteSession: (id: string) => void
  clearAll: () => void
}

export const useGrandmaHistoryStore = create<GrandmaHistoryStore>()(
  persist(
    (set) => ({
      sessions: [],

      upsertSession: (session) =>
        set((state) => {
          const exists = state.sessions.findIndex((s) => s.id === session.id)
          if (exists >= 0) {
            const updated = [...state.sessions]
            updated[exists] = session
            return { sessions: updated }
          }
          return { sessions: [session, ...state.sessions] }
        }),

      deleteSession: (id) =>
        set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) })),

      clearAll: () => set({ sessions: [] }),
    }),
    {
      name: 'grandma-chat-history',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
