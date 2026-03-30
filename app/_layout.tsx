import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { supabase } from '../lib/supabase'
import { useChildStore } from '../store/useChildStore'
import { initRevenueCat } from '../lib/revenue'
import type { Session } from '@supabase/supabase-js'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasChild, setHasChild] = useState(false)
  const router = useRouter()
  const segments = useSegments()

  const setChild = useChildStore((s) => s.setChild)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session) {
        const { data } = await supabase.from('children').select('*').limit(1)
        if (data && data.length > 0) {
          setHasChild(true)
          const c = data[0]
          setChild({
            id: c.id,
            parentId: c.parent_id,
            name: c.name,
            birthDate: c.birth_date ?? '',
            weightKg: c.weight_kg ?? 0,
            heightCm: c.height_cm ?? 0,
            allergies: c.allergies ?? [],
            medications: c.medications ?? [],
            countryCode: c.country_code ?? 'US',
          })
        }
      }
      // Initialize RevenueCat with user ID for subscription tracking
      if (session?.user?.id) {
        initRevenueCat(session.user.id).catch(() => {})
      }

      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading) return

    const inAuth = segments[0] === '(auth)'

    if (!session && !inAuth) {
      router.replace('/(auth)/sign-in')
    } else if (session && !hasChild && segments[0] !== 'onboarding') {
      router.replace('/onboarding')
    } else if (session && hasChild && inAuth) {
      router.replace('/(tabs)')
    }
  }, [loading, session, hasChild, segments])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F4' }}>
        <ActivityIndicator size="large" color="#7BAE8E" />
      </View>
    )
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="pillar/[id]" />
      <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
    </Stack>
  )
}
