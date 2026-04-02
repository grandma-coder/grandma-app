import { supabase } from './supabase'

export type ListingType = 'sell' | 'trade' | 'donate'
export type ListingCategory = 'clothing' | 'toys' | 'gear' | 'furniture' | 'books' | 'other'
export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair'
export type ListingStatus = 'available' | 'pending' | 'sold' | 'donated' | 'traded'

export interface Listing {
  id: string
  sellerId: string
  sellerEmail?: string
  title: string
  description?: string
  category: ListingCategory
  listingType: ListingType
  priceCents?: number
  condition?: ListingCondition
  ageRange?: string
  status: ListingStatus
  photos: string[]
  locationText?: string
  createdAt: string
  saveCount?: number
  commentCount?: number
}

export async function getListings(limit = 20, offset = 0): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('exchange_listings')
    .select('*')
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return (data ?? []).map(mapListing)
}

export async function getListingById(id: string): Promise<Listing> {
  const { data, error } = await supabase
    .from('exchange_listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return mapListing(data)
}

export async function createListing(input: {
  title: string
  description?: string
  category: ListingCategory
  listingType: ListingType
  priceCents?: number
  condition?: ListingCondition
  ageRange?: string
  photos?: string[]
  locationText?: string
}): Promise<Listing> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('exchange_listings')
    .insert({
      seller_id: user.id,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      listing_type: input.listingType,
      price_cents: input.priceCents ?? null,
      condition: input.condition ?? null,
      age_range: input.ageRange ?? null,
      photos: input.photos ?? [],
      location_text: input.locationText ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return mapListing(data)
}

export async function toggleSave(listingId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data: existing } = await supabase
    .from('exchange_saves')
    .select('id')
    .eq('listing_id', listingId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    await supabase.from('exchange_saves').delete().eq('id', existing.id)
    return false
  } else {
    await supabase.from('exchange_saves').insert({ listing_id: listingId, user_id: user.id })
    return true
  }
}

export async function addComment(listingId: string, content: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('exchange_comments')
    .insert({ listing_id: listingId, author_id: user.id, content })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getComments(listingId: string) {
  const { data, error } = await supabase
    .from('exchange_comments')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

function mapListing(d: any): Listing {
  return {
    id: d.id,
    sellerId: d.seller_id,
    title: d.title,
    description: d.description,
    category: d.category,
    listingType: d.listing_type,
    priceCents: d.price_cents,
    condition: d.condition,
    ageRange: d.age_range,
    status: d.status,
    photos: d.photos ?? [],
    locationText: d.location_text,
    createdAt: d.created_at,
  }
}
