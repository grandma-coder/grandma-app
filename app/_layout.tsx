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

import '../lib/sentry' // first: crash reporting before anything else can throw
import { AnimatedSplash } from '../components/ui/AnimatedSplash'
import { RootErrorScreen } from '../components/ui/RootErrorScreen'
import '../lib/fontDefaults' // first: default Hanken on StyleSheet text styles
import { useCallback, useEffect, useRef, useState } from 'react'
import { Text as RNText, TextInput as RNTextInput, AppState, View, StyleSheet, Alert } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClientProvider } from '@tanstack/react-query'
import * as Font from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
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
// ─── Diffuse (design-system-v3) fonts — ADDITIVE, opt-in variant ───
// Space Mono (the Diffuse "data" voice) is already loaded above.
import { CormorantGaramond_300Light } from '@expo-google-fonts/cormorant-garamond/300Light'
import { CormorantGaramond_400Regular } from '@expo-google-fonts/cormorant-garamond/400Regular'
import { CormorantGaramond_500Medium } from '@expo-google-fonts/cormorant-garamond/500Medium'
import { CormorantGaramond_400Regular_Italic } from '@expo-google-fonts/cormorant-garamond/400Regular_Italic'
import { HankenGrotesk_300Light } from '@expo-google-fonts/hanken-grotesk/300Light'
import { HankenGrotesk_400Regular } from '@expo-google-fonts/hanken-grotesk/400Regular'
import { HankenGrotesk_500Medium } from '@expo-google-fonts/hanken-grotesk/500Medium'
import { HankenGrotesk_600SemiBold } from '@expo-google-fonts/hanken-grotesk/600SemiBold'
import { HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk/700Bold'
import { HankenGrotesk_700Bold_Italic } from '@expo-google-fonts/hanken-grotesk/700Bold_Italic'
import { supabase } from '../lib/supabase'
import { useChildStore } from '../store/useChildStore'
import { restoreJourneys } from '../lib/restoreJourneys'
import { useWidgetPublisher } from '../hooks/useWidgetPublisher'
import { clearWidgets } from '../lib/widgets/publish'
import { useQuickActionRouting } from 'expo-quick-actions/router'
import { useModeStore } from '../store/useModeStore'
import { useBehaviorStore, behaviorFromDbType } from '../store/useBehaviorStore'
import { useConsentStore } from '../store/useConsentStore'
import { useAppLockStore } from '../store/useAppLockStore'
import { hasPin, isBiometricInFlight } from '../lib/appLock'
import { appLockTransition } from '../lib/appLockGate'
import LockScreen from './lock'
import { useCaregiverStore } from '../store/useCaregiverStore'
import { usePregnancyStore } from '../store/usePregnancyStore'
import { useMenopauseStore } from '../store/useMenopauseStore'
import { useDevStore } from '../store/useDevStore'
import { initRevenueCat } from '../lib/revenue'
import { runNotificationEngine } from '../lib/notificationEngine'
import { hydrateDailyQuestions } from '../lib/dailyMessage'
import { hydrateBirthTopics } from '../lib/birthGuideData'
import { loadRemoteFlags } from '../lib/remoteFlags'
import { initNotifications } from '../lib/pushNotifications'
import { syncBadgesFromSupabase } from '../lib/badgeSync'
import { ThemeProvider } from '../components/ui/ThemeProvider'
import { DevPanelProvider } from '../context/DevPanelContext'
import { SavedToastProvider } from '../components/ui/SavedToast'
import { DevModeBanner } from '../components/ui/DevModeBanner'
import { ConnectionBanner } from '../components/ui/ConnectionBanner'
import type { Session } from '@supabase/supabase-js'
import type { ChildWithRole, CaregiverPermissions } from '../types'

import { queryClient } from '../lib/queryClient'
import { registerUserDataReloader } from '../lib/userDataReload'
import { consumePendingInvite } from '../lib/pendingInvite'
import { clearLocalAccountData, registerLocalSignOutHandler } from '../lib/signOut'
import { claimDeviceAccount } from '../lib/accountSwitch'
import { parseAuthRedirect } from '../lib/authRedirect'
import { authEventLoads } from '../lib/authEvents'
import { reloadUserData } from '../lib/userDataReload'
import { authErrorText } from '../lib/authError'
import { t as translate } from '../lib/i18n'
import * as Linking from 'expo-linking'
import { font, useTheme, useDiffuseTheme } from '../constants/theme'
import { useIsDiffuse } from '../components/ui/diffuse/DiffuseKit'
import {
  ThemeProvider as NavThemeProvider,
  DefaultTheme as NavDefaultTheme,
  DarkTheme as NavDarkTheme,
} from '@react-navigation/native'

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
    { fontFamily: font.body },
    Text.defaultProps.style,
  ]
  TextInput.defaultProps = TextInput.defaultProps || {}
  TextInput.defaultProps.style = [
    { fontFamily: font.body },
    TextInput.defaultProps.style,
  ]
}

