/**
 * Grandma Chat API — chat with context-aware AI.
 *
 * Tries the new grandma-chat function first (streaming),
 * falls back to the existing nana-chat function (non-streaming).
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
}

/**
 * Send messages to Grandma via the existing nana-chat function.
 * Reliable, non-streaming.
 */
export async function sendGrandmaMessage(
  messages: { role: string; content: string }[],
  context: ChatContext
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  // Try grandma-chat first (enhanced with context)
  try {
    const { data, error } = await supabase.functions.invoke('grandma-chat', {
      body: {
        messages,
        user_id: session.user.id,
        context,
      },
    })

    if (!error && data) {
      // If it returned streamed text, extract it
      if (typeof data === 'string') return data
      if (data.reply) return data.reply
      // If it returned raw text from streaming, reconstruct
      if (data.content?.[0]?.text) return data.content[0].text
    }
  } catch {
    // grandma-chat not deployed — fall through to nana-chat
  }

  // Fallback: use nana-chat (always deployed)
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
  return data?.reply ?? 'Grandma is thinking...'
}
