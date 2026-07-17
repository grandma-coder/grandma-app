/**
 * B4 — Kids Onboarding Flow
 *
 * Dynamic stepper: child count → per-child loop → partner → caregiver → done.
 * Uses OnboardingStep wrapper for consistent UI.
 * Saves children to Supabase children table + care_circle entries.
 */

import { useState, useCallback, useRef, type ReactNode } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
} from 'react-native'
import DatePickerField from '../../../components/ui/DatePickerField'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { router } from 'expo-router'
import { Camera, User, Plus, Minus, Check } from 'lucide-react-native'
import { Star, Heart, Moon, Sun, Flower, Cloud, Leaf } from '../../../components/ui/Stickers'
import { PillButton } from '../../../components/ui/PillButton'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { OnboardingStep, OnboardingNavProvider } from '../../../components/onboarding/OnboardingStep'
import { useTheme, useDiffuseTheme, brand, stickers, getModeColor, getModeColorSoft, diffuseFields } from '../../../constants/theme'
import { useIsDiffuse } from '../../../components/ui/diffuse/DiffuseKit'
import { DiffuseDotCalendar } from '../../../components/ui/diffuse/DiffusePrimitives'
import { DiffuseField } from '../../../components/ui/diffuse/DiffuseField'
import { ArcDial } from '../../../components/ui/diffuse/pickers/ArcDial'
import { BloomChips } from '../../../components/ui/diffuse/pickers/BloomChips'
import { AvatarBloomGrid } from '../../../components/ui/diffuse/pickers/AvatarBloomGrid'
import { ChoiceTimeline } from '../../../components/ui/diffuse/pickers/ChoiceTimeline'
import { useTranslation } from '../../../lib/i18n'
import { searchCountries, countryByCode } from '../../../lib/countries'
import { AvatarView, AvatarPickerModal, isIconAvatar, buildIconAvatarValue } from '../../../components/ui/AvatarPicker'
import { PHOTO_BUCKETS } from '../../../lib/photoSigning'
import {
  useKidsOnboardingStore,
  type CaregiverRole,
} from '../../../store/useKidsOnboardingStore'
import { useChildStore } from '../../../store/useChildStore'
import { useJourneyStore } from '../../../store/useJourneyStore'
import { useConsentStore } from '../../../store/useConsentStore'
import { useBehaviorStore } from '../../../store/useBehaviorStore'
import { provisionChildSpace } from '../../../lib/skeletonSync'
import { isDevModeActive } from '../../../store/useDevStore'
import { useOnboardingComplete } from '../../../hooks/useOnboardingComplete'
import { supabase } from '../../../lib/supabase'
import type { ChildWithRole } from '../../../types'

// ─── Step types ────────────────────────────────────────────────────────────

type StepId =
  | 'child_count'
  | 'child_name'
  | 'child_dob'
  | 'child_country'
  | 'child_photo'
  | 'child_allergies'
  | 'child_conditions'
  | 'partner'
  | 'caregiver'
  | 'complete'

function buildSteps(childCount: number): StepId[] {
  const steps: StepId[] = ['child_count']
  for (let i = 0; i < childCount; i++) {
    steps.push('child_name', 'child_dob', 'child_country', 'child_photo', 'child_allergies', 'child_conditions')
  }
  steps.push('partner', 'caregiver', 'complete')
  return steps
}

/** Given a flat step index, figure out which child index we're on (0-based) */
function childIndexForStep(stepIndex: number, childCount: number): number {
  // Steps per child = 6 (name, dob, country, photo, allergies, conditions), first step is child_count
  if (stepIndex <= 0) return 0
  return Math.floor((stepIndex - 1) / 6)
}

// ─── Local date ↔ ISO string helpers (Diffuse calendar bridge) ──────────────
// The store keeps `birthDate` as an ISO 'YYYY-MM-DD' string; DiffuseDotCalendar
// is controlled by a Date. Convert with LOCAL date parts (not toISOString) so an
// evening selection west of UTC doesn't slide to the previous day.

function isoToDate(iso: string | null): Date {
  if (!iso) return new Date()
  const [y, m, d] = iso.split('-').map((p) => parseInt(p, 10))
  if (!y || !m || !d) return new Date()
  return new Date(y, m - 1, d)
}

function dateToIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── Diffuse avatar options (KIDS 05 · pick a look) ─────────────────────────
// AvatarBloomGrid keys are the SAME `icon:<key>` sentinels the cream path stores
// in `photoUri` (via AvatarPickerModal → buildIconAvatarValue), so a selected
// bloom avatar round-trips through AvatarView + the save flow (isIconAvatar
// passes it through unchanged). Stickers stay active under Diffuse (per the
// standing icon-system decision); the sticker sits over a kids-palette bloom.
const DIFFUSE_AVATAR_OPTIONS: { iconKey: 'star' | 'heart' | 'flower' | 'sun' | 'moon' | 'cloud' | 'leaf'; color: string; render: (size: number) => ReactNode }[] = [
  { iconKey: 'star', color: diffuseFields.kids.g1, render: (s) => <Star size={s} fill={stickers.blue} /> },
  { iconKey: 'heart', color: diffuseFields.kids.g4, render: (s) => <Heart size={s} fill={stickers.pink} /> },
  { iconKey: 'flower', color: diffuseFields.kids.g3, render: (s) => <Flower size={s} petal={stickers.blue} center={stickers.yellow} /> },
  { iconKey: 'sun', color: diffuseFields.kids.g1, render: (s) => <Sun size={s} fill={stickers.yellow} /> },
  { iconKey: 'moon', color: diffuseFields.kids.g3, render: (s) => <Moon size={s} fill={stickers.lilac} /> },
  { iconKey: 'cloud', color: diffuseFields.kids.g2, render: (s) => <Cloud size={s} fill={stickers.blue} /> },
  { iconKey: 'leaf', color: diffuseFields.kids.g2, render: (s) => <Leaf size={s} fill={stickers.green} /> },
]

// ─── Common allergy options ────────────────────────────────────────────────

const ALLERGY_OPTIONS = [
  'Milk', 'Eggs', 'Peanuts', 'Tree nuts', 'Soy',
  'Wheat', 'Fish', 'Shellfish', 'Sesame', 'Other',
]

