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
import { usePregnancyStore } from '../store/usePregnancyStore'
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
  // True when EVERY data query for the current session either timed out or
  // failed. In that state we keep the user where they are instead of
  // shoving them into onboarding — their data may exist in the DB, we
  // just couldn't reach it. The user can retry by reloading.
  const [loadFailed, setLoadFailed] = useState(false)
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
  // Boot path uses setModeUnsafe because the coerce below runs the same
  // tick as setBehaviors() — the guard would race against the just-set
  // enrolled list. Coerce safety is enforced manually below.
  const setMode = useModeStore((s) => s.setModeUnsafe)
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
    // Track the uid we're already loading for so the SIGNED_IN +
    // INITIAL_SESSION pair (which fires on every cold start) doesn't run
    // loadUserData twice.
    let inFlightUid: string | null = null
    // On cold boot, SIGNED_IN fires *before* Supabase finishes initializing
    // its PostgREST connection. Every query in that first burst hangs and
    // times out (~6s wasted). INITIAL_SESSION fires once the client is
    // truly ready and its queries succeed in <1s. So: ignore SIGNED_IN
    // until we've seen INITIAL_SESSION at least once.
    let sawInitialSession = false

    /**
     * Wrap a Supabase query in a per-query timeout. If any single query
     * hangs (RLS deadlock, stale schema cache, dead PostgREST socket),
     * we want to continue to the next query rather than blocking the
     * whole user-load flow. Returns the original result or a synthetic
     * timeout error.
     */
    async function withTimeout<T>(
      label: string,
      promise: PromiseLike<T>,
      ms = 4000,
    ): Promise<T | { data: null; error: { message: string; code: 'TIMEOUT' } }> {
      // Plain Promise.race leaks the setTimeout — once the query wins, the
      // timer still fires later and logs a misleading "TIMED OUT" warning.
      // Track who wins and clear the loser.
      let timer: ReturnType<typeof setTimeout> | null = null
      let settled = false
      try {
        const timeoutPromise = new Promise<{ data: null; error: { message: string; code: 'TIMEOUT' } }>((resolve) => {
          timer = setTimeout(() => {
            if (settled) return
            console.warn(`[auth] ${label} TIMED OUT after ${ms}ms (callSeq=${callSeq}) — likely RLS or schema-cache issue`)
            resolve({ data: null, error: { message: `${label} timed out after ${ms}ms`, code: 'TIMEOUT' } })
          }, ms)
        })
        const result = (await Promise.race([promise as Promise<T>, timeoutPromise])) as any
        settled = true
        return result
      } finally {
        if (timer) clearTimeout(timer)
      }
    }

    let callSeq = 0
    async function loadUserData(uid: string) {
      const callId = ++callSeq
      console.log(`[auth] loadUserData start #${callId} uid:`, uid)

      // The three independent queries (profile, child_caregivers, behaviors)
      // fire in parallel. If one hangs, it doesn't block the others — each
      // has its own 6s timeout. Children-fallback still depends on the
      // caregivers result, so it runs serially after.
      const [profileRes, linksRes, behRes] = await Promise.all([
        withTimeout(
          'profile query',
          // Intentionally narrow — only the columns the boot path *must*
          // have. `journey_mode` was previously fetched here but is
          // re-derivable from useModeStore (persisted) + the behaviors
          // table, and selecting a column the DB doesn't yet have makes
          // PostgREST error the whole query out and cascades the rest of
          // the boot into timeout. Keep this SELECT minimal.
          //
          // `due_date` is read so that a fresh install (no AsyncStorage
          // yet) still renders pregnancy home with the correct week
          // instead of falling back to week 1 indefinitely.
          supabase
            .from('profiles')
            .select('user_role, due_date')
            .eq('id', uid)
            .single(),
        ),
        withTimeout(
          'child_caregivers query',
          supabase
            .from('child_caregivers')
            .select('role, permissions, children(*)')
            .eq('user_id', uid)
            .eq('status', 'accepted'),
        ),
        withTimeout(
          'behaviors query',
          supabase.from('behaviors').select('type').eq('user_id', uid),
        ),
      ])

      if (cancelled) return

      // If ALL queries timed out, the network / DB / RLS is wedged and we
      // shouldn't pretend the user is fresh. The route guard reads
      // loadFailed and refuses to route into onboarding in that case.
      const profileTimedOut = (profileRes as any).error?.code === 'TIMEOUT'
      const linksTimedOut = (linksRes as any).error?.code === 'TIMEOUT'
      const behTimedOut = (behRes as any).error?.code === 'TIMEOUT'
      const allTimedOut = profileTimedOut && linksTimedOut && behTimedOut
      if (allTimedOut) {
        console.warn('[auth] every data query timed out — keeping user where they are, not routing to onboarding')
        setLoadFailed(true)
      } else {
        setLoadFailed(false)
      }

      // ─── Profile ─────────────────────────────────────────────────────
      const { data: profile, error: profileErr } = profileRes as any
      if (profileErr) {
        if (profileErr.code === 'PGRST116') {
          console.warn(`[auth] profile row MISSING for uid=${uid} — sign-up likely didn't seed it, or env points at a different DB`)
        } else if (profileErr.code !== 'TIMEOUT') {
          console.warn('[auth] profile load failed:', profileErr.message)
        }
      } else {
        console.log('[auth] profile loaded:', profile)
      }
      if (profile?.user_role) setUserRole(profile.user_role)
      // Active mode is resolved from useModeStore (persisted locally) +
      // the behaviors table below. We don't read it from profiles anymore
      // (see profile-query comment above).

      // Hydrate the pregnancy store from the DB if the local copy is
      // empty. Covers a fresh install where AsyncStorage hasn't seen this
      // user yet — without this, PregnancyHome would render week 1 until
      // the user re-enters their due date manually.
      if (profile?.due_date && !usePregnancyStore.getState().dueDate) {
        usePregnancyStore.getState().setDueDate(profile.due_date)
      }

      // ─── Behaviors (restore enrolled list from server if local is empty) ─
      const { data: dbBehaviors, error: behErr } = behRes as any
      if (behErr && behErr.code !== 'TIMEOUT') {
        console.warn('[auth] behaviors load failed:', behErr.message)
      } else if (!behErr) {
        console.log(`[auth] behaviors found: ${dbBehaviors?.length ?? 0}`)
      }
      const localBehaviors = useBehaviorStore.getState().enrolledBehaviors
      const serverTypes: ('pre-pregnancy' | 'pregnancy' | 'kids')[] =
        dbBehaviors?.map((b: any) =>
          b.type === 'cycle' ? 'pre-pregnancy' : b.type,
        ) ?? []
      if (localBehaviors.length === 0 && serverTypes.length > 0) {
        useBehaviorStore.getState().setBehaviors(serverTypes)
      }
      // Coerce active mode into something the user is actually enrolled in.
      // Prevents the home screen from rendering Kids when the user has
      // only Pregnancy enrolled (or vice versa) after a fresh install.
      const enrolledAfter = useBehaviorStore.getState().enrolledBehaviors
      const currentMode = useModeStore.getState().mode
      if (enrolledAfter.length > 0 && !enrolledAfter.includes(currentMode)) {
        setMode(enrolledAfter[0] as any)
      }

      // ─── Children via child_caregivers join ──────────────────────────
      const { data: links, error: linksErr } = linksRes as any
      if (linksErr && linksErr.code !== 'TIMEOUT') {
        console.warn('[auth] child_caregivers load failed:', linksErr.message)
      } else if (!linksErr) {
        console.log(`[auth] child_caregivers found: ${links?.length ?? 0}`)
      }

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
        const fallbackRes = await withTimeout(
          'children fallback query',
          supabase.from('children').select('*').eq('parent_id', uid),
        )
        const { data: ownChildren, error: ownErr } = fallbackRes as any
        if (ownErr && ownErr.code !== 'TIMEOUT') {
          console.warn('[auth] children fallback load failed:', ownErr.message)
        }
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
      // (behaviors already handled in the parallel batch above)

      initRevenueCat(uid).catch(() => {})
      runNotificationEngine().catch(() => {})
      syncBadgesFromSupabase().catch(() => {})
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`[auth] event=${event} hasSession=${!!newSession} uid=${newSession?.user?.id?.slice(0, 8) ?? 'null'}`)
        setSession(newSession)
        if (event === 'INITIAL_SESSION') sawInitialSession = true

        if (event === 'SIGNED_OUT' || !newSession) {
          console.log('[auth] no session — unblock loading, route guard will send to /(auth)/welcome')
          // Clear flags so signing back in starts from a fresh load state.
          inFlightUid = null
          setHasChildren(false)
          setUserRole('parent')
          setLoadFailed(false)
          setLoading(false)
          return
        }

        // On cold boot SIGNED_IN fires *before* the Supabase client is
        // actually ready to query PostgREST. Every request in that burst
        // hangs. Skip it — INITIAL_SESSION will fire moments later and is
        // the one that actually works. After we've seen INITIAL_SESSION
        // once, real sign-in events go through normally.
        if (event === 'SIGNED_IN' && !sawInitialSession) {
          console.log('[auth] skip premature SIGNED_IN — waiting for INITIAL_SESSION')
          return
        }

        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          const uid = newSession.user.id
          if (inFlightUid === uid) {
            console.log(`[auth] skip duplicate ${event} for uid=${uid.slice(0, 8)} — already loading`)
            return
          }
          inFlightUid = uid
          // Re-show the loading splash while we fetch profile / children /
          // behaviors. Without this, an in-session re-sign-in (after a
          // SIGNED_OUT set loading=false) would let the route guard run
          // with stale empty state — bouncing the returning user into
          // /onboarding/journey for a frame before snapping back to (tabs)
          // once loadUserData finishes. Showing the splash blocks the
          // guard until the real data is in.
          setLoading(true)
          try {
            await loadUserData(uid)
          } catch (e) {
            console.warn('[auth] loadUserData failed:', e)
          } finally {
            inFlightUid = null
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
      // When every data query timed out we don't know whether the user
      // genuinely has no data or whether the DB is unreachable. Stay on
      // the current screen rather than routing into onboarding — pushing
      // a returning user into onboarding here would either re-seed
      // duplicates or wipe their behavior store on continue.
      if (!loadFailed) {
        router.replace('/onboarding/journey')
      }
    } else if (session && hasCompletedOnboarding && inAuth) {
      router.replace('/(tabs)')
    }
  }, [loading, session, hasCompletedOnboarding, behaviorHydrated, segments, loadFailed])

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
