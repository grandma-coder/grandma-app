/**
 * useProfile — reads the current user's profile row from Supabase `profiles` table.
 * Returns undefined if unauthenticated or profile row doesn't exist yet.
 *
 * Query key is scoped to the user id to prevent cross-user cache leaks on sign-out/sign-in.
 */

import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
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

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, name, dob, photo_url, location, language')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as UserProfile | null
}

function useAuthUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])
  return userId
}

export function useProfile() {
  const userId = useAuthUserId()
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId as string),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}
