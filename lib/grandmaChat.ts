/**
 * Grandma Chat API — chat with context-aware AI.
 *
 * Calls grandma-chat edge function (with suggestions),
 * falls back to nana-chat (legacy, no suggestions).
 */

import { supabase } from './supabase'
import { useFeatureFlags } from '../store/useFeatureFlags'

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
  /** Pregnancy week (1–42). Forwarded so Grandma can give week-specific advice. */
  weekNumber?: number | null
  /** Pregnancy due date (YYYY-MM-DD). Lets the edge function compute trimester. */
  dueDate?: string | null
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
  // Remote kill switch (command center). The edge functions refuse too; this skips the round trip.
  if (!useFeatureFlags.getState().grandmaChat) throw new Error('grandma_chat_disabled')
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
    // A deliberate refusal (switched off / signed out) must not be retried on nana-chat — that
    // would only double the round trip and, for the kill switch, hit the same 403 again.
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status
      if (status === 401 || status === 403) throw new GrandmaRefusal(await errorDetail(error))
    }
  } catch (err) {
    if (err instanceof GrandmaRefusal) throw new Error(err.message)
    if (__DEV__) console.warn('[grandmaChat] grandma-chat failed, falling back to nana-chat:', err)
  }

  // Fallback: use nana-chat (always deployed, no suggestions)
  const { data, error } = await supabase.functions.invoke('nana-chat', {
    body: {
      messages,
      mode: context.behavior,
      childContext: null,
      pillarId: null,
      weekNumber: context.weekNumber ?? null,
      dueDate: context.dueDate ?? null,
    },
  })

  if (error) throw error
  // No reply is a failure — surfacing a placeholder as Grandma's answer left a dead bubble in the chat.
  if (typeof data?.reply !== 'string' || !data.reply) throw new Error('No response from Grandma')
  return { reply: data.reply, suggestions: [] }
}

class GrandmaRefusal extends Error {}

/** The edge function's own `error` field, dug out of a FunctionsHttpError (falls back to its message). */
async function errorDetail(error: unknown): Promise<string> {
  const fallback = (error as { message?: string })?.message ?? 'grandma-chat failed'
  try {
    const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context
    const body = typeof ctx?.json === 'function' ? await ctx.json() : null
    return body?.error ?? fallback
  } catch {
    return fallback
  }
}