const DEFAULT_PERMISSIONS: CaregiverPermissions = { view: true, log_activity: true, chat: true }

// Hold the native splash from the very first module tick until the JS app is
// actually ready to render its first screen (fonts + store hydration + auth
// resolved). Without this the native splash auto-hides immediately on launch —
// before the bundle/fonts/auth are ready — leaving a blank/mismatched frame
// between the splash and the first real screen. Called at module scope so it
// runs before React ever mounts. A short cross-fade smooths the hand-off.
SplashScreen.preventAutoHideAsync().catch(() => {})
SplashScreen.setOptions({ duration: 260, fade: true })

// Dev-only trace logger for the auth boot flow. Informational flow/count logs
// spam production on every cold boot + auth event, so gate them behind __DEV__.
// Genuine failures stay on console.warn/console.error (always visible).
const authLog = (...args: unknown[]) => { if (__DEV__) console.log(...args) }

/** Any render error below the root shows a calm "try again" screen instead of a blank app. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return <RootErrorScreen error={error} retry={retry} />
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  // Boot gate: holds the native splash until the first auth answer + data load.
  const [loading, setLoading] = useState(true)
  // Data load after boot (sign-in, sign-up, OAuth return, email-confirm link): only pauses the route
  // guard. Re-using `loading` for it unmounted the whole navigator — a blank frame on every sign-in,
  // and (via USER_UPDATED) whenever a signed-in user changed their password.
  const [userLoading, setUserLoading] = useState(false)
  // Home-screen widgets + icon shortcuts follow the signed-in account's data (not while it loads —
  // the previous account's stores may still be in memory until the account-switch wipe runs).
  useWidgetPublisher(!!session && !loading && !userLoading)
  const [hasChildren, setHasChildren] = useState(false)
  // App-icon shortcuts carry a grandma-app://log/... path (see lib/widgets/quickActions).
  useQuickActionRouting()
  const setAccountRole = useCaregiverStore((s) => s.setAccountRole)
  const clearCaregiver = useCaregiverStore((s) => s.clear)
  // True when EVERY data query for the current session either timed out or
  // failed. In that state we keep the user where they are instead of
  // shoving them into onboarding — their data may exist in the DB, we
  // just couldn't reach it. The user can retry by reloading.
  const [loadFailed, setLoadFailed] = useState(false)
  // True between a PASSWORD_RECOVERY deep-link and the user finishing (or
  // abandoning) the reset. While true, the route guard must NOT bounce the
  // recovery session into (tabs) — the user needs to stay on the reset screen.
  const [recoveryMode, setRecoveryMode] = useState(false)

  // React Navigation's stock theme paints EVERY navigator surface with its
  // default background (rgb 242,242,242 light / near-black dark) — including the
  // per-tab `Background` inside bottom-tabs, which shows in the transparent
  // floating tab bar's safe-area gutter. expo-router mounts its NavigationContainer
  // with no theme, so we install one here whose `background`/`card` = the active
  // variant's canvas; that reaches every `useTheme()` consumer (stack scenes AND
  // the bottom-tabs Background). Hooks read from useThemeStore, valid at root.
  const isDiffuseVariant = useIsDiffuse()
  const current = useTheme()
  const diffuseTheme = useDiffuseTheme()
  const isDarkVariant = isDiffuseVariant ? diffuseTheme.isDark : current.isDark
  const canvasBg = isDiffuseVariant ? diffuseTheme.colors.bg : current.colors.bg
  const canvasCard = isDiffuseVariant ? diffuseTheme.colors.surface : current.colors.surface
  const navBase = isDarkVariant ? NavDarkTheme : NavDefaultTheme
  const navTheme = {
    ...navBase,
    colors: { ...navBase.colors, background: canvasBg, card: canvasCard },
  }

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
    // Diffuse (v3) families
    CormorantGaramond_300Light,
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_400Regular_Italic,
    HankenGrotesk_300Light,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_700Bold_Italic,
    // Site look (Nov 2026): the grandma.app hand-lettered face, vendored (OFL) — assets/fonts
    ArchitectsDaughter_400Regular: require('../assets/fonts/ArchitectsDaughter-Regular.ttf'),
  })

  // Apply DM Sans as the default for every Text / TextInput once fonts load.
  useEffect(() => {
    if (fontsLoaded) applyDefaultFontFamily()
  }, [fontsLoaded])

  const router = useRouter()
  const segments = useSegments()
  // Dev panel launches auth/onboarding previews via router.push after calling
  // enterDevMode(). The route guard below would otherwise bounce a logged-in
  // user straight back to (tabs) (or into onboarding), making those previews
  // un-openable. While dev mode is active, stand down.
  const devActive = useDevStore((s) => s.active)

  const setChildren = useChildStore((s) => s.setChildren)
  const enrolledBehaviors = useBehaviorStore((s) => s.enrolledBehaviors)
  const behaviorHydrated = useBehaviorStore((s) => s.hydrated)
  // Gate rendering on mode hydration too — otherwise the tab layout renders
  // once with the default mode ('kids') before AsyncStorage restores the real
  // one, flashing the wrong tabs/pillars for a frame.
  const modeHydrated = useModeStore((s) => s.hydrated)
  // Phase 1 consent gate — has the user agreed to health-data processing?
  const hasConsented = useConsentStore((s) => s.consentedAt !== null)
  const consentHydrated = useConsentStore((s) => s.hydrated)

  // Phase 1 WS2d — app-lock. When enabled, the lock overlay covers the app while
  // `locked` is true; re-lock when the app returns from background.
  const lockEnabled = useAppLockStore((s) => s.enabled)
  const lockHydrated = useAppLockStore((s) => s.hydrated)
  const isLocked = useAppLockStore((s) => s.locked)

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
    // Account whose data is loaded; a recovery session in progress; whether boot has finished.
    let loadedUid: string | null = null
    let recovering = false
    let bootDone = false

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
      // Truncate the uid — don't emit full auth UUIDs in production logs.
      authLog(`[auth] loadUserData start #${callId} uid:`, uid.slice(0, 8))

      // A different account than the one this device's local data belongs to (the previous
      // session ended without signOut(): expired/revoked token, global sign-out elsewhere). Its
      // journeys, due date, children, PIN and reminders are still in the stores — and
      // restoreJourneys below keeps local enrollment over the server's — so clear them first.
      if (await claimDeviceAccount(uid)) {
        console.warn('[auth] different account than last time on this device — clearing its local data')
        setHasChildren(false)
        await clearLocalAccountData().catch((e) => console.warn('[auth] local data clear failed:', e))
      }
      if (cancelled) return

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
            .select('user_role, due_date, menopause_stage, last_period_date')
            .eq('id', uid)
            .single(),
        ),
        withTimeout(
          'child_caregivers query',
          // Use the SECURITY DEFINER RPC instead of embedding children(*):
          // it masks sensitive PHI columns (blood_type/conditions/medications/
          // allergies/pediatrician) for caregivers who lack emergency/edit_child,
          // and already filters to accepted, non-locked, non-paused links scoped
          // to auth.uid(). Returns flat rows (role/permissions + child columns).
          supabase.rpc('get_caregiver_children'),
        ),
        withTimeout(
          'behaviors query',
          // `active` = false marks an ended journey (baby arrived, cycle tracking ended) — its
          // logs stay, but it must not come back as an enrolled journey on a fresh install.
          supabase.from('behaviors').select('type, active').eq('user_id', uid),
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
      // Journeys and children decide "has this user onboarded?". If either read failed (not just
      // when all three timed out), an empty result is unknown, not "new user" — routing a returning
      // user into onboarding then re-inserts their children and logs as duplicates.
      const onboardingSignalFailed = !!(linksRes as any).error || !!(behRes as any).error
      if (allTimedOut || onboardingSignalFailed) {
        console.warn('[auth] journeys/children read failed — keeping user where they are, not routing to onboarding')
        setLoadFailed(true)
      } else {
        setLoadFailed(false)
      }

      // ─── Profile ─────────────────────────────────────────────────────
      const { data: profile, error: profileErr } = profileRes as any
      if (profileErr) {
        if (profileErr.code === 'PGRST116') {
          // No profiles row (sign-up doesn't create one; only some onboardings upsert it). Create the
          // empty row so screens that read/update profiles (name, privacy, units…) work for new users.
          console.warn(`[auth] profile row missing for uid=${uid} — creating it`)
          void supabase.from('profiles').upsert({ id: uid }, { onConflict: 'id', ignoreDuplicates: true })
            .then(({ error }) => { if (error) console.warn('[auth] profile seed failed:', error.message) })
        } else if (profileErr.code !== 'TIMEOUT') {
          console.warn('[auth] profile load failed:', profileErr.message)
        }
      } else {
        // The full profile row carries PII (name, due_date, health notes) — only
        // dump it in dev; in prod just confirm the load succeeded.
        if (__DEV__) console.log('[auth] profile loaded:', profile)
      }
      if (profile?.user_role) setAccountRole(profile.user_role)
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
      // Same for the menopause stage: it is the menopause journey's "onboarded"
      // marker (lib/modeReadiness), so a fresh install must not lose it.
      if (profile?.menopause_stage && !useMenopauseStore.getState().stage) {
        useMenopauseStore.getState().setStage(profile.menopause_stage)
      }
      // …and the last period date, which drives the months-since counter and the 12-month offer.
      if (profile?.last_period_date && !useMenopauseStore.getState().lastPeriodDate) {
        useMenopauseStore.getState().setLastPeriodDate(profile.last_period_date)
      }

      // ─── Behaviors (restore enrolled list from server if local is empty) ─
      const { data: dbBehaviors, error: behErr } = behRes as any
      if (behErr && behErr.code !== 'TIMEOUT') {
        console.warn('[auth] behaviors load failed:', behErr.message)
      } else if (!behErr) {
        authLog(`[auth] behaviors found: ${dbBehaviors?.length ?? 0}`)
      }
      const serverTypes: ('pre-pregnancy' | 'pregnancy' | 'kids' | 'menopause')[] =
        dbBehaviors?.filter((b: any) => b.active !== false).map((b: any) => behaviorFromDbType(b.type)) ?? []
      // Restore enrollment if the device has none, coerce the active mode into an
      // enrolled journey, and keep the journey switcher on that same journey.
      restoreJourneys(serverTypes)

      // ─── Children via child_caregivers join ──────────────────────────
      const { data: links, error: linksErr } = linksRes as any
      if (linksErr && linksErr.code !== 'TIMEOUT') {
        console.warn('[auth] child_caregivers load failed:', linksErr.message)
      } else if (!linksErr) {
        authLog(`[auth] child_caregivers found: ${links?.length ?? 0}`)
      }

      if (links && links.length > 0) {
        // get_caregiver_children returns flat rows: role/permissions plus the
        // child columns (with PHI masked server-side per the caregiver's grant).
        const mapped: ChildWithRole[] = links.map((c: any) => ({
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
          caregiverRole: c.role,
          permissions: c.permissions ?? DEFAULT_PERMISSIONS,
        }))
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
          authLog(`[auth] fallback children loaded: ${ownChildren.length}`)
        } else {
          authLog('[auth] no children found via fallback either — user has zero kids in this DB')
        }
      }
      // (behaviors already handled in the parallel batch above)

      initRevenueCat(uid).catch(() => {})
      runNotificationEngine().catch(() => {})
      // Hydrate command-center-managed content DB-first; best-effort — falls
      // back to bundled data if the fetch fails.
      hydrateDailyQuestions().catch(() => {})
      hydrateBirthTopics().catch(() => {})
      // Remote kill switches from the command center (grandma_chat …); fails closed.
      loadRemoteFlags().catch(() => {})
      // B3: register this device's push token + sync on-device local schedules
      // from the user's saved prefs. Best-effort; never blocks launch.
      initNotifications().catch(() => {})
      syncBadgesFromSupabase().catch(() => {})
    }

    /** Drop the session state; the route guard then sends the user to welcome. */
    function markSignedOut(keepPendingRecovery = false) {
      setSession(null)
      // Clear flags so signing back in starts from a fresh load state — except a reset link that is
      // being exchanged right now: on a cold start from the email, INITIAL_SESSION (no session) can
      // land between the link being read and its session arriving; clearing the flag then let that
      // recovery session load the account and the guard route past the new-password screen.
      if (!(keepPendingRecovery && recoveryLinkPending)) {
        setRecoveryMode(false)
        recoveryLinkPending = false
        recovering = false
      }
      inFlightUid = null
      loadedUid = null
      setHasChildren(false)
      clearCaregiver()
      setLoadFailed(false)
      bootDone = true
      setLoading(false)
      setUserLoading(false)
      // Session gone without signOut() (expired/revoked token, global sign-out elsewhere):
      // the home-screen widgets and shortcuts must not keep this account's data.
      void clearWidgets()
    }
    // signOut() calls this itself — when supabase.auth.signOut() fails offline no SIGNED_OUT fires.
    registerLocalSignOutHandler(() => markSignedOut())

    // ─── Email links (password reset) ─────────────────────────────────────
    // detectSessionInUrl is off (React Native), so nothing consumed the reset email's
    // grandma-app://auth/reset#access_token=…&type=recovery link: it opened an unmatched route,
    // the guard bounced to welcome, and the user could never set a new password. Establish the
    // session from the link here. setSession() emits SIGNED_IN (not PASSWORD_RECOVERY), so the
    // listener is told to treat the next SIGNED_IN as the recovery.
    let recoveryLinkPending = false
    function enterRecovery() {
      recoveryLinkPending = false
      recovering = true
      setRecoveryMode(true)
      bootDone = true
      setLoading(false)
      setUserLoading(false)
      router.replace('/(auth)/reset-password')
    }
    async function handleAuthLink(url: string | null) {
      const link = parseAuthRedirect(url)
      if (!link || cancelled) return
      try {
        if (link.kind === 'error') {
          // Pass the code too: otp_expired then reads "link expired", not a generic "try again".
          const text = authErrorText({ code: link.code ?? undefined, message: link.description ?? '' })
          if (link.isRecovery) {
            Alert.alert(translate('auth_couldntUpdatePassword'), text)
            router.replace('/(auth)/forgot-password')
          } else {
            // An expired / already-used sign-up confirmation link: say so (it was silently dropped)
            // and offer sign-in, where an unconfirmed address gets a resend.
            Alert.alert(translate('auth_linkFailed'), text)
            router.replace('/(auth)/sign-in')
          }
          return
        }
        if (link.isRecovery) {
          // Hold the guard before the session lands so it can't route the recovery session to (tabs).
          recoveryLinkPending = true
          recovering = true
          setRecoveryMode(true)
        }
        const { error } =
          link.kind === 'session'
            ? await supabase.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken })
            : link.kind === 'otp'
              ? await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type as 'recovery' })
              : await supabase.auth.exchangeCodeForSession(link.code)
        if (error) throw error
      } catch (e) {
        recoveryLinkPending = false
        recovering = false
        setRecoveryMode(false)
        console.warn('[auth] email link could not be used:', e)
        Alert.alert(translate(link.isRecovery ? 'auth_couldntUpdatePassword' : 'auth_linkFailed'), authErrorText(e))
        router.replace(link.isRecovery ? '/(auth)/forgot-password' : '/(auth)/sign-in')
      }
    }
    void Linking.getInitialURL().then(handleAuthLink).catch(() => {})
    const linkSub = Linking.addEventListener('url', ({ url }) => { void handleAuthLink(url) })

    registerUserDataReloader(async () => {
      const { data: { session: current } } = await supabase.auth.getSession()
      if (!current || cancelled) return
      // Pause the guard while it runs: loadUserData clears loadFailed before the own-children
      // fallback query returns, and the guard would route a kids-only account to onboarding.
      setUserLoading(true)
      try {
        await loadUserData(current.user.id)
        loadedUid = current.user.id
      } finally {
        if (!cancelled) setUserLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        authLog(`[auth] event=${event} hasSession=${!!newSession} uid=${newSession?.user?.id?.slice(0, 8) ?? 'null'}`)
        setSession(newSession)
        if (event === 'INITIAL_SESSION') sawInitialSession = true

        // Password recovery deep-link: Supabase establishes a temporary session
        // and fires PASSWORD_RECOVERY. Route to the reset screen and stop —
        // do NOT run loadUserData / let the route guard send the user to (tabs),
        // or they'd never get the chance to set a new password.
        if (event === 'PASSWORD_RECOVERY' || (recoveryLinkPending && event === 'SIGNED_IN' && newSession)) {
          enterRecovery()
          return
        }

        if (event === 'SIGNED_OUT' || !newSession) {
          authLog('[auth] no session — unblock loading, route guard will send to /(auth)/welcome')
          markSignedOut(event !== 'SIGNED_OUT')
          return
        }

        // Which events (re)load the account — see lib/authEvents. Notably: the premature SIGNED_IN
        // on cold boot is skipped (INITIAL_SESSION follows and is the one whose queries work),
        // USER_UPDATED for the loaded account is not a reload, and nothing loads mid-recovery.
        const uid = newSession.user.id
        if (!authEventLoads(event, { uid, loadedUid, inFlightUid, sawInitialSession, recovering })) {
          authLog(`[auth] ${event} for uid=${uid.slice(0, 8)} — no load`)
          return
        }
        inFlightUid = uid
        // Pause the route guard until profile / children / behaviors are in — otherwise it runs with
        // stale empty state and bounces a returning user into onboarding for a frame. At boot this
        // is the splash; after boot only the guard waits (the screen stays mounted).
        if (bootDone) setUserLoading(true)
        else setLoading(true)
        try {
          await loadUserData(uid)
          loadedUid = uid
        } catch (e) {
          console.warn('[auth] loadUserData failed:', e)
        } finally {
          inFlightUid = null
        }
        if (!cancelled) {
          bootDone = true
          setLoading(false)
          setUserLoading(false)
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
      if (cancelled) return
      bootDone = true
      setLoading(false)
    }, 10000)

    return () => {
      cancelled = true
      registerUserDataReloader(null)
      registerLocalSignOutHandler(null)
      linkSub.remove()
      clearTimeout(safety)
      subscription.unsubscribe()
    }
  }, [setChildren])

  // ─── Route guard ──────────────────────────────────────────────────────────
  // Onboarding is complete when user has enrolled behaviors (works for all
  // journey types: kids, pregnancy, pre-pregnancy) OR has children in DB.
  const hasCompletedOnboarding = enrolledBehaviors.length > 0 || hasChildren

  // ─── App-lock foreground gate (WS2d) ──────────────────────────────────────
  // Re-lock when the app comes back to the foreground after it was really in the background
  // (not after a mere 'inactive': permission alerts, purchase sheet, Control Center).
  // Skip transitions caused by our own biometric prompt (the Face ID sheet
  // backgrounds the app, which would otherwise re-lock right after unlock).
  useEffect(() => {
    if (!lockEnabled) return
    let backgrounded = AppState.currentState === 'background'
    const sub = AppState.addEventListener('change', (next) => {
      const r = appLockTransition(backgrounded, next)
      backgrounded = r.backgrounded
      if (r.lock && !isBiometricInFlight()) useAppLockStore.getState().lock()
    })
    return () => sub.remove()
  }, [lockEnabled])

  // Lockout self-heal: if lock is enabled in the persisted config but no PIN
  // actually exists in the keychain (e.g. reinstall / restore wiped it), clear
  // the flag so the user isn't trapped behind a PIN pad that can never succeed.
  useEffect(() => {
    if (!lockHydrated || !lockEnabled) return
    hasPin().then((exists) => {
      if (!exists) {
        useAppLockStore.getState().setEnabled(false)
        useAppLockStore.getState().unlock()
      }
    })
  }, [lockHydrated, lockEnabled])

  // True from the moment a stashed invite token is routed to /accept-invite until we're there.
  const inviteRedirecting = useRef(false)

  // One "couldn't load your account" prompt per failed load after a sign-in (see the guard).
  const loadFailedPrompted = useRef(false)
  useEffect(() => {
    if (!loadFailed) loadFailedPrompted.current = false
  }, [loadFailed])

  useEffect(() => {
    if (loading || userLoading || !behaviorHydrated) return

    // Dev-panel preview mode: the user is intentionally viewing an auth or
    // onboarding screen while already signed in. Don't redirect them out.
    if (devActive) return

    // During password recovery the user holds a valid (temporary) session but
    // must stay on the reset screen — skip the guard so it can't redirect them.
    if (recoveryMode) return

    // A caregiver opened an invite link while signed out; we stashed the token
    // through the auth flow. Now that they're authenticated, resume the accept
    // flow instead of dropping them on home/onboarding.
    if (session) {
      if (segments[0] === 'accept-invite') inviteRedirecting.current = false
      const inviteToken = consumePendingInvite()
      if (inviteToken) {
        inviteRedirecting.current = true
        router.replace(`/accept-invite?token=${encodeURIComponent(inviteToken)}` as Parameters<typeof router.replace>[0])
        return
      }
      // The guard re-runs before that navigation lands (segments still say (auth)); without this it
      // fell through to "signed in → /(tabs)" and the caregiver never saw the invite.
      if (inviteRedirecting.current) return
    }

    const inAuth = segments[0] === '(auth)'
    // /auth/callback, /auth/confirm, /auth/reset: blank landing routes for auth links. A signed-in
    // user must be moved on from them like from any auth screen, or they stay on a blank page.
    const onAuthLanding = segments[0] === 'auth'

    // accept-invite redirects signed-out users itself, keeping ?invite=<token>; sending them to a
    // bare /welcome first (this guard fires before its async session check) lost the invite.
    if (!session && !inAuth && segments[0] !== 'accept-invite') {
      router.replace('/(auth)/welcome')
    } else if (session && !hasCompletedOnboarding && segments[0] !== 'onboarding' && segments[0] !== 'accept-invite') {
      // (accept-invite is exempt: a new caregiver lands there straight from sign-up with no journey
      // yet; redirecting would drop the already-consumed invite token.)
      // When every data query timed out we don't know whether the user
      // genuinely has no data or whether the DB is unreachable. Stay on
      // the current screen rather than routing into onboarding — pushing
      // a returning user into onboarding here would either re-seed
      // duplicates or wipe their behavior store on continue.
      if (!loadFailed) {
        // Phase 1: consent gate BEFORE any data collection. Route to the
        // consent step until the user has explicitly agreed; consent.tsx then
        // continues to journey.
        router.replace(hasConsented ? '/onboarding/journey' : '/onboarding/consent')
      } else if ((inAuth || onAuthLanding) && !loadFailedPrompted.current) {
        // Signed in on a slow / dropping connection: the sign-in worked but the account didn't
        // load, so nothing happened — the user sat on the sign-in screen with no feedback.
        loadFailedPrompted.current = true
        Alert.alert(translate('auth_loadFailedTitle'), translate('common_checkConnection'), [
          { text: translate('common_retry'), onPress: () => { void reloadUserData().catch(() => {}) } },
        ])
      }
    } else if (session && hasCompletedOnboarding && (inAuth || onAuthLanding)) {
      router.replace('/(tabs)')
    }
  }, [loading, userLoading, session, hasCompletedOnboarding, behaviorHydrated, segments, loadFailed, recoveryMode, devActive, hasConsented])

  // ─── Loading state ────────────────────────────────────────────────────────
  // While the app isn't ready we render nothing and let the NATIVE splash keep
  // covering the screen (held open by preventAutoHideAsync above). This removes
  // the old native-splash → blank → BrandedLoader flash on cold boot: the
  // native splash now hands off directly to the first real screen. BrandedLoader
  // is still used elsewhere (in-app loaders, per-screen gates).
  const appReady =
    !loading && behaviorHydrated && modeHydrated && consentHydrated && lockHydrated && fontsLoaded

  // Hide the native splash once the first real frame has laid out. onLayout
  // guarantees the tree below has painted, so the splash cross-fades straight
  // into content with no intermediate blank frame.
  const [splashDone, setSplashDone] = useState(false)
  const onSplashDone = useCallback(() => setSplashDone(true), [])

  const onRootLayout = useCallback(() => {
    if (appReady) SplashScreen.hideAsync().catch(() => {})
  }, [appReady])

  // Safety net: also hide on the appReady transition in case onLayout never
  // fires (hideAsync is idempotent — a no-op once the splash is already hidden),
  // so a stuck splash can never brick the launch.
  useEffect(() => {
    if (appReady) SplashScreen.hideAsync().catch(() => {})
  }, [appReady])

  if (!appReady) {
    return null
  }

  return (
    <View style={styles.flex} onLayout={onRootLayout}>
    {/* Cold-start brand moment on top of the (already rendering) app; unmounts itself. */}
    {!splashDone && <AnimatedSplash onDone={onSplashDone} />}
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <DevPanelProvider>
        <SavedToastProvider>
        <NavThemeProvider value={navTheme}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: canvasBg } }}>
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
          <Stack.Screen name="birth-plan" />
          <Stack.Screen name="insights" />
          <Stack.Screen name="grandma-talk" options={{ presentation: 'modal' }} />
          <Stack.Screen name="profile" />
          <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
          <Stack.Screen name="lock" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          <Stack.Screen name="child-report" options={{ presentation: 'modal' }} />
          <Stack.Screen name="report" options={{ presentation: 'modal' }} />
        </Stack>
        </NavThemeProvider>
        {/* App-lock overlay (WS2d) — covers everything while locked. Rendered
            outside the router so it can't be swiped away; verify mode by default. */}
        {lockEnabled && isLocked && (
          <View style={StyleSheet.absoluteFill}>
            <LockScreen />
          </View>
        )}
        <ConnectionBanner />
        <DevModeBanner />
        </SavedToastProvider>
        </DevPanelProvider>
      </QueryClientProvider>
    </ThemeProvider>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})
