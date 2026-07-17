/**
 * Community safety helpers (Phase 1 / WS3) — report content, block/unblock
 * users. Backed by content_reports + user_blocks (migration
 * 20260716180000_community_safety.sql). RLS hides removed content and content
 * from blocked users server-side, so the client only needs to write the block /
 * report and refresh.
 *
 * Model-independent — serves today's real-name chat and the future anonymous
 * forum (community-model decision: Option B).
 */

import { supabase } from './supabase'

export type ReportableType = 'channel_post' | 'post_comment' | 'garage_listing'

// Keys resolve via i18n (report_reason_*). Kept in sync with the migration's
// CHECK constraint on content_reports.reason.
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate'
  | 'misinformation'
  | 'inappropriate'
  | 'self_harm'
  | 'other'

export const REPORT_REASONS: ReportReason[] = [
  'spam',
  'harassment',
  'hate',
  'misinformation',
  'inappropriate',
  'self_harm',
  'other',
]

/**
 * File a report against a piece of content. Idempotent per (reporter, content):
 * re-reporting the same item is swallowed as a no-op (unique constraint).
 */
export async function reportContent(params: {
  contentType: ReportableType
  contentId: string
  authorId?: string | null
  reason: ReportReason
  details?: string
}): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { error } = await supabase.from('content_reports').insert({
    reporter_id: session.user.id,
    content_type: params.contentType,
    content_id: params.contentId,
    author_id: params.authorId ?? null,
    reason: params.reason,
    details: params.details ?? null,
  })

  // 23505 = unique_violation → already reported; treat as success.
  if (error && (error as any).code !== '23505') throw error
}

/** Block a user. Their content disappears for the blocker (enforced by RLS). */
export async function blockUser(blockedId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  if (blockedId === session.user.id) throw new Error('You cannot block yourself')

  const { error } = await supabase.from('user_blocks').insert({
    blocker_id: session.user.id,
    blocked_id: blockedId,
  })
  if (error && (error as any).code !== '23505') throw error
}

/** Reverse a block. */
export async function unblockUser(blockedId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', session.user.id)
    .eq('blocked_id', blockedId)
  if (error) throw error
}

/** The set of user IDs the current user has blocked (for UI state). */
export async function getBlockedUserIds(): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', session.user.id)
  if (error) throw error
  return (data ?? []).map((r: any) => r.blocked_id)
}
