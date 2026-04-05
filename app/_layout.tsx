/**
 * Root Layout — Auth guard + providers
 *
 * Stack: React Native + Expo Router + TypeScript + NativeWind
 * Backend: Supabase Auth
 *
 * Redirects:
 * - Not logged in → (auth)/welcome
 * - Logged in, no children → onboarding/journey
 * - Logged in, has children → (tabs)
 */

import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useChildStore } from '../store/useChildStore'
import { useModeStore } from '../store/useModeStore'
import { initRevenueCat } from '../lib/revenue'
import { ThemeProvider } from '../components/ui/ThemeProvider'
import { useTheme } from '../constants/theme'
import { DevPanelProvider } from '../context/DevPanelContext'
import type { Session } from '@supabase/supabase-js'
import type { ChildWithRole, CaregiverPermissions } from '../types'

const queryClient = new QueryClient()

const DEFAULT_PERMISSIONS: CaregiverPermissions = { view: true, log_activity: true, chat: true }

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasChildren, setHasChildren] = useState(false)
  const [userRole, setUserRole] = useState<string>('parent')
  const router = useRouter()
  const segments = useSegments()

  const setChildren = useChildStore((s) => s.setChildren)
  const setMode = useModeStore((s) => s.setMode)

  // ─── Auth listener ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session) {
        // Load user profile role + journey mode
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_role, journey_mode')
          .eq('id', session.user.id)
          .single()
        if (profile?.user_role) setUserRole(profile.user_role)
        if (profile?.journey_mode) {
          setMode(profile.journey_mode as any)
        }

        // Load all children accessible via child_caregivers
        const { data: links } = await supabase
          .from('child_caregivers')
          .select('role, permissions, children(*)')
          .eq('user_id', session.user.id)
          .eq('status', 'accepted')

        if (links && links.length > 0) {
          const mapped: ChildWithRole[] = links
            .filter((l: any) => l.children)
            .map((l: any) => {
              const c = l.children
              return {
                id: c.id,
                parentId: c.parent_id,
                name: c.name,
                birthDate: c.birth_date ?? '',
                weightKg: c.weight_kg ?? 0,
                heightCm: c.height_cm ?? 0,
                allergies: c.allergies ?? [],
                medications: c.medications ?? [],
                countryCode: c.country_code ?? 'US',
                caregiverRole: l.role,
                permissions: l.permissions ?? DEFAULT_PERMISSIONS,
              }
            })
          setChildren(mapped)
          setHasChildren(true)
        } else {
          // Fallback: load own children directly
          const { data: ownChildren } = await supabase
            .from('children')
            .select('*')
            .eq('parent_id', session.user.id)
          if (ownChildren && ownChildren.length > 0) {
            const mapped: ChildWithRole[] = ownChildren.map((c: any) => ({
              id: c.id,
              parentId: c.parent_id,
              name: c.name,
              birthDate: c.birth_date ?? '',
              weightKg: c.weight_kg ?? 0,
              heightCm: c.height_cm ?? 0,
              allergies: c.allergies ?? [],
              medications: c.medications ?? [],
              countryCode: c.country_code ?? 'US',
              caregiverRole: 'parent' as const,
              permissions: DEFAULT_PERMISSIONS,
            }))
            setChildren(mapped)
            setHasChildren(true)
          }
        }

        if (session.user.id) {
          initRevenueCat(session.user.id).catch(() => {})
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // ─── Route guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return

    const inAuth = segments[0] === '(auth)'

    if (!session && !inAuth) {
      router.replace('/(auth)/welcome')
    } else if (session && !hasChildren && segments[0] !== 'onboarding') {
      router.replace('/onboarding/journey')
    } else if (session && hasChildren && inAuth) {
      router.replace('/(tabs)')
    }
  }, [loading, session, hasChildren, segments])

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return <LoadingScreen />
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <DevPanelProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="pillar/[id]" />
          <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
          <Stack.Screen name="manage-caregivers" />
          <Stack.Screen name="invite-caregiver" options={{ presentation: 'modal' }} />
          <Stack.Screen name="accept-invite" />
          <Stack.Screen name="child-picker" options={{ presentation: 'modal' }} />
          <Stack.Screen name="airtag-setup" options={{ presentation: 'modal' }} />
          <Stack.Screen name="birth-plan" />
          <Stack.Screen name="channels" />
          <Stack.Screen name="exchange" />
          <Stack.Screen name="insights" />
          <Stack.Screen name="grandma-talk" options={{ presentation: 'modal' }} />
          <Stack.Screen name="profile" />
          <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
          <Stack.Screen name="connections" />
          <Stack.Screen name="garage" />
          <Stack.Screen name="channel" />
        </Stack>
        </DevPanelProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

function LoadingScreen() {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )
}
