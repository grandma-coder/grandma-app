/**
 * Garage Social Feed API — Instagram-style posts with media, likes, comments, saves.
 */

import { supabase } from './supabase'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface MediaItem {
  url: string
  type: 'photo' | 'video'
  width?: number
  height?: number
}

export interface GaragePost {
  id: string
  author_id: string
  author_name: string | null
  caption: string | null
  media: MediaItem[]
  category: string | null
  tags: string[]
  like_count: number
  comment_count: number
  share_count: number
  is_featured: boolean
  created_at: string
  // Client-side state
  user_liked?: boolean
  user_saved?: boolean
}

export interface GarageComment {
  id: string
  post_id: string
  author_id: string
  author_name: string | null
  content: string
  created_at: string
}

// ─── Feed ──────────────────────────────────────────────────────────────────

export async function fetchFeed(opts?: {
  category?: string
  limit?: number
  offset?: number
}): Promise<GaragePost[]> {
  const limit = opts?.limit ?? 20
  const offset = opts?.offset ?? 0

  let query = supabase
    .from('garage_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts?.category) {
    query = query.eq('category', opts.category)
  }

  const { data } = await query
  const posts = (data ?? []) as GaragePost[]

  // Backfill author names for posts missing them
  const missingNamePosts = posts.filter((p) => !p.author_name)
  if (missingNamePosts.length > 0) {
    const authorIds = [...new Set(missingNamePosts.map((p) => p.author_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', authorIds)

    if (profiles) {
      const nameMap = new Map(profiles.map((p: any) => [p.id, p.name]))
      for (const post of posts) {
        if (!post.author_name) {
          post.author_name = nameMap.get(post.author_id) ?? null
        }
      }
    }
  }

  // Check user likes & saves
  const { data: { session } } = await supabase.auth.getSession()
  if (session && posts.length > 0) {
    const postIds = posts.map((p) => p.id)

    const [likesRes, savesRes] = await Promise.all([
      supabase
        .from('garage_post_likes')
        .select('post_id')
        .eq('user_id', session.user.id)
        .in('post_id', postIds),
      supabase
        .from('garage_post_saves')
        .select('post_id')
        .eq('user_id', session.user.id)
        .in('post_id', postIds),
    ])

    const likedIds = new Set((likesRes.data ?? []).map((r: any) => r.post_id))
    const savedIds = new Set((savesRes.data ?? []).map((r: any) => r.post_id))

    for (const post of posts) {
      post.user_liked = likedIds.has(post.id)
      post.user_saved = savedIds.has(post.id)
    }
  }

  return posts
}

export async function fetchPost(id: string): Promise<GaragePost | null> {
  const { data } = await supabase
    .from('garage_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (!data) return null

  const post = data as GaragePost

  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    const [likeRes, saveRes] = await Promise.all([
      supabase
        .from('garage_post_likes')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', session.user.id)
        .single(),
      supabase
        .from('garage_post_saves')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', session.user.id)
        .single(),
    ])
    post.user_liked = !!likeRes.data
    post.user_saved = !!saveRes.data
  }

  return post
}

// ─── Create Post ───────────────────────────────────────────────────────────

export async function createGaragePost(opts: {
  caption?: string
  mediaUris: { uri: string; type: 'photo' | 'video' }[]
  category?: string
  tags?: string[]
  onProgress?: (progress: number, status: string) => void
}): Promise<GaragePost> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const report = opts.onProgress ?? (() => {})
  const totalMedia = opts.mediaUris.length

  // Upload media using FormData (most reliable method for RN + Supabase)
  report(0.05, 'Preparing upload...')
  const media: MediaItem[] = []
  for (let i = 0; i < opts.mediaUris.length; i++) {
    const item = opts.mediaUris[i]
    report((i / totalMedia) * 0.7 + 0.05, `Uploading ${i + 1} of ${totalMedia}...`)
    try {
      const ext = item.uri.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${session.user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`
      const contentType = item.type === 'video' ? `video/${ext}` : `image/${ext}`

      const formData = new FormData()
      formData.append('', {
        uri: item.uri,
        name: path.split('/').pop(),
        type: contentType,
      } as any)

      const { error: uploadError } = await supabase.storage
        .from('garage-media')
        .upload(path, formData, { contentType: 'multipart/form-data', upsert: true })

      if (uploadError) {
        console.error('[GARAGE] Upload error:', uploadError.message)
      } else {
        const { data: urlData } = supabase.storage.from('garage-media').getPublicUrl(path)
        media.push({ url: urlData.publicUrl, type: item.type })
      }
    } catch (e: any) {
      console.error('[GARAGE] Upload exception:', e?.message ?? e)
    }
  }

  // Warn if no media uploaded despite having local files
  if (opts.mediaUris.length > 0 && media.length === 0) {
    throw new Error('Photos could not be uploaded. Please try again.')
  }

  report(0.8, 'Saving post...')

  // Get author name from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', session.user.id)
    .single()

  const authorName = profile?.name || session.user.email?.split('@')[0] || null

  const { data, error } = await supabase
    .from('garage_posts')
    .insert({
      author_id: session.user.id,
      author_name: authorName,
      caption: opts.caption ?? null,
      media,
      category: opts.category ?? null,
      tags: opts.tags ?? [],
    })
    .select()
    .single()

  if (error) throw error
  report(1, 'Done!')
  return data as GaragePost
}

// ─── Likes ─────────────────────────────────────────────────────────────────

export async function toggleLike(postId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('garage_post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', session.user.id)
    .single()

  if (existing) {
    await supabase.from('garage_post_likes').delete().eq('id', existing.id)
    return false
  } else {
    await supabase.from('garage_post_likes').insert({ post_id: postId, user_id: session.user.id })
    return true
  }
}

// ─── Comments ──────────────────────────────────────────────────────────────

export async function fetchComments(postId: string): Promise<GarageComment[]> {
  const { data } = await supabase
    .from('garage_post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(100)

  const comments = (data ?? []) as GarageComment[]

  // Backfill author names
  const missing = comments.filter((c) => !c.author_name)
  if (missing.length > 0) {
    const authorIds = [...new Set(missing.map((c) => c.author_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', authorIds)

    if (profiles) {
      const nameMap = new Map(profiles.map((p: any) => [p.id, p.name]))
      for (const c of comments) {
        if (!c.author_name) {
          c.author_name = nameMap.get(c.author_id) ?? null
        }
      }
    }
  }

  return comments
}

export async function addComment(postId: string, content: string): Promise<GarageComment> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  // Get author name
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', session.user.id)
    .single()

  const authorName = profile?.name || session.user.email?.split('@')[0] || null

  const { data, error } = await supabase
    .from('garage_post_comments')
    .insert({
      post_id: postId,
      author_id: session.user.id,
      author_name: authorName,
      content,
    })
    .select()
    .single()

  if (error) throw error
  return data as GarageComment
}

// ─── User Search (for @mentions) ───────────────────────────────────────────

export async function searchUsers(query: string): Promise<{ id: string; name: string }[]> {
  if (!query || query.length < 2) return []

  const { data } = await supabase
    .from('profiles')
    .select('id, name')
    .ilike('name', `%${query}%`)
    .limit(10)

  return (data ?? []).filter((p: any) => p.name).map((p: any) => ({
    id: p.id,
    name: p.name,
  }))
}

// ─── Saves / Bookmarks ────────────────────────────────────────────────────

export async function toggleSave(postId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('garage_post_saves')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', session.user.id)
    .single()

  if (existing) {
    await supabase.from('garage_post_saves').delete().eq('id', existing.id)
    return false
  } else {
    await supabase.from('garage_post_saves').insert({ post_id: postId, user_id: session.user.id })
    return true
  }
}

// ─── Delete Post ───────────────────────────────────────────────────────────

export async function deletePost(postId: string): Promise<void> {
  await supabase.from('garage_posts').delete().eq('id', postId)
}
