/**
 * Grandma Chat API — chat with context-aware AI.
 *
 * Calls grandma-chat edge function (with suggestions),
 * falls back to nana-chat (legacy, no suggestions).
 */

import { supabase } from './supabase'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface ChatContext {
  /** Currently active behavior */
  behavior: string
  /** All active behaviors — Grandma knows about all of them */
  allBehaviors?: string[]
  screen?: string
  insight?: string
  /** Active child ID for focused context */
  activeChildId?: string
}

export interface GrandmaResponse {
  reply: string
  suggestions: string[]
}

/**
 * Send messages to Grandma and get a reply with follow-up suggestions.
 */
export async function sendGrandmaMessage(
  messages: Pick<ChatMessage, 'role' | 'content'>[],
  context: ChatContext
): Promise<GrandmaResponse> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  // Try grandma-chat first (enhanced with context + suggestions)
  try {
    const { data, error } = await supabase.functions.invoke('grandma-chat', {
      body: {
        messages,
        user_id: session.user.id,
        context,
      },
    })

    if (!error && data) {
      const reply = typeof data === 'string'
        ? data
        : data.reply ?? data.content?.[0]?.text ?? ''
      const suggestions: string[] = data.suggestions ?? []
      if (reply) return { reply, suggestions }
    }
  } catch (err) {
    if (__DEV__) console.warn('[grandmaChat] grandma-chat failed, falling back to nana-chat:', err)
  }

  // Fallback: use nana-chat (always deployed, no suggestions)
  const { data, error } = await supabase.functions.invoke('nana-chat', {
    body: {
      messages,
      mode: context.behavior,
      childContext: null,
      pillarId: null,
      weekNumber: null,
    },
  })

  if (error) throw error
  return {
    reply: data?.reply ?? 'Grandma is thinking...',
    suggestions: [],
  }
}
