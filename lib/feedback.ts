/**
 * In-app suggestions → command center Support inbox (support_tickets) via the submit-feedback
 * edge function. Sends only what the team needs to act: the text, a kind, journey, language,
 * app version and platform — never health data.
 */
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { supabase } from './supabase'

export type FeedbackKind = 'feedback' | 'bug' | 'question'
export const FEEDBACK_MAX_LEN = 2000

export type FeedbackResult = 'ok' | 'rate_limited' | 'error'

export async function submitFeedback(input: { kind: FeedbackKind; message: string; journey: string; language: string }): Promise<FeedbackResult> {
  const message = input.message.trim()
  if (!message) return 'error'
  const { data, error } = await supabase.functions.invoke('submit-feedback', {
    body: {
      kind: input.kind,
      message: message.slice(0, FEEDBACK_MAX_LEN),
      journey: input.journey,
      language: input.language,
      appVersion: Constants.expoConfig?.version ?? null,
      platform: Platform.OS,
    },
  })
  if (!error && data?.id) return 'ok'
  // FunctionsHttpError carries the response; 429 = too many in the last hour.
  const status = (error as { context?: { status?: number } } | null)?.context?.status
  return status === 429 ? 'rate_limited' : 'error'
}
