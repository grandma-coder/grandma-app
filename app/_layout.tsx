/**
 * Root Layout — Auth guard + providers
 *
 * Stack: React Native + Expo Router + TypeScript + NativeWind
 * Backend: Supabase Auth
 *
 * Redirects:
 * - Not logged in → (auth)/welcome
 * - Logged in, no enrolled behaviors & no children → onboarding/journey
 * - Logged in, has enrolled behaviors or children → (tabs)
 */

import { useEffect, useState } from 'react'
import { Text as RNText, TextInput as RNTextInput } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Font from 'expo-font'
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold'
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif/400Regular_Italic'
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular'
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium'
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold'
import { supabase } from '../lib/supabase'
import { useChildStore } from '../store/useChildStore'
import { useModeStore } from '../store/useModeStore'
import { useBehaviorStore } from '../store/useBehaviorStore'
import { initRevenueCat } from '../lib/revenue'
import { runNotificationEngine } from '../lib/notificationEngine'
import { syncBadgesFromSupabase } from '../lib/badgeSync'
import { ThemeProvider } from '../components/ui/ThemeProvider'
import { BrandedLoader } from '../components/ui/BrandedLoader'
import { DevPanelProvider } from '../context/DevPanelContext'
import { SavedToastProvider } from '../components/ui/SavedToast'
import type { Session } from '@supabase/supabase-js'
import type { ChildWithRole, CaregiverPermissions } from '../types'

const queryClient = new QueryClient()

/**
 * Set the default font family on every <Text> and <TextInput> once
 * the redesign fonts are loaded. Individual screens can still override
 * via `fontFamily` to use Fraunces (display) or Instrument Serif (italic).
 */
function applyDefaultFontFamily() {
  const Text = RNText as any
  const TextInput = RNTextInput as any
  Text.defaultProps = Text.defaultProps || {}
  Text.defaultProps.style = [
    { fontFamily: 'DMSans_400Regular' },
    Text.defaultProps.style,
  ]
  TextInput.defaultProps = TextInput.defaultProps || {}
  TextInput.defaultProps.style = [
    { fontFamily: 'DMSans_400Regular' },
    TextInput.defaultProps.style,
  ]
}

const DEFAULT_PERMISSIONS: CaregiverPermissions = { view: true, log_activity: true, chat: true }

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasChildren, setHasChildren] = useState(false)
  const [userRole, setUserRole] = useState<string>('parent')
  const [fontsLoaded] = Font.useFonts({
    Fraunces_600SemiBold,
    InstrumentSerif_400Regular_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  })

  // Apply DM Sans as the default for every Text / TextInput once fonts load.
  useEffect(() => {
    if (fontsLoaded) applyDefaultFontFamily()
  }, [fontsLoaded])

  const router = useRouter()
  const segments = useSegments()

  const setChildren = useChildStore((s) => s.setChildren)
  const setMode = useModeStore((s) => s.setMode)
  const enrolledBehaviors = useBehaviorStore((s) => s.enrolledBehaviors)
  const behaviorHydrated = useBehaviorStore((s) => s.hydrated)

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
                sex: c.sex ?? '',
                bloodType: c.blood_type ?? '',
                allergies: c.allergies ?? [],
                medications: c.medications ?? [],
                conditions: c.conditions ?? [],
                dietaryRestrictions: c.dietary_restrictions ?? [],
                preferredFoods: c.preferred_foods ?? [],
                dislikedFoods: c.disliked_foods ?? [],
                pediatrician: c.pediatrician ?? null,
                notes: c.notes ?? '',
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
              sex: c.sex ?? '',
              bloodType: c.blood_type ?? '',
              allergies: c.allergies ?? [],
              medications: c.medications ?? [],
              conditions: c.conditions ?? [],
              dietaryRestrictions: c.dietary_restrictions ?? [],
              preferredFoods: c.preferred_foods ?? [],
              dislikedFoods: c.disliked_foods ?? [],
              pediatrician: c.pediatrician ?? null,
              notes: c.notes ?? '',
              countryCode: c.country_code ?? 'US',
              caregiverRole: 'parent' as const,
              permissions: DEFAULT_PERMISSIONS,
            }))
            setChildren(mapped)
            setHasChildren(true)
          }
        }

        // Restore enrolled behaviors from Supabase if local store is empty
        // (handles app reinstall / cleared storage scenarios)
        const localBehaviors = useBehaviorStore.getState().enrolledBehaviors
        if (localBehaviors.length === 0) {
          const { data: dbBehaviors } = await supabase
            .from('behaviors')
            .select('type')
            .eq('user_id', session.user.id)
            .eq('active', true)
          if (dbBehaviors && dbBehaviors.length > 0) {
            const types = dbBehaviors.map((b: any) => b.type === 'cycle' ? 'pre-pregnancy' : b.type)
            useBehaviorStore.getState().setBehaviors(types)
          }
        }

        if (session.user.id) {
          initRevenueCat(session.user.id).catch(() => {})
          // Generate smart notifications on app open (deduped per day)
          runNotificationEngine().catch(() => {})
          // Sync badges from real activity data
          syncBadgesFromSupabase().catch(() => {})
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
  // Onboarding is complete when user has enrolled behaviors (works for all
  // journey types: kids, pregnancy, pre-pregnancy) OR has children in DB.
  const hasCompletedOnboarding = enrolledBehaviors.length > 0 || hasChildren

  useEffect(() => {
    if (loading || !behaviorHydrated) return

    const inAuth = segments[0] === '(auth)'

    if (!session && !inAuth) {
      router.replace('/(auth)/welcome')
    } else if (session && !hasCompletedOnboarding && segments[0] !== 'onboarding') {
      router.replace('/onboarding/journey')
    } else if (session && hasCompletedOnboarding && inAuth) {
      router.replace('/(tabs)')
    }
  }, [loading, session, hasCompletedOnboarding, behaviorHydrated, segments])

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading || !behaviorHydrated || !fontsLoaded) {
    return <LoadingScreen />
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <DevPanelProvider>
        <SavedToastProvider>
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
        </SavedToastProvider>
        </DevPanelProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

function LoadingScreen() {
  return <BrandedLoader fullscreen />
}
