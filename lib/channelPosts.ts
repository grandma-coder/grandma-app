/**
 * Channel Posts API — social feed within channels.
 * Posts, reactions, comments, memberships.
 */

import { supabase } from './supabase'

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
  created_at: string
  user_reacted?: boolean
}

export interface PostComment {
  id: string
  post_id: string
  author_id: string
  author_name?: string
  content: string
  created_at: string
}

// ─── Posts ──────────────────────────────────────────────────────────────────

export async function fetchPosts(channelId: string): Promise<ChannelPost[]> {
  const { data } = await supabase
    .from('channel_posts')
    .select('*')
    .eq('channel_id', channelId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  return (data ?? []) as ChannelPost[]
}

export async function createPost(
  channelId: string,
  content: string,
  photos?: string[]
): Promise<ChannelPost> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  // Upload photos if any
  const photoUrls: string[] = []
  if (photos?.length) {
    for (const uri of photos) {
      const ext = uri.split('.').pop() ?? 'jpg'
      const path = `posts/${session.user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`
      const response = await fetch(uri)
      const blob = await response.blob()
      const { error } = await supabase.storage.from('garage-photos').upload(path, blob, { contentType: `image/${ext}` })
      if (!error) {
        const { data: urlData } = supabase.storage.from('garage-photos').getPublicUrl(path)
        photoUrls.push(urlData.publicUrl)
      }
    }
  }

  const { data, error } = await supabase
    .from('channel_posts')
    .insert({
      channel_id: channelId,
      author_id: session.user.id,
      content,
      photos: photoUrls,
    })
    .select()
    .single()

  if (error) throw error
  return data as ChannelPost
}

// ─── Reactions ──────────────────────────────────────────────────────────────

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

// ─── Comments ───────────────────────────────────────────────────────────────

export async function fetchComments(postId: string): Promise<PostComment[]> {
  const { data } = await supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(50)

  return (data ?? []) as PostComment[]
}

export async function addComment(postId: string, content: string): Promise<PostComment> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, author_id: session.user.id, content })
    .select()
    .single()

  if (error) throw error
  return data as PostComment
}

// ─── Memberships ────────────────────────────────────────────────────────────

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
