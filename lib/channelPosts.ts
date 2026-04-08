/**
 * Channel Posts API — real-time chat messages, threads, reactions, mentions, unread tracking.
 */

import { supabase } from './supabase'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ChannelPost {
  id: string
  channel_id: string
  author_id: string
  author_name?: string
  content: string
  photos: string[]
  is_pinned: boolean
  reaction_count: number
  comment_count: number
  reply_to_id: string | null
  reply_count: number
  mentions: string[]
  created_at: string
  user_reacted?: boolean
  // For thread preview
  reply_to_content?: string
  reply_to_author?: string
}

export interface PostComment {
  id: string
  post_id: string
  author_id: string
  author_name?: string
  content: string
  created_at: string
}

// ─── Helper: get current user name ─────────────────────────────────────────

let _cachedUserName: string | null = null
let _cachedUserId: string | null = null

async function getCurrentUserName(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  if (_cachedUserId === session.user.id && _cachedUserName) return _cachedUserName

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('user_id', session.user.id)
    .single()

  _cachedUserId = session.user.id
  _cachedUserName = profile?.name || session.user.email?.split('@')[0] || null
  return _cachedUserName
}

// ─── Channels CRUD ─────────────────────────────────────────────────────────

export async function createChannel(opts: {
  name: string
  description?: string
  category: string
}): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('channels')
    .insert({
      name: opts.name.trim(),
      description: opts.description?.trim() ?? null,
      category: opts.category,
      channel_type: 'public',
      created_by: session.user.id,
    })
    .select('id')
    .single()

  if (error) throw error

  // Auto-join creator
  await supabase.from('channel_members').insert({
    channel_id: data.id,
    user_id: session.user.id,
  })

  return data.id
}

// ─── Messages (Posts) ──────────────────────────────────────────────────────

