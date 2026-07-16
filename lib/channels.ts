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
  avgRating: number
  ratingCount: number
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
    avgRating: parseFloat(c.avg_rating) || 0,
    ratingCount: c.rating_count ?? 0,
    createdAt: c.created_at,
  }))
}
