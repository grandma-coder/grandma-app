/**
 * Garage API — CRUD for marketplace listings + photo upload.
 */

import { supabase } from './supabase'

export interface GarageListing {
  id: string
  user_id: string
  title: string
  description: string | null
  category: string
  condition: string | null
  price: number
  is_free: boolean
  size_range: string | null
  age_range: string | null
  photos: string[]
  location: string | null
  status: string
  created_at: string
  // Joined
  seller_name?: string
}

export async function fetchListings(category?: string, search?: string): Promise<GarageListing[]> {
  let query = supabase
    .from('garage_listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50)

  if (category && category !== 'All') {
    query = query.eq('category', category)
  }
  if (search) {
    query = query.ilike('title', `%${search}%`)
  }

  const { data } = await query
  return (data ?? []) as GarageListing[]
}

export async function fetchListing(id: string): Promise<GarageListing | null> {
  const { data } = await supabase
    .from('garage_listings')
    .select('*')
    .eq('id', id)
    .single()
  return data as GarageListing | null
}

export async function createListing(listing: {
  title: string
  description?: string
  category: string
  condition?: string
  price: number
  is_free: boolean
  size_range?: string
  age_range?: string
  photos: string[]
  location?: string
}): Promise<GarageListing> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  // Upload photos to Supabase Storage
  const photoUrls: string[] = []
  for (const uri of listing.photos) {
    const ext = uri.split('.').pop() ?? 'jpg'
    const path = `${session.user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`

    const response = await fetch(uri)
    const blob = await response.blob()

    const { error: uploadError } = await supabase.storage
      .from('garage-photos')
      .upload(path, blob, { contentType: `image/${ext}` })

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('garage-photos').getPublicUrl(path)
      photoUrls.push(urlData.publicUrl)
    }
  }

  const { data, error } = await supabase
    .from('garage_listings')
    .insert({
      user_id: session.user.id,
      title: listing.title,
      description: listing.description ?? null,
      category: listing.category,
      condition: listing.condition ?? null,
      price: listing.is_free ? 0 : listing.price,
      is_free: listing.is_free,
      size_range: listing.size_range ?? null,
      age_range: listing.age_range ?? null,
      photos: photoUrls,
      location: listing.location ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as GarageListing
}

export async function updateListingStatus(id: string, status: string): Promise<void> {
  await supabase.from('garage_listings').update({ status }).eq('id', id)
}