export async function fetchMessages(channelId: string): Promise<ChannelPost[]> {
  const { data } = await supabase
    .from('channel_posts')
    .select('*')
    .eq('channel_id', channelId)
    .is('reply_to_id', null) // Only top-level messages, not thread replies
    .order('created_at', { ascending: true })
    .limit(100)

  const posts = (data ?? []) as ChannelPost[]

  // Backfill author names
  const missing = posts.filter((p) => !p.author_name)
  if (missing.length > 0) {
    const authorIds = [...new Set(missing.map((p) => p.author_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', authorIds)

    if (profiles) {
      const nameMap = new Map(profiles.map((p: any) => [p.user_id, p.name]))
      for (const post of posts) {
        if (!post.author_name) {
          post.author_name = nameMap.get(post.author_id) ?? null
        }
      }
    }
  }

  // Check user reactions
  const { data: { session } } = await supabase.auth.getSession()
  if (session && posts.length > 0) {
    const postIds = posts.map((p) => p.id)
    const { data: reactions } = await supabase
      .from('post_reactions')
      .select('post_id')
      .eq('user_id', session.user.id)
      .in('post_id', postIds)

    const reactedIds = new Set((reactions ?? []).map((r: any) => r.post_id))
    for (const post of posts) {
      post.user_reacted = reactedIds.has(post.id)
    }
  }

  return posts
}

export async function sendMessage(
  channelId: string,
  content: string,
  opts?: {
    photos?: string[]
    replyToId?: string
    mentions?: string[]
  }
): Promise<ChannelPost> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const authorName = await getCurrentUserName()

  // Upload photos if any
  const photoUrls: string[] = []
  if (opts?.photos?.length) {
    for (const uri of opts.photos) {
      try {
        const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg'
        const path = `posts/${session.user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`

        const formData = new FormData()
        formData.append('', { uri, name: path.split('/').pop(), type: `image/${ext}` } as any)

        const { error } = await supabase.storage
          .from('garage-media')
          .upload(path, formData, { contentType: 'multipart/form-data', upsert: true })

        if (!error) {
          const { data: urlData } = supabase.storage.from('garage-media').getPublicUrl(path)
          photoUrls.push(urlData.publicUrl)
        }
      } catch {}
    }
  }

  const { data, error } = await supabase
    .from('channel_posts')
    .insert({
      channel_id: channelId,
      author_id: session.user.id,
      author_name: authorName,
      content,
      photos: photoUrls,
      reply_to_id: opts?.replyToId ?? null,
      mentions: opts?.mentions ?? [],
    })
    .select()
    .single()

  if (error) throw error
  return data as ChannelPost
}

// ─── Thread Replies ────────────────────────────────────────────────────────

export async function fetchThreadReplies(parentId: string): Promise<ChannelPost[]> {
  const { data } = await supabase
    .from('channel_posts')
    .select('*')
    .eq('reply_to_id', parentId)
    .order('created_at', { ascending: true })
    .limit(200)

  const replies = (data ?? []) as ChannelPost[]

  // Backfill names
  const missing = replies.filter((r) => !r.author_name)
  if (missing.length > 0) {
    const authorIds = [...new Set(missing.map((r) => r.author_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', authorIds)

    if (profiles) {
      const nameMap = new Map(profiles.map((p: any) => [p.user_id, p.name]))
      for (const r of replies) {
        if (!r.author_name) r.author_name = nameMap.get(r.author_id) ?? null
      }
    }
  }

  return replies
}

// ─── Reactions ─────────────────────────────────────────────────────────────

export async function toggleReaction(postId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('post_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', session.user.id)
    .single()

  if (existing) {
    await supabase.from('post_reactions').delete().eq('id', existing.id)
    return false
  } else {
    await supabase.from('post_reactions').insert({ post_id: postId, user_id: session.user.id })
    return true
  }
}

// ─── Memberships ───────────────────────────────────────────────────────────

export async function joinChannel(channelId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  await supabase.from('channel_members').insert({ channel_id: channelId, user_id: session.user.id })
}

export async function leaveChannel(channelId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  await supabase.from('channel_members').delete().eq('channel_id', channelId).eq('user_id', session.user.id)
}

export async function isChannelMember(channelId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false
  const { data } = await supabase
    .from('channel_members')
    .select('id')
    .eq('channel_id', channelId)
    .eq('user_id', session.user.id)
    .single()
  return !!data
}

export async function getMyChannelIds(): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []
  const { data } = await supabase
    .from('channel_members')
    .select('channel_id')
    .eq('user_id', session.user.id)
  return (data ?? []).map((d: any) => d.channel_id)
}

// ─── Unread Tracking ───────────────────────────────────────────────────────

export async function markChannelRead(channelId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  await supabase
    .from('channel_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('channel_id', channelId)
    .eq('user_id', session.user.id)
}

export async function getUnreadCounts(): Promise<Record<string, number>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return {}

  // Get user's memberships with last_read_at
  const { data: memberships } = await supabase
    .from('channel_members')
    .select('channel_id, last_read_at')
    .eq('user_id', session.user.id)

  if (!memberships || memberships.length === 0) return {}

  const counts: Record<string, number> = {}
  for (const m of memberships) {
    const { count } = await supabase
      .from('channel_posts')
      .select('*', { count: 'exact', head: true })
      .eq('channel_id', m.channel_id)
      .is('reply_to_id', null)
      .gt('created_at', m.last_read_at ?? '1970-01-01')

    counts[m.channel_id] = count ?? 0
  }

  return counts
}

// ─── @Mention Search ───────────────────────────────────────────────────────

export async function searchChannelMembers(
  channelId: string,
  query: string
): Promise<{ id: string; name: string }[]> {
  if (!query || query.length < 1) return []

  const { data: members } = await supabase
    .from('channel_members')
    .select('user_id')
    .eq('channel_id', channelId)

  if (!members || members.length === 0) return []

  const userIds = members.map((m: any) => m.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, name')
    .in('user_id', userIds)
    .ilike('name', `%${query}%`)
    .limit(10)

  return (profiles ?? [])
    .filter((p: any) => p.name)
    .map((p: any) => ({ id: p.user_id, name: p.name }))
}

// ─── Channel Ratings ───────────────────────────────────────────────────────

export interface ChannelRating {
  id: string
  channel_id: string
  user_id: string
  rating: number
  review: string | null
  created_at: string
  // Joined
  author_name?: string
}

export async function rateChannel(channelId: string, rating: number, review?: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  // Upsert — update if already rated
  const { error } = await supabase
    .from('channel_ratings')
    .upsert({
      channel_id: channelId,
      user_id: session.user.id,
      rating,
      review: review?.trim() ?? null,
    }, { onConflict: 'channel_id,user_id' })

  if (error) throw error
}

export async function fetchChannelRatings(channelId: string): Promise<ChannelRating[]> {
  const { data } = await supabase
    .from('channel_ratings')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(50)

  const ratings = (data ?? []) as ChannelRating[]

  // Backfill author names
  const missing = ratings.filter((r) => !r.author_name)
  if (missing.length > 0) {
    const userIds = [...new Set(missing.map((r) => r.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', userIds)
    if (profiles) {
      const nameMap = new Map(profiles.map((p: any) => [p.user_id, p.name]))
      for (const r of ratings) {
        if (!r.author_name) r.author_name = nameMap.get(r.user_id) ?? null
      }
    }
  }
  return ratings
}

export async function getMyRating(channelId: string): Promise<{ rating: number; review: string | null } | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data } = await supabase
    .from('channel_ratings')
    .select('rating, review')
    .eq('channel_id', channelId)
    .eq('user_id', session.user.id)
    .single()
  return data as { rating: number; review: string | null } | null
}

// ─── Save/Follow Channels ──────────────────────────────────────────────────

export async function saveChannel(channelId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  await supabase.from('channel_saves').insert({ channel_id: channelId, user_id: session.user.id })
}

export async function unsaveChannel(channelId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  await supabase.from('channel_saves').delete().eq('channel_id', channelId).eq('user_id', session.user.id)
}

export async function getMySavedChannelIds(): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []
  const { data } = await supabase.from('channel_saves').select('channel_id').eq('user_id', session.user.id)
  return (data ?? []).map((d: any) => d.channel_id)
}

// ─── Delete Messages ───────────────────────────────────────────────────────

export async function deleteMessage(messageId: string): Promise<void> {
  await supabase.from('channel_posts').delete().eq('id', messageId)
}

// ─── Notifications ─────────────────────────────────────────────────────────

export interface AppNotification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: any
  is_read: boolean
  created_at: string
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as AppNotification[]
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id)
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id).eq('is_read', false)
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return 0
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false)
  return count ?? 0
}

// Create notification for mentioned users
export async function notifyMentions(
  channelId: string,
  channelName: string,
  messageContent: string,
  mentionedUserIds: string[]
): Promise<void> {
  if (mentionedUserIds.length === 0) return
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  const authorName = await getCurrentUserName()

  const notifications = mentionedUserIds
    .filter((uid) => uid !== session.user.id) // don't notify self
    .map((uid) => ({
      user_id: uid,
      type: 'mention',
      title: `${authorName ?? 'Someone'} mentioned you in #${channelName}`,
      body: messageContent.slice(0, 100),
      data: { channelId },
    }))

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications)
  }
}

// ─── Legacy exports (backward compat) ──────────────────────────────────────

export const fetchPosts = fetchMessages
export const createPost = (channelId: string, content: string, photos?: string[]) =>
  sendMessage(channelId, content, { photos })
export const fetchComments = async (postId: string): Promise<PostComment[]> => {
  const { data } = await supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(50)
  return (data ?? []) as PostComment[]
}
export const addComment = async (postId: string, content: string): Promise<PostComment> => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  const authorName = await getCurrentUserName()
  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, author_id: session.user.id, author_name: authorName, content })
    .select()
    .single()
  if (error) throw error
  return data as PostComment
}
