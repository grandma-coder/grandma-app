/**
 * useProfile — reads the current user's profile row from Supabase `profiles` table.
 * Returns undefined if unauthenticated or profile row doesn't exist yet.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

export interface UserProfile {
  id: string
  user_id: string
  name: string | null
  dob: string | null
  photo_url: string | null
  location: string | null
  language: string | null
}

async function fetchProfile(): Promise<UserProfile | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  const session = sessionData.session
  if (!session) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, name, dob, photo_url, location, language')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (error) throw error
  return data as UserProfile | null
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    staleTime: 5 * 60 * 1000,
  })
}
