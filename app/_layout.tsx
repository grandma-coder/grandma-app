import { useEffect, useState } from 'react'
import { Stack, router } from 'expo-router'
import { supabase } from '../lib/supabase'

export default function RootLayout() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/(auth)/sign-in')
      } else {
        const { data: children } = await supabase
          .from('children')
          .select('id')
          .limit(1)
        if (!children || children.length === 0) {
          router.replace('/onboarding')
        } else {
          router.replace('/(tabs)')
        }
      }
      setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        router.replace('/(auth)/sign-in')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
    </Stack>
  )
}