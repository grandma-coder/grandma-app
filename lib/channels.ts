import { supabase } from './supabase'

export interface Channel {
  id: string
  name: string
  description?: string
  category: string
  channelType: 'public' | 'private'
  createdBy: string
  memberCount: number
  avatarUrl?: string
  createdAt: string
}

export interface Thread {
  id: string
  channelId: string
  authorId: string
  authorEmail?: string
  title: string
  content: string
  isPinned: boolean
  replyCount: number
  createdAt: string
}

export interface Reply {
  id: string
  threadId: string
  authorId: string
  authorEmail?: string
  content: string
  createdAt: string
}

export async function getChannels(): Promise<Channel[]> {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .order('member_count', { ascending: false })

  if (error) throw error
  return (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    category: c.category,
    channelType: c.channel_type,
    createdBy: c.created_by,
    memberCount: c.member_count,
    avatarUrl: c.avatar_url,
    createdAt: c.created_at,
  }))
}

export async function getThreads(channelId: string): Promise<Thread[]> {
  const { data, error } = await supabase
    .from('channel_threads')
    .select('*')
    .eq('channel_id', channelId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((t: any) => ({
    id: t.id,
    channelId: t.channel_id,
    authorId: t.author_id,
    title: t.title,
    content: t.content,
    isPinned: t.is_pinned,
    replyCount: t.reply_count,
    createdAt: t.created_at,
  }))
}

export async function getReplies(threadId: string): Promise<Reply[]> {
  const { data, error } = await supabase
    .from('thread_replies')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []).map((r: any) => ({
    id: r.id,
    threadId: r.thread_id,
    authorId: r.author_id,
    content: r.content,
    createdAt: r.created_at,
  }))
}

export async function createThread(channelId: string, title: string, content: string): Promise<Thread> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('channel_threads')
    .insert({ channel_id: channelId, author_id: user.id, title, content })
    .select()
    .single()

  if (error) throw error
  return {
    id: data.id,
    channelId: data.channel_id,
    authorId: data.author_id,
    title: data.title,
    content: data.content,
    isPinned: data.is_pinned,
    replyCount: data.reply_count,
    createdAt: data.created_at,
  }
}

export async function postReply(threadId: string, content: string): Promise<Reply> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('thread_replies')
    .insert({ thread_id: threadId, author_id: user.id, content })
    .select()
    .single()

  if (error) throw error
  return {
    id: data.id,
    threadId: data.thread_id,
    authorId: data.author_id,
    content: data.content,
    createdAt: data.created_at,
  }
}

export async function joinChannel(channelId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  await supabase.from('channel_members').insert({ channel_id: channelId, user_id: user.id })
}