const CAREGIVER_ROLES: { id: CaregiverRole; label: string }[] = [
  { id: 'partner', label: 'Partner' },
  { id: 'nanny', label: 'Nanny' },
  { id: 'family', label: 'Family member' },
  { id: 'doctor', label: 'Doctor' },
]

// ─── Main Component ────────────────────────────────────────────────────────

export default function KidsOnboarding() {
  const store = useKidsOnboardingStore()
  const setChildrenStore = useChildStore((s) => s.setChildren)
  const { handleComplete: onboardingComplete } = useOnboardingComplete()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  // Re-entrancy guard: a fast double-tap on "Let's Go" could fire saveAndFinish
  // twice before the `saving` state re-renders, inserting children twice (P2-78).
  const savingRef = useRef(false)

  const steps = buildSteps(store.childCount)
  const currentStep = steps[currentIndex]
  const childIdx = childIndexForStep(currentIndex, store.childCount)

  // Total visible steps = child_count(1) + perChild(6)*N + partner(1) + caregiver(1)
  const totalSteps = 1 + store.childCount * 6 + 2

  const goNext = useCallback(() => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex((i) => i + 1)
    }
  }, [currentIndex, steps.length])

  const goSkip = useCallback(() => goNext(), [goNext])

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
    }
  }, [currentIndex])

  const handleClose = useCallback(() => {
    store.clearAll()
    router.back()
  }, [])

  // ─── Save to Supabase ──────────────────────────────────────────────────

  async function saveAndFinish(): Promise<void> {
    // Guard against double-submit (P2-78). The ref blocks synchronous re-entry
    // before `saving` state propagates; setSaving drives the button's disabled
    // state for user feedback.
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)

    // Dev mode: dry run — no DB writes, no photo uploads, no persisted-store
    // mutations. The dev-store snapshot rolls back everything on exit.
    if (isDevModeActive()) {
      store.clearAll()
      return onboardingComplete('kids')
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // No session (offline / signed-out edge): enroll locally so the mode
        // system has a behavior to switch to, then proceed.
        useBehaviorStore.getState().enroll('kids')
        store.clearAll()
        return onboardingComplete('kids')
      }

      const userId = session.user.id
      const parentName = useJourneyStore.getState().parentName ?? null
      const parentDob = useJourneyStore.getState().parentDob ?? null

      // Profile: persist journey mode + parent name/dob so cold restarts don't
      // reset the user to the default mode.
      const profilePayload: Record<string, unknown> = {
        id: userId,
        journey_mode: 'kids',
      }
      if (parentName) profilePayload.name = parentName
      if (parentDob) profilePayload.dob = parentDob
      const consentedAt = useConsentStore.getState().consentedAt
      if (consentedAt) profilePayload.consented_at = consentedAt
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })
      if (profileErr) console.warn('[onboarding] profile upsert failed:', profileErr.message)

      // Behavior row. NOTE: the local `enroll('kids')` is deferred until after
      // all required writes succeed (see end of try) so an aborted run can't
      // leave the app enrolled in a mode whose server data never landed.
      const { error: behaviorErr } = await supabase.from('behaviors').upsert(
        {
          user_id: userId,
          type: 'kids',
          active: true,
        },
        { onConflict: 'user_id,type' }
      )
      if (behaviorErr) console.warn('[onboarding] behaviors upsert failed:', behaviorErr.message)

      // Insert children
      // Upload any local-file photo URIs to Storage so they survive a cold
      // relaunch. Icon-avatar values (key strings) pass through unchanged.
      // Child photos live in the PRIVATE `child-photos` bucket keyed by
      // {childId}/... so storage RLS (and caregivers) can read them by child.
      // The child row doesn't exist yet at this point, so we insert first
      // (photo_url null for to-be-uploaded files) then upload + UPDATE per the
      // returned id. Icon sentinels + already-remote values are stored as-is.
      function photoToStoreAtInsert(photoUri: string | null | undefined): string | null {
        if (!photoUri) return null
        if (isIconAvatar(photoUri)) return photoUri
        // A local file gets uploaded post-insert; store null for now.
        if (photoUri.startsWith('file:') || photoUri.startsWith('content:')) return null
        // Anything else (a pre-existing remote URL) passes through unchanged.
        return photoUri
      }

      // Upload a local child photo to child-photos/{childId}/... and return the
      // storage PATH (signed at read time), or null on failure.
      async function uploadChildPhoto(childId: string, photoUri: string): Promise<string | null> {
        try {
          // Compress before upload (the <1MB rule). Matches lib/vault.ts.
          const compressed = await ImageManipulator.manipulateAsync(
            photoUri,
            [{ resize: { width: 1600 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
          )
          const path = `${childId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
          const res = await fetch(compressed.uri)
          const buf = await res.arrayBuffer()
          const { error: upErr } = await supabase.storage
            .from('child-photos')
            .upload(path, buf, { contentType: 'image/jpeg', upsert: true })
          if (upErr) {
            console.warn('[onboarding] child photo upload failed:', upErr.message)
            return null
          }
          return path
        } catch (e) {
          console.warn('[onboarding] child photo upload exception:', e)
          return null
        }
      }

      const resolvedPhotos = store.children.map((c) => photoToStoreAtInsert(c.photoUri))

      // If "Other" is selected and free-text was provided, append it to the
      // allergies array so the canonical column captures the detail.
      function buildAllergies(c: typeof store.children[number]): string[] {
        if (c.allergies.includes('Other') && c.allergiesOther?.trim()) {
          return [...c.allergies.filter((a) => a !== 'Other'), c.allergiesOther.trim()]
        }
        return c.allergies
      }

      const childrenToInsert = store.children.map((c, i) => ({
        parent_id: userId,
        name: c.name,
        birth_date: c.birthDate || null,
        allergies: buildAllergies(c),
        conditions: c.conditionsText ? [c.conditionsText] : [],
        country_code: c.countryCode || 'US',
        photo_url: resolvedPhotos[i],
      }))

      const { data: insertedChildren, error: insertError } = await supabase
        .from('children')
        .insert(childrenToInsert)
        .select('id, name, birth_date, parent_id, allergies, conditions, country_code, photo_url, sex, blood_type, medications, dietary_restrictions, preferred_foods, disliked_foods, pediatrician, notes')

      if (insertError) {
        Alert.alert(
          'Could not save your kids',
          insertError.message || 'Please check your connection and try again.',
        )
        // eslint-disable-next-line no-console
        console.error('children insert failed:', insertError.message)
        return
      }

      // Even on a successful insert, the .select() can come back empty
      // when the children RLS read policy requires a child_caregivers
      // join (chicken-and-egg: we haven't inserted those rows yet).
      // Refetch by parent_id as a backup if the initial select is empty.
      let resolvedChildren = insertedChildren as any[] | null
      if (!resolvedChildren || resolvedChildren.length === 0) {
        const { data: refetched } = await supabase
          .from('children')
          .select('id, name, birth_date, parent_id, allergies, conditions, country_code, photo_url, sex, blood_type, medications, dietary_restrictions, preferred_foods, disliked_foods, pediatrician, notes')
          .eq('parent_id', userId)
        resolvedChildren = refetched ?? []
      }

      // Upload any local child photos now that we have child ids, then write the
      // storage PATH back to photo_url. Keyed by {childId}/ for the child-photos
      // RLS. Match each inserted child to its source store child by name (order
      // is reliable on the direct insert but the refetch fallback isn't).
      if (resolvedChildren && resolvedChildren.length > 0) {
        await Promise.all(
          resolvedChildren.map(async (rc: any) => {
            const src = store.children.find((c) => c.name === rc.name && !!c.photoUri)
            const uri = src?.photoUri
            if (!uri || isIconAvatar(uri) || !(uri.startsWith('file:') || uri.startsWith('content:'))) return
            const path = await uploadChildPhoto(rc.id, uri)
            if (path) {
              rc.photo_url = path
              await supabase.from('children').update({ photo_url: path }).eq('id', rc.id)
            }
          })
        )
      }

      if (resolvedChildren && resolvedChildren.length > 0) {
        const childIds = resolvedChildren.map((c: any) => c.id)
        const userEmail = session.user.email ?? ''

        // Create child_caregivers entries so root layout can load children
        const caregiverLinks = resolvedChildren.map((c: any) => ({
          child_id: c.id,
          user_id: userId,
          email: userEmail,
          role: 'parent' as const,
          status: 'accepted' as const,
          permissions: { view: true, log_activity: true, chat: true, edit_child: true, emergency: true },
          invited_by: userId,
          accepted_at: new Date().toISOString(),
        }))
        // Insert into child_caregivers so root layout can load children on next open.
        // This link is REQUIRED for the user to see their own kids after relaunch —
        // children RLS reads via the caregiver join. If the insert fails we surface
        // it instead of moving on silently with broken state, but we attempt one
        // immediate retry first (transient network failure is the common case).
        let ccError: { message: string } | null = null
        for (let attempt = 0; attempt < 2; attempt++) {
          const { error } = await supabase.from('child_caregivers').insert(caregiverLinks)
          if (!error) { ccError = null; break }
          ccError = error
        }
        if (ccError) {
          // Without caregiver links, RLS blocks the user from reading their own
          // children — completing here would strand them with invisible kids.
          // Throw to the catch below, which preserves the draft and lets them
          // retry rather than navigating home into a broken state.
          // eslint-disable-next-line no-console
          console.error('child_caregivers insert failed after retry:', ccError.message)
          throw new Error('We couldn\'t finish setting up access to your child profile.')
        }

        // Skeleton appspace integration (best-effort — never blocks onboarding).
        // Provision a Skeleton space per child so the care circle + agents can
        // share context. Fire-and-forget: failures are logged in skeletonSync
        // and ignored; Grandma works on Supabase regardless.
        void Promise.all(resolvedChildren.map((c: any) => provisionChildSpace(c.id)))

        // Create care_circle entry for the parent (self)
        const { error: circleError } = await supabase.from('care_circle').insert({
          owner_id: userId,
          member_user_id: userId,
          role: 'parent',
          permissions: ['view', 'log_activity', 'chat', 'edit_child', 'emergency'],
          children_access: childIds,
          status: 'accepted',
        })
        if (circleError) {
          // care_circle is less critical (caregiver invites use a different
          // path) but still worth surfacing if it fails.
          // eslint-disable-next-line no-console
          console.warn('care_circle insert:', circleError.message)
        }

        // Partner entry — pending invite slot, name only (no email yet).
        if (store.partnerName) {
          await supabase.from('care_circle').insert({
            owner_id: userId,
            role: 'partner',
            permissions: ['view', 'log_activity', 'chat', 'edit_child', 'emergency'],
            children_access: childIds,
            status: 'pending',
            invite_email: null,
            invite_name: store.partnerName,
          })
        }

        // Caregiver entry if provided.
        if (store.caregiverName && store.caregiverRole) {
          await supabase.from('care_circle').insert({
            owner_id: userId,
            role: store.caregiverRole,
            permissions: ['view', 'log_activity'],
            children_access: childIds,
            status: 'pending',
            invite_email: null,
            invite_name: store.caregiverName,
          })
        }

        // Set children in the app store for immediate use.
        // parent_id is the canonical column on the children table; the
        // ?? c.user_id fallback referenced a non-existent column and
        // would have resolved to undefined for rows without parent_id.
        // Falling back to userId (the current auth user) instead.
        const mapped: ChildWithRole[] = resolvedChildren.map((c: any) => ({
          id: c.id,
          parentId: c.parent_id ?? userId,
          name: c.name,
          birthDate: c.birth_date ?? c.dob ?? '',
          weightKg: 0,
          heightCm: 0,
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
          permissions: { view: true, log_activity: true, chat: true },
        }))
        setChildrenStore(mapped)
      }
      // Reached only when all required writes succeeded. Enroll locally now
      // (was previously done before the children insert — P2-74) so the mode
      // system never flips to 'kids' for a run that failed to persist.
      useBehaviorStore.getState().enroll('kids')
      store.clearAll()
      onboardingComplete('kids')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.warn('Failed to save kids onboarding:', msg)
      Alert.alert(
        "Couldn't finish setup",
        `${msg}\n\nPlease check your connection and try again. Your answers are still here.`
      )
      // Do NOT clear the draft or navigate — let the user retry. Release the
      // submit guard so the retry tap is accepted.
      savingRef.current = false
      setSaving(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  if (currentStep === 'complete') {
    return <CompletionScreen children={store.children} onFinish={saveAndFinish} saving={saving} />
  }

  const stepNum = currentIndex + 1

  return (
    <OnboardingNavProvider onBack={currentIndex > 0 ? goBack : undefined} onClose={handleClose}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {currentStep === 'child_count' && (
        <StepChildCount step={stepNum} total={totalSteps} onContinue={goNext} />
      )}
      {currentStep === 'child_name' && (
        <StepChildName
          step={stepNum}
          total={totalSteps}
          childIdx={childIdx}
          childCount={store.childCount}
          onContinue={goNext}
        />
      )}
      {currentStep === 'child_dob' && (
        <StepChildDob
          step={stepNum}
          total={totalSteps}
          childIdx={childIdx}
          onContinue={goNext}
        />
      )}
      {currentStep === 'child_country' && (
        <StepChildCountry
          step={stepNum}
          total={totalSteps}
          childIdx={childIdx}
          onContinue={goNext}
        />
      )}
      {currentStep === 'child_photo' && (
        <StepChildPhoto
          step={stepNum}
          total={totalSteps}
          childIdx={childIdx}
          onContinue={goNext}
          onSkip={goSkip}
        />
      )}
      {currentStep === 'child_allergies' && (
        <StepChildAllergies
          step={stepNum}
          total={totalSteps}
          childIdx={childIdx}
          onContinue={goNext}
          onSkip={goSkip}
        />
      )}
      {currentStep === 'child_conditions' && (
        <StepChildConditions
          step={stepNum}
          total={totalSteps}
          childIdx={childIdx}
          onContinue={goNext}
          onSkip={goSkip}
        />
      )}
      {currentStep === 'partner' && (
        <StepPartner step={stepNum} total={totalSteps} onContinue={goNext} onSkip={goSkip} />
      )}
      {currentStep === 'caregiver' && (
        <StepCaregiver step={stepNum} total={totalSteps} onContinue={goNext} onSkip={goSkip} />
      )}
    </KeyboardAvoidingView>
    </OnboardingNavProvider>
  )
}

// ─── STEP: Child Count ─────────────────────────────────────────────────────

function StepChildCount({
  step,
  total,
  onContinue,
}: {
  step: number
  total: number
  onContinue: () => void
}) {
  const { colors, radius, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const mode = getModeColor('kids', isDark)
  const modeSoft = getModeColorSoft('kids', isDark)
  const count = useKidsOnboardingStore((s) => s.childCount)
  const setCount = useKidsOnboardingStore((s) => s.setChildCount)

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="kids"
      question="How many children are you tracking?"
      sticker={<Star size={56} fill={stickers.blue} />}
      onContinue={onContinue}
    >
      {diffuse ? (
        // The store hard-clamps childCount to 1..6 (setChildCount), so the dial
        // is bounded at 6 to stay in sync with the live store — a higher max
        // would let the dial show a value the store immediately clamps back.
        <ArcDial min={1} max={6} value={count} onChange={setCount} unit="kids" />
      ) : (
      <View style={stepStyles.counterRow}>
        <Pressable
          onPress={() => setCount(count - 1)}
          disabled={count <= 1}
          style={[
            stepStyles.counterButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
              opacity: count <= 1 ? 0.3 : 1,
            },
          ]}
        >
          <Minus size={24} color={colors.text} strokeWidth={2.5} />
        </Pressable>

        <View style={[stepStyles.counterDisplay, { backgroundColor: modeSoft, borderRadius: radius.xl }]}>
          <Text style={[stepStyles.counterNumber, { color: mode, fontFamily: font.displayBold }]}>{count}</Text>
        </View>

        <Pressable
          onPress={() => setCount(count + 1)}
          disabled={count >= 6}
          style={[
            stepStyles.counterButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
              opacity: count >= 6 ? 0.3 : 1,
            },
          ]}
        >
          <Plus size={24} color={colors.text} strokeWidth={2.5} />
        </Pressable>
      </View>
      )}
    </OnboardingStep>
  )
}

// ─── STEP: Child Name ──────────────────────────────────────────────────────

function StepChildName({
  step,
  total,
  childIdx,
  childCount,
  onContinue,
}: {
  step: number
  total: number
  childIdx: number
  childCount: number
  onContinue: () => void
}) {
  const { colors, radius, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const mode = getModeColor('kids', isDark)
  const modeSoft = getModeColorSoft('kids', isDark)
  const child = useKidsOnboardingStore((s) => s.children[childIdx])
  const updateChild = useKidsOnboardingStore((s) => s.updateChild)

  const label = childCount > 1 ? `Child ${childIdx + 1} — ` : ''

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="kids"
      question={`${label}What is their name?`}
      sticker={<Heart size={52} fill={stickers.pink} />}
      onContinue={onContinue}
      continueDisabled={!child?.name.trim()}
    >
      {diffuse ? (
        <DiffuseField
          value={child?.name ?? ''}
          onChangeText={(name) => updateChild(childIdx, { name })}
          placeholder="First name"
          autoCapitalize="words"
        />
      ) : (
      <TextInput
        value={child?.name ?? ''}
        onChangeText={(name) => updateChild(childIdx, { name })}
        placeholder="First name"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="words"
        autoFocus
        style={[
          stepStyles.textInput,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.text,
            borderRadius: radius.md,
            fontFamily: font.bodyMedium,
          },
        ]}
      />
      )}
    </OnboardingStep>
  )
}

// ─── STEP: Child DOB ───────────────────────────────────────────────────────

function StepChildDob({
  step,
  total,
  childIdx,
  onContinue,
}: {
  step: number
  total: number
  childIdx: number
  onContinue: () => void
}) {
  const { colors, radius, font, isDark } = useTheme()
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const mode = getModeColor('kids', isDark)
  const modeSoft = getModeColorSoft('kids', isDark)
  const child = useKidsOnboardingStore((s) => s.children[childIdx])
  const updateChild = useKidsOnboardingStore((s) => s.updateChild)
  const childName = child?.name || `Child ${childIdx + 1}`

  // App targets ages 0–5; warn if older. Bound the picker minimum at 18y
  // to avoid the previous arbitrary 2005 cutoff that silently rejected
  // valid pre-2005 dates with no explanation.
  const minDate = new Date()
  minDate.setFullYear(minDate.getFullYear() - 18)
  const ageYears = child?.birthDate
    ? (Date.now() - new Date(child.birthDate + 'T00:00:00').getTime()) / (365.25 * 86_400_000)
    : null
  const tooOld = ageYears !== null && ageYears > 6

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="kids"
      question={`When was ${childName} born?`}
      sticker={<Sun size={56} fill={stickers.yellow} />}
      onContinue={onContinue}
      continueDisabled={!child?.birthDate}
    >
      {diffuse ? (
        // DiffuseDotCalendar bounds only via minimumDate; the 18y-back floor is
        // preserved. The continueDisabled gate still requires a selection.
        <DiffuseDotCalendar
          value={isoToDate(child?.birthDate ?? null)}
          onChange={(d) => updateChild(childIdx, { birthDate: dateToIso(d) })}
          minimumDate={minDate}
          accent={diffuseFields.kids.accent}
        />
      ) : (
      <View style={stepStyles.centered}>
        <DatePickerField
          inline
          label=""
          value={child?.birthDate || ''}
          onChange={(iso) => updateChild(childIdx, { birthDate: iso })}
          placeholder="Tap to select a date"
          modalTitle={`${childName}'s birth date`}
          maximumDate={new Date()}
          minimumDate={minDate}
        />

        {tooOld && (
          <View style={[stepStyles.ageBadge, { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginTop: 8 }]}>
            <Text style={[stepStyles.ageBadgeText, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>
              {t('kidsOnboard_tunedForAges')}
            </Text>
          </View>
        )}

        {child?.birthDate && (
          <View style={[stepStyles.ageBadge, { backgroundColor: modeSoft, borderRadius: radius.lg }]}>
            <Text style={[stepStyles.ageBadgeText, { color: mode, fontFamily: font.bodySemiBold }]}>
              {formatAge(child.birthDate)}
            </Text>
          </View>
        )}
      </View>
      )}
    </OnboardingStep>
  )
}

function formatAge(birthDate: string): string {
  // Force local-time parsing — `new Date('YYYY-MM-DD')` parses as UTC midnight,
  // which lands on the prior calendar day in negative-UTC-offset timezones and
  // throws the age off by a day/month.
  const born = new Date(birthDate.length === 10 ? birthDate + 'T00:00:00' : birthDate)
  const now = new Date()
  const months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth())
  if (months < 1) return 'Newborn'
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} old`
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (rem === 0) return `${years} year${years === 1 ? '' : 's'} old`
  return `${years}y ${rem}m old`
}

// ─── STEP: Child Country ──────────────────────────────────────────────────

function StepChildCountry({
  step,
  total,
  childIdx,
  onContinue,
}: {
  step: number
  total: number
  childIdx: number
  onContinue: () => void
}) {
  const { colors, radius, font, isDark } = useTheme()
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const mode = getModeColor('kids', isDark)
  const modeSoft = getModeColorSoft('kids', isDark)
  const child = useKidsOnboardingStore((s) => s.children[childIdx])
  const updateChild = useKidsOnboardingStore((s) => s.updateChild)
  const childName = child?.name || `Child ${childIdx + 1}`
  const selected = child?.countryCode || 'US'

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  // Full world list; empty query shows the curated quick-picks, typing searches
  // every country by name or ISO code. Always surface the selected country even
  // when it isn't in the current results, so the choice stays visible.
  const searchResults = searchCountries(query)
  const filteredOptions = (() => {
    if (searchResults.some((c) => c.code === selected)) return searchResults
    const sel = countryByCode(selected)
    return sel ? [sel, ...searchResults] : searchResults
  })()

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="kids"
      question={`Where does ${childName} live?`}
      sticker={<Cloud size={64} fill={stickers.blue} />}
      onContinue={onContinue}
    >
      {diffuse ? (
        // Search field above a single-select BloomChips of the (filtered)
        // countries. Selecting a chip writes the real country CODE to the SAME
        // updateChild setter the cream path uses.
        <View>
          <DiffuseField
            value={query}
            onChangeText={setQuery}
            placeholder="Search country…"
            autoCapitalize="none"
          />
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 360, marginTop: 18 }}
            nestedScrollEnabled
          >
            <BloomChips
              multi={false}
              options={filteredOptions.map((c) => ({ key: c.code, label: c.name }))}
              value={[selected]}
              onChange={(next) => {
                if (next[0]) updateChild(childIdx, { countryCode: next[0] })
              }}
            />
            {filteredOptions.length === 0 && (
              <Text style={{ color: colors.textMuted, padding: 16, width: '100%' }}>
                {t('kidsOnboard_noCountriesFound')}
              </Text>
            )}
          </ScrollView>
        </View>
      ) : (
      <View>
        {/* Search input — sticker treatment to match design system */}
        <View
          style={[
            stepStyles.countrySearch,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.md,
              shadowColor: colors.text,
            },
          ]}
        >
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search country..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            style={[stepStyles.countrySearchInput, { color: colors.text, fontFamily: font.bodyMedium }]}
          />
        </View>

        {/* Country chip grid — same chip treatment as allergies */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: 360, marginTop: 14 }}
          nestedScrollEnabled
        >
          <View style={stepStyles.chipGrid}>
            {filteredOptions.map((c) => {
              const isSelected = selected === c.code
              return (
                <Pressable
                  key={c.code}
                  onPress={() => updateChild(childIdx, { countryCode: c.code })}
                  style={[
                    stepStyles.allergyChip,
                    {
                      backgroundColor: isSelected ? modeSoft : colors.surface,
                      borderColor: isSelected ? mode : colors.text,
                      shadowColor: colors.text,
                      borderRadius: radius.full,
                    },
                  ]}
                >
                  {isSelected && <Check size={14} color={mode} strokeWidth={3} />}
                  <Text
                    style={[
                      stepStyles.allergyChipText,
                      { color: isSelected ? mode : colors.text, fontFamily: font.bodySemiBold },
                    ]}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              )
            })}
            {filteredOptions.length === 0 && (
              <Text style={{ color: colors.textMuted, padding: 16, width: '100%' }}>
                {t('kidsOnboard_noCountriesFound')}
              </Text>
            )}
          </View>
        </ScrollView>
      </View>
      )}
    </OnboardingStep>
  )
}

// ─── STEP: Child Photo ─────────────────────────────────────────────────────

function StepChildPhoto({
  step,
  total,
  childIdx,
  onContinue,
  onSkip,
}: {
  step: number
  total: number
  childIdx: number
  onContinue: () => void
  onSkip: () => void
}) {
  const { colors, radius, font, isDark } = useTheme()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const mode = getModeColor('kids', isDark)
  const modeSoft = getModeColorSoft('kids', isDark)
  const child = useKidsOnboardingStore((s) => s.children[childIdx])
  const updateChild = useKidsOnboardingStore((s) => s.updateChild)
  const childName = child?.name || `Child ${childIdx + 1}`
  const [pickerOpen, setPickerOpen] = useState(false)
  const childInitial = (childName[0] ?? 'K').toUpperCase()
  const childAccent = mode

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      updateChild(childIdx, { photoUri: result.assets[0].uri })
    }
  }

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="kids"
      question={`Pick a photo or icon for ${childName}`}
      sticker={<Flower size={56} petal={stickers.blue} center={stickers.yellow} />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      {diffuse ? (
        // Soft-bloom avatar grid. Option keys ARE the `icon:<key>` sentinels the
        // cream path stores (buildIconAvatarValue), so a selected avatar writes
        // the same photoUri value + round-trips through AvatarView and the save
        // flow. The camera tile taps through to the existing pickImage handler.
        <View style={stepStyles.photoDiffuse}>
          <View style={stepStyles.photoDiffusePreview}>
            <AvatarView
              value={child?.photoUri ?? null}
              size={132}
              accent={diffuseFields.kids.accent}
              initial={childInitial}
              bucket={PHOTO_BUCKETS.child}
            />
          </View>
          <AvatarBloomGrid
            options={DIFFUSE_AVATAR_OPTIONS.map((opt) => ({
              key: buildIconAvatarValue(opt.iconKey),
              color: opt.color,
              icon: opt.render(30),
            }))}
            value={child?.photoUri && isIconAvatar(child.photoUri) ? child.photoUri : null}
            onChange={(key) => updateChild(childIdx, { photoUri: key })}
            onPickPhoto={pickImage}
            cameraIcon={<Camera size={22} color={dt.colors.ink} strokeWidth={1.6} />}
          />
        </View>
      ) : (
      <View style={stepStyles.centered}>
        <Pressable onPress={() => setPickerOpen(true)}>
          {child?.photoUri ? (
            <AvatarView
              value={child.photoUri}
              size={160}
              accent={childAccent}
              initial={childInitial}
              borderColor={colors.text}
              borderWidth={3}
            />
          ) : (
            <View
              style={[
                stepStyles.photoPlaceholder,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.text,
                  borderRadius: radius.xl,
                  shadowColor: colors.text,
                },
              ]}
            >
              <Camera size={36} color={colors.text} strokeWidth={1.8} />
              <Text style={[stepStyles.photoHint, { color: colors.text, fontFamily: font.bodyMedium }]}>
                {t('kidsOnboard_photoHint')}
              </Text>
            </View>
          )}
        </Pressable>
        <AvatarPickerModal
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onPickPhoto={pickImage}
          onPickIcon={(iconValue) => updateChild(childIdx, { photoUri: iconValue })}
          onRemove={child?.photoUri ? () => updateChild(childIdx, { photoUri: null as any }) : undefined}
        />
      </View>
      )}
    </OnboardingStep>
  )
}

// ─── STEP: Child Allergies ─────────────────────────────────────────────────

function StepChildAllergies({
  step,
  total,
  childIdx,
  onContinue,
  onSkip,
}: {
  step: number
  total: number
  childIdx: number
  onContinue: () => void
  onSkip: () => void
}) {
  const { colors, radius, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const mode = getModeColor('kids', isDark)
  const modeSoft = getModeColorSoft('kids', isDark)
  const child = useKidsOnboardingStore((s) => s.children[childIdx])
  const toggleAllergy = useKidsOnboardingStore((s) => s.toggleAllergy)
  const updateChild = useKidsOnboardingStore((s) => s.updateChild)
  const childName = child?.name || `Child ${childIdx + 1}`
  const otherSelected = child?.allergies.includes('Other') ?? false

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="kids"
      question={`Any allergies for ${childName}?`}
      sticker={<Leaf size={56} fill={stickers.green} />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      {diffuse ? (
        // Multi-select chips over the SAME allergies array. 'Other' stays a chip
        // (so toggleAllergy sets the 'Other' sentinel exactly as cream does and
        // save-time buildAllergies is untouched); a bare DiffuseField below binds
        // allergiesOther. Fold the picker's next array back through toggleAllergy.
        <>
          <BloomChips
            multi
            options={ALLERGY_OPTIONS.map((a) => ({ key: a, label: a }))}
            value={child?.allergies ?? []}
            onChange={(next) => {
              const current = child?.allergies ?? []
              const added = next.filter((k) => !current.includes(k))
              const removed = current.filter((k) => !next.includes(k))
              added.forEach((k) => toggleAllergy(childIdx, k))
              removed.forEach((k) => toggleAllergy(childIdx, k))
            }}
          />
          {otherSelected && (
            <View style={stepStyles.diffuseBlock}>
              <DiffuseField
                value={child?.allergiesOther ?? ''}
                onChangeText={(txt) => updateChild(childIdx, { allergiesOther: txt })}
                placeholder="Tell us what other allergies…"
                autoCapitalize="sentences"
              />
            </View>
          )}
        </>
      ) : (
      <>
      <View style={stepStyles.chipGrid}>
        {ALLERGY_OPTIONS.map((allergy) => {
          const selected = child?.allergies.includes(allergy) ?? false
          return (
            <Pressable
              key={allergy}
              onPress={() => toggleAllergy(childIdx, allergy)}
              style={[
                stepStyles.allergyChip,
                {
                  backgroundColor: selected ? modeSoft : colors.surface,
                  borderColor: selected ? mode : colors.text,
                  shadowColor: colors.text,
                  borderRadius: radius.full,
                },
              ]}
            >
              {selected && <Check size={14} color={mode} strokeWidth={3} />}
              <Text
                style={[
                  stepStyles.allergyChipText,
                  { color: selected ? mode : colors.text, fontFamily: font.bodySemiBold },
                ]}
              >
                {allergy}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Free-text field appears when "Other" is selected */}
      {otherSelected && (
        <View
          style={[
            stepStyles.otherInputWrap,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.md,
              shadowColor: colors.text,
            },
          ]}
        >
          <TextInput
            value={child?.allergiesOther ?? ''}
            onChangeText={(t) => updateChild(childIdx, { allergiesOther: t })}
            placeholder="Tell us what other allergies..."
            placeholderTextColor={colors.textMuted}
            style={[stepStyles.otherInputText, { color: colors.text, fontFamily: font.bodyMedium }]}
            autoCapitalize="sentences"
          />
        </View>
      )}
      </>
      )}
    </OnboardingStep>
  )
}

// ─── STEP: Child Conditions ────────────────────────────────────────────────

function StepChildConditions({
  step,
  total,
  childIdx,
  onContinue,
  onSkip,
}: {
  step: number
  total: number
  childIdx: number
  onContinue: () => void
  onSkip: () => void
}) {
  const { colors, radius, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const mode = getModeColor('kids', isDark)
  const modeSoft = getModeColorSoft('kids', isDark)
  const child = useKidsOnboardingStore((s) => s.children[childIdx])
  const updateChild = useKidsOnboardingStore((s) => s.updateChild)
  const childName = child?.name || `Child ${childIdx + 1}`

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="kids"
      question={`Any conditions or medications for ${childName}?`}
      sticker={<Moon size={52} fill={stickers.lilac} />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      {diffuse ? (
        // The store keeps conditions as one free-text string (conditionsText — no
        // condition chip catalog / i18n keys exist), so the Diffuse path uses the
        // bare underlined field wired to the SAME updateChild setter.
        <DiffuseField
          value={child?.conditionsText ?? ''}
          onChangeText={(text) => updateChild(childIdx, { conditionsText: text })}
          placeholder="e.g. Asthma, daily inhaler…"
          autoCapitalize="sentences"
        />
      ) : (
      <TextInput
        value={child?.conditionsText ?? ''}
        onChangeText={(text) => updateChild(childIdx, { conditionsText: text })}
        placeholder="e.g. Asthma, daily inhaler..."
        placeholderTextColor={colors.textMuted}
        multiline
        style={[
          stepStyles.textArea,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.text,
            borderRadius: radius.md,
            fontFamily: font.bodyMedium,
          },
        ]}
      />
      )}
    </OnboardingStep>
  )
}

// ─── STEP: Partner ─────────────────────────────────────────────────────────

function StepPartner({
  step,
  total,
  onContinue,
  onSkip,
}: {
  step: number
  total: number
  onContinue: () => void
  onSkip: () => void
}) {
  const { colors, radius, font, isDark } = useTheme()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const mode = getModeColor('kids', isDark)
  const modeSoft = getModeColorSoft('kids', isDark)
  const partner = useKidsOnboardingStore((s) => s.partnerName)
  const setPartner = useKidsOnboardingStore((s) => s.setPartnerName)

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="kids"
      question="Want to add your partner?"
      sticker={<Heart size={56} fill={stickers.pink} />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      {diffuse ? (
        // Bare underlined field wired to the SAME setPartner setter. Invite / skip
        // stays with OnboardingStep's CTA + text link.
        <View style={stepStyles.diffusePartnerBlock}>
          <DiffuseField
            value={partner ?? ''}
            onChangeText={setPartner}
            placeholder="Partner's name"
            autoCapitalize="words"
          />
          <Text style={[stepStyles.diffuseHint, { color: dt.colors.ink3, fontFamily: font.body }]}>
            {t('kidsOnboard_partnerHint')}
          </Text>
        </View>
      ) : (
      <>
      <TextInput
        value={partner ?? ''}
        onChangeText={setPartner}
        placeholder="Partner's name"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="words"
        style={[
          stepStyles.textInput,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.text,
            borderRadius: radius.md,
            fontFamily: font.bodyMedium,
          },
        ]}
      />
      <Text style={[stepStyles.hint, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>
        {t('kidsOnboard_partnerHint')}
      </Text>
      </>
      )}
    </OnboardingStep>
  )
}

// ─── STEP: Caregiver ───────────────────────────────────────────────────────

function StepCaregiver({
  step,
  total,
  onContinue,
  onSkip,
}: {
  step: number
  total: number
  onContinue: () => void
  onSkip: () => void
}) {
  const { colors, radius, font, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const mode = getModeColor('kids', isDark)
  const modeSoft = getModeColorSoft('kids', isDark)
  const role = useKidsOnboardingStore((s) => s.caregiverRole)
  const name = useKidsOnboardingStore((s) => s.caregiverName)
  const setRole = useKidsOnboardingStore((s) => s.setCaregiverRole)
  const setName = useKidsOnboardingStore((s) => s.setCaregiverName)

  // Kids-field hues for the timeline node blooms (design accent values).
  const timelineBlooms = [diffuseFields.kids.g1, diffuseFields.kids.g2, diffuseFields.kids.g3, diffuseFields.kids.g4]

  return (
    <OnboardingStep
      step={step}
      total={total}
      auraMode="kids"
      question="Want to add a caregiver?"
      sticker={<Star size={56} fill={stickers.blue} />}
      onContinue={onContinue}
      onSkip={onSkip}
    >
      {diffuse ? (
        // Vertical connector-line role picker → the SAME setCaregiverRole setter;
        // the name DiffuseField appears after a role is chosen, wired to setName.
        <>
          <ChoiceTimeline
            options={CAREGIVER_ROLES.map((opt, i) => ({
              key: opt.id,
              label: opt.label,
              bloomColor: timelineBlooms[i % timelineBlooms.length],
            }))}
            value={role}
            onChange={(k) => setRole(k as CaregiverRole)}
          />
          {role && (
            <View style={stepStyles.diffuseBlock}>
              <DiffuseField
                value={name ?? ''}
                onChangeText={setName}
                placeholder={`${CAREGIVER_ROLES.find((r) => r.id === role)?.label}'s name`}
                autoCapitalize="words"
              />
            </View>
          )}
        </>
      ) : (
      <>
      {/* Role selector */}
      <View style={stepStyles.chipGrid}>
        {CAREGIVER_ROLES.map((opt) => {
          const selected = role === opt.id
          return (
            <Pressable
              key={opt.id}
              onPress={() => setRole(opt.id)}
              style={[
                stepStyles.roleChip,
                {
                  backgroundColor: selected ? modeSoft : colors.surface,
                  borderColor: selected ? mode : colors.text,
                  shadowColor: colors.text,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text
                style={[
                  stepStyles.roleChipText,
                  { color: selected ? mode : colors.text, fontFamily: font.bodySemiBold },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Name input (shown after role selected) */}
      {role && (
        <TextInput
          value={name ?? ''}
          onChangeText={setName}
          placeholder={`${CAREGIVER_ROLES.find((r) => r.id === role)?.label}'s name`}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          style={[
            stepStyles.textInput,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.text,
              borderRadius: radius.md,
              marginTop: 16,
              fontFamily: font.bodyMedium,
            },
          ]}
        />
      )}
      </>
      )}
    </OnboardingStep>
  )
}

// ─── Completion Screen ─────────────────────────────────────────────────────

function CompletionScreen({
  children,
  onFinish,
  saving = false,
}: {
  children: { name: string; birthDate: string | null; photoUri: string | null }[]
  onFinish: () => void
  saving?: boolean
}) {
  const insets = useSafeAreaInsets()
  const { colors, radius, font, isDark } = useTheme()
  const { t } = useTranslation()
  const modeSoft = getModeColorSoft('kids', isDark)

  return (
    <View style={[completeStyles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          completeStyles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            completeStyles.iconCircle,
            {
              backgroundColor: modeSoft,
              borderWidth: 1,
              borderColor: colors.border,
            },
          ]}
        >
          <Star size={56} fill={stickers.blue} />
        </View>

        <Text style={[completeStyles.title, { color: colors.text, fontFamily: font.displayBold }]}>
          {t('kidsOnboard_completionTitle')}
        </Text>

        <Text
          style={[
            completeStyles.message,
            { color: colors.textSecondary, fontFamily: font.body },
          ]}
        >
          {t('kidsOnboard_completionMessage')}
        </Text>

        {/* Child cards */}
        <View style={completeStyles.cards}>
          {children.map((child, i) => (
            <View
              key={i}
              style={[
                completeStyles.childCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                },
              ]}
            >
              {child.photoUri ? (
                <Image
                  source={{ uri: child.photoUri }}
                  style={completeStyles.childPhoto}
                />
              ) : (
                <View
                  style={[
                    completeStyles.childPhotoPlaceholder,
                    { backgroundColor: colors.surfaceRaised },
                  ]}
                >
                  <User size={24} color={colors.textMuted} strokeWidth={1.5} />
                </View>
              )}
              <View style={completeStyles.childInfo}>
                <Text style={[completeStyles.childName, { color: colors.text, fontFamily: font.bodyBold }]}>
                  {child.name}
                </Text>
                {child.birthDate && (
                  <Text style={[completeStyles.childAge, { color: colors.textSecondary, fontFamily: font.bodyMedium }]}>
                    {formatAge(child.birthDate)}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[completeStyles.bottom, { paddingBottom: insets.bottom + 16, backgroundColor: colors.bg }]}>
        <PillButton label="Let's Go" variant="ink" onPress={onFinish} loading={saving} disabled={saving} />
      </View>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const stepStyles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    gap: 16,
  },
  textInput: {
    borderWidth: 2,
    paddingHorizontal: 20,
    height: 56,
    fontSize: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  otherInputWrap: {
    marginTop: 16,
    paddingHorizontal: 20,
    height: 56,
    borderWidth: 2,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  otherInputText: {
    fontSize: 16,
  },
  textArea: {
    borderWidth: 2,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  hint: {
    fontSize: 13,
    marginTop: 12,
    lineHeight: 18,
  },
  dateButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderWidth: 1,
    width: '100%',
  },
  dateButtonText: {
    fontSize: 17,
    textAlign: 'center',
  },
  ageBadge: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  ageBadgeText: {
    fontSize: 14,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  counterButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  counterDisplay: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterNumber: {
    fontSize: 40,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  countryName: {
    fontSize: 15,
  },
  countrySearch: {
    borderWidth: 2,
    paddingHorizontal: 18,
    height: 56,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  countrySearchInput: {
    fontSize: 16,
  },
  countryDropdown: {
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  countryDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  photoPreview: {
    width: 160,
    height: 160,
  },
  photoPlaceholder: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    gap: 8,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  photoHint: {
    fontSize: 13,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  allergyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  allergyChipText: {
    fontSize: 14,
  },
  roleChip: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  roleChipText: {
    fontSize: 15,
  },
  // Diffuse-only spacing helpers (layout-only; no colors/shadows).
  diffuseBlock: {
    marginTop: 28,
  },
  diffusePartnerBlock: {
    gap: 16,
  },
  diffuseHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  photoDiffuse: {
    gap: 28,
  },
  photoDiffusePreview: {
    alignItems: 'center',
  },
})

const completeStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  cards: {
    width: '100%',
    gap: 12,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderWidth: 1,
  },
  childPhoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  childPhotoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childInfo: {
    flex: 1,
    gap: 2,
  },
  childName: {
    fontSize: 17,
  },
  childAge: {
    fontSize: 14,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  button: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    letterSpacing: 0.3,
  },
})
