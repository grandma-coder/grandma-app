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
import { QueryClientProvider } from '@tanstack/react-query'
import * as Font from 'expo-font'
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold'
import { Fraunces_700Bold } from '@expo-google-fonts/fraunces/700Bold'
import { Fraunces_800ExtraBold } from '@expo-google-fonts/fraunces/800ExtraBold'
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif/400Regular_Italic'
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular'
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium'
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold'
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold'
// ─── Affirmation share templates — extra display/handwriting/mono fonts ───
import { AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface/400Regular'
import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black/400Regular'
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue/400Regular'
import { Caveat_500Medium } from '@expo-google-fonts/caveat/500Medium'
import { Caveat_700Bold } from '@expo-google-fonts/caveat/700Bold'
import { IBMPlexSerif_400Regular_Italic } from '@expo-google-fonts/ibm-plex-serif/400Regular_Italic'
import { IBMPlexSerif_600SemiBold } from '@expo-google-fonts/ibm-plex-serif/600SemiBold'
import { LibreCaslonText_400Regular_Italic } from '@expo-google-fonts/libre-caslon-text/400Regular_Italic'
import { Monoton_400Regular } from '@expo-google-fonts/monoton/400Regular'
import { PermanentMarker_400Regular } from '@expo-google-fonts/permanent-marker/400Regular'
import { PlayfairDisplay_700Bold_Italic } from '@expo-google-fonts/playfair-display/700Bold_Italic'
import { PlayfairDisplay_900Black_Italic } from '@expo-google-fonts/playfair-display/900Black_Italic'
import { Shrikhand_400Regular } from '@expo-google-fonts/shrikhand/400Regular'
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono/400Regular'
import { SpaceMono_700Bold } from '@expo-google-fonts/space-mono/700Bold'
import { UnicaOne_400Regular } from '@expo-google-fonts/unica-one/400Regular'
import { YesevaOne_400Regular } from '@expo-google-fonts/yeseva-one/400Regular'
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
import { DevModeBanner } from '../components/ui/DevModeBanner'
import type { Session } from '@supabase/supabase-js'
import type { ChildWithRole, CaregiverPermissions } from '../types'

import { queryClient } from '../lib/queryClient'

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
    Fraunces_700Bold,
    Fraunces_800ExtraBold,
    InstrumentSerif_400Regular_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    AbrilFatface_400Regular,
    ArchivoBlack_400Regular,
    BebasNeue_400Regular,
    Caveat_500Medium,
    Caveat_700Bold,
    IBMPlexSerif_400Regular_Italic,
    IBMPlexSerif_600SemiBold,
    LibreCaslonText_400Regular_Italic,
    Monoton_400Regular,
    PermanentMarker_400Regular,
    PlayfairDisplay_700Bold_Italic,
    PlayfairDisplay_900Black_Italic,
    Shrikhand_400Regular,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
    UnicaOne_400Regular,
    YesevaOne_400Regular,
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
  //
  // One code path loads user data, driven by onAuthStateChange:
  //   - INITIAL_SESSION fires on subscribe with the stored session (cold start).
  //   - SIGNED_IN fires after sign-in / sign-up / OAuth return.
  //   - SIGNED_OUT clears state.
  //
  // Previously we had a parallel getSession() chain racing the listener — on
  // OAuth returns that meant route-guard could fire before profile / children
  // / behaviors were loaded, redirecting returning users back to onboarding.
  useEffect(() => {
    let cancelled = false

    async function loadUserData(uid: string) {
      console.log('[auth] loadUserData start uid:', uid)

      // Profile: user_role + journey_mode. Errors are non-fatal but logged.
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('user_role, journey_mode')
        .eq('id', uid)
        .single()
      if (profileErr) {
        // PGRST116 = no rows returned. This means the profile row is missing
        // for an authenticated user — most likely the row was never created
        // on sign-up, OR the user signed up against a different Supabase
        // project than the one currently configured. Surface it loudly so
        // the symptom (empty profile + no data) maps to the cause.
        if (profileErr.code === 'PGRST116') {
          console.warn(`[auth] profile row MISSING for uid=${uid} — sign-up likely didn't seed it, or env points at a different DB`)
        } else {
          console.warn('[auth] profile load failed:', profileErr.message)
        }
      } else {
        console.log('[auth] profile loaded:', profile)
      }
      if (cancelled) return
      if (profile?.user_role) setUserRole(profile.user_role)
      if (profile?.journey_mode) setMode(profile.journey_mode as any)

      // Children via child_caregivers join.
      const { data: links, error: linksErr } = await supabase
        .from('child_caregivers')
        .select('role, permissions, children(*)')
        .eq('user_id', uid)
        .eq('status', 'accepted')
      if (linksErr) console.warn('[auth] child_caregivers load failed:', linksErr.message)
      else console.log(`[auth] child_caregivers found: ${links?.length ?? 0}`)
      if (cancelled) return

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
              photoUrl: c.photo_url ?? null,
              caregiverRole: l.role,
              permissions: l.permissions ?? DEFAULT_PERMISSIONS,
            }
          })
        setChildren(mapped)
        setHasChildren(true)
      } else {
        // Fallback: own children directly.
        const { data: ownChildren, error: ownErr } = await supabase
          .from('children')
          .select('*')
          .eq('parent_id', uid)
        if (ownErr) console.warn('[auth] children fallback load failed:', ownErr.message)
        if (cancelled) return
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
            photoUrl: c.photo_url ?? null,
            caregiverRole: 'parent' as const,
            permissions: DEFAULT_PERMISSIONS,
          }))
          setChildren(mapped)
          setHasChildren(true)
          console.log(`[auth] fallback children loaded: ${ownChildren.length}`)
        } else {
          console.log('[auth] no children found via fallback either — user has zero kids in this DB')
        }
      }

      // Restore enrolled behaviors from Supabase if local store is empty
      // (handles app reinstall / cleared storage scenarios).
      const localBehaviors = useBehaviorStore.getState().enrolledBehaviors
      if (localBehaviors.length === 0) {
        const { data: dbBehaviors, error: behErr } = await supabase
          .from('behaviors')
          .select('type')
          .eq('user_id', uid)
        if (behErr) console.warn('[auth] behaviors load failed:', behErr.message)
        else console.log(`[auth] behaviors found: ${dbBehaviors?.length ?? 0}`)
        if (cancelled) return
        if (dbBehaviors && dbBehaviors.length > 0) {
          const types = dbBehaviors.map((b: any) =>
            b.type === 'cycle' ? 'pre-pregnancy' : b.type
          )
          useBehaviorStore.getState().setBehaviors(types)
        }
      }

      initRevenueCat(uid).catch(() => {})
      runNotificationEngine().catch(() => {})
      syncBadgesFromSupabase().catch(() => {})
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`[auth] event=${event} hasSession=${!!newSession} uid=${newSession?.user?.id?.slice(0, 8) ?? 'null'}`)
        setSession(newSession)
        if (event === 'SIGNED_OUT' || !newSession) {
          console.log('[auth] no session — unblock loading, route guard will send to /(auth)/welcome')
          setLoading(false)
          return
        }
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          try {
            await loadUserData(newSession.user.id)
          } catch (e) {
            console.warn('[auth] loadUserData failed:', e)
          }
          if (!cancelled) setLoading(false)
        }
      }
    )

    // Safety net: if onAuthStateChange never fires (e.g. Supabase client
    // can't reach the storage adapter, network is dead, or a query in
    // loadUserData hangs silently), unblock the loading screen after
    // 10s so the user lands on /auth/welcome instead of staring at the
    // spinner forever. Without this the app appears bricked on a stuck
    // launch — see #stuck-on-loading reports.
    const safety = setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 10000)

    return () => {
      cancelled = true
      clearTimeout(safety)
      subscription.unsubscribe()
    }
  }, [setChildren, setMode])

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
          <Stack.Screen name="insights" />
          <Stack.Screen name="grandma-talk" options={{ presentation: 'modal' }} />
          <Stack.Screen name="profile" />
          <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
          <Stack.Screen name="connections" />
        </Stack>
        <DevModeBanner />
        </SavedToastProvider>
        </DevPanelProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

function LoadingScreen() {
  return <BrandedLoader fullscreen />
}
